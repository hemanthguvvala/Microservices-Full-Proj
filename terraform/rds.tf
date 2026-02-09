# ─── RDS (Relational Database Service) ────────────────────────────────────────
# Interview insight: RDS = managed PostgreSQL
# AWS handles: backups, patching, failover, read replicas, encryption
# You handle: schema, queries, indexes, connection pooling
#
# Features used:
#   - Multi-AZ: automatic failover to standby in another AZ
#   - Read Replica: offload read queries (CQRS pattern)
#   - Encryption at rest: AES-256
#   - Performance Insights: SQL-level monitoring

# ── Subnet Group (RDS must be in private subnets) ────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# ── Security Group (only EKS nodes can access RDS) ──────────────────────────
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "PostgreSQL from EKS nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# ── Parameter Group (PostgreSQL tuning) ──────────────────────────────────────
resource "aws_db_parameter_group" "postgresql" {
  name   = "${var.project_name}-${var.environment}-pg15"
  family = "postgres15"

  # Performance tuning for microservices workload
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"    # Query performance tracking
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"    # Log queries slower than 1s
  }

  parameter {
    name  = "max_connections"
    value = "200"     # Enough for connection pool from multiple services
  }

  parameter {
    name  = "work_mem"
    value = "16384"   # 16MB — for complex sorts/joins
  }

  tags = {
    Name = "${var.project_name}-pg-params"
  }
}

# ── Primary RDS Instance ─────────────────────────────────────────────────────
resource "aws_db_instance" "primary" {
  identifier = "${var.project_name}-${var.environment}-primary"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2    # Auto-scaling storage
  storage_type          = "gp3"
  storage_encrypted     = true    # AES-256 encryption at rest

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false    # Private subnets only

  # High Availability
  multi_az = var.environment == "production"    # Automatic failover

  # Backup
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window           = "03:00-04:00"    # UTC
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Performance
  parameter_group_name          = aws_db_parameter_group.postgresql.name
  performance_insights_enabled  = true
  performance_insights_retention_period = 7    # Days

  # Monitoring
  monitoring_interval = 60    # Enhanced Monitoring every 60s
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Protection
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.project_name}-final-snapshot" : null

  tags = {
    Name = "${var.project_name}-primary-db"
  }
}

# ── Read Replica (for CQRS pattern) ──────────────────────────────────────────
# Interview insight: Read replicas offload read-heavy queries
# Spring Boot config: @Transactional(readOnly=true) → routes to replica
resource "aws_db_instance" "read_replica" {
  count = var.environment == "production" ? 1 : 0

  identifier          = "${var.project_name}-${var.environment}-replica"
  replicate_source_db = aws_db_instance.primary.identifier

  instance_class    = var.db_instance_class
  storage_encrypted = true

  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  # Read replicas don't need multi-AZ or backups (handled by primary)
  multi_az            = false
  skip_final_snapshot = true

  tags = {
    Name = "${var.project_name}-read-replica"
  }
}

# ── RDS Enhanced Monitoring IAM Role ─────────────────────────────────────────
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
