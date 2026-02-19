# ─── S3 Buckets ───────────────────────────────────────────────────────────────
# Interview insight: S3 = object storage (files, backups, static assets, logs)
# Key features: versioning, lifecycle policies, encryption, cross-region replication

# ── Application Assets Bucket ────────────────────────────────────────────────
resource "aws_s3_bucket" "app_assets" {
  bucket = "${var.project_name}-${var.environment}-assets-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.project_name}-app-assets"
  }
}

resource "aws_s3_bucket_versioning" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "app_assets" {
  bucket                  = aws_s3_bucket.app_assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy: move old files to cheaper storage
resource "aws_s3_bucket_lifecycle_configuration" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id

  rule {
    id     = "archive-old-files"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"    # Infrequent Access (cheaper)
    }

    transition {
      days          = 365
      storage_class = "GLACIER"        # Archive (very cheap)
    }

    expiration {
      days = 730    # Delete after 2 years
    }
  }
}

# ── Application Logs Bucket ──────────────────────────────────────────────────
resource "aws_s3_bucket" "logs" {
  bucket = "${var.project_name}-${var.environment}-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.project_name}-logs"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "expire-old-logs"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 90    # Delete logs after 90 days
    }
  }
}

# ─── CloudWatch Alarms & Dashboards ──────────────────────────────────────────
# Interview insight: CloudWatch = AWS-native monitoring
# Metrics → Alarms → SNS → PagerDuty/Slack (alert pipeline)

# ── SNS Topic for Alerts ─────────────────────────────────────────────────────
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "platform-team@example.com"
}

# ── RDS CPU Alarm ─────────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.project_name}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300    # 5 minutes
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is above 80% for 15 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.identifier
  }
}

# ── RDS Free Storage Alarm ───────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "rds_free_storage_low" {
  alarm_name          = "${var.project_name}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5000000000    # 5GB in bytes
  alarm_description   = "RDS free storage is below 5GB"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.identifier
  }
}

# ── EKS Node CPU Alarm ──────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "eks_node_cpu_high" {
  alarm_name          = "${var.project_name}-eks-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "node_cpu_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EKS node CPU utilization is above 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = module.eks.cluster_name
  }
}

# ── Redis Cache Hit Rate Alarm ───────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "redis_cache_hit_low" {
  alarm_name          = "${var.project_name}-redis-cache-hit-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CacheHitRate"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80    # Alert if cache hit rate drops below 80%
  alarm_description   = "Redis cache hit rate below 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }
}

# ── Application Log Groups ──────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "employee_service" {
  name              = "/aws/eks/${var.project_name}/employee-service"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "payroll_service" {
  name              = "/aws/eks/${var.project_name}/payroll-service"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/eks/${var.project_name}/api-gateway"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "notification_service" {
  name              = "/aws/eks/${var.project_name}/notification-service"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "eureka_server" {
  name              = "/aws/eks/${var.project_name}/eureka-server"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "config_server" {
  name              = "/aws/eks/${var.project_name}/config-server"
  retention_in_days = 30
}
