# ─── VPC (Virtual Private Cloud) ──────────────────────────────────────────────
# Interview insight: VPC is the foundation of AWS networking
# Everything runs inside a VPC with proper subnet isolation:
#   Public subnets  → ALB, NAT Gateway (internet access)
#   Private subnets → EKS nodes, RDS, ElastiCache (no direct internet)
#
# This follows AWS Well-Architected Framework: multi-AZ, least privilege networking

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.4"

  name = "${var.project_name}-${var.environment}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  # NAT Gateway: allows private subnets to reach internet (for pulling images)
  # Interview insight: Single NAT = cheaper but single point of failure
  # One per AZ = production best practice ($$$)
  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"    # Save cost in non-prod
  one_nat_gateway_per_az = var.environment == "production"

  # DNS support (required for private hosted zones and service discovery)
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags required by EKS for auto-discovering subnets
  public_subnet_tags = {
    "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "shared"
    "kubernetes.io/role/elb" = 1    # Public subnets for ALB
  }

  private_subnet_tags = {
    "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "shared"
    "kubernetes.io/role/internal-elb" = 1    # Private subnets for internal LB
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}

# ── VPC Flow Logs (for security auditing) ─────────────────────────────────────
resource "aws_flow_log" "vpc_flow_log" {
  vpc_id               = module.vpc.vpc_id
  traffic_type         = "ALL"
  log_destination      = aws_cloudwatch_log_group.vpc_flow_logs.arn
  log_destination_type = "cloud-watch-logs"
  iam_role_arn         = aws_iam_role.vpc_flow_log_role.arn

  tags = {
    Name = "${var.project_name}-vpc-flow-logs"
  }
}

resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/${var.project_name}-${var.environment}/flow-logs"
  retention_in_days = 30
}

resource "aws_iam_role" "vpc_flow_log_role" {
  name = "${var.project_name}-vpc-flow-log-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "vpc-flow-logs.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "vpc_flow_log_policy" {
  name = "vpc-flow-log-policy"
  role = aws_iam_role.vpc_flow_log_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}
