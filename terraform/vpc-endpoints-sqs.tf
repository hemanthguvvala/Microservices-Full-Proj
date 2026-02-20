# ═══════════════════════════════════════════════════════════════════════════════
# AWS VPC Endpoints + SQS Queues
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "What are VPC Endpoints and why use them?"
# → VPC Endpoints provide private connectivity to AWS services WITHOUT
#   traversing the internet or NAT Gateway. Two types:
#   - Gateway Endpoints (free): S3, DynamoDB — route table entries
#   - Interface Endpoints (PrivateLink): All other services — ENI in subnet
#   Benefits: Lower latency, no NAT bandwidth costs, security (traffic
#   stays within AWS network), compliance (no internet exposure).
#
# Interview: "SQS FIFO vs Standard Queue?"
# → Standard: At-least-once delivery, best-effort ordering, nearly unlimited
#   throughput (120K in-flight messages).
# → FIFO: Exactly-once processing, strict ordering (per message group),
#   300 msg/sec (or 3000 with batching). Deduplication window of 5 minutes.
#   Use FIFO for employee payroll events where ordering matters.

# ══════════════════════════════════════════════════════════════════════════════
# VPC ENDPOINTS — PrivateLink for AWS Services
# ══════════════════════════════════════════════════════════════════════════════

# ── Security Group for Interface Endpoints ───────────────────────────────────
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "${var.project_name}-${var.environment}-vpce-"
  description = "Security group for VPC interface endpoints"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-vpce-sg"
  }
}

# ── S3 Gateway Endpoint (free — route table based) ──────────────────────────
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = module.vpc.vpc_id
  service_name = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = module.vpc.private_route_table_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-s3-endpoint"
  }
}

# ── ECR API Interface Endpoint ──────────────────────────────────────────────
# Interview: "Why do you need ECR endpoints?"
# → EKS nodes in private subnets pull container images from ECR.
#   Without VPC endpoints, traffic goes through NAT Gateway (expensive).
#   Need both ecr.api (for describe/list APIs) and ecr.dkr (for docker pull).
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name = "${var.project_name}-${var.environment}-ecr-api-endpoint"
  }
}

# ── ECR Docker Interface Endpoint ───────────────────────────────────────────
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name = "${var.project_name}-${var.environment}-ecr-dkr-endpoint"
  }
}

# ── STS Interface Endpoint (for IRSA — IAM Roles for Service Accounts) ──────
resource "aws_vpc_endpoint" "sts" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.sts"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name = "${var.project_name}-${var.environment}-sts-endpoint"
  }
}

# ── Secrets Manager Interface Endpoint ──────────────────────────────────────
resource "aws_vpc_endpoint" "secrets_manager" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name = "${var.project_name}-${var.environment}-secretsmanager-endpoint"
  }
}

# ── SQS Interface Endpoint ─────────────────────────────────────────────────
resource "aws_vpc_endpoint" "sqs" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.sqs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name = "${var.project_name}-${var.environment}-sqs-endpoint"
  }
}

# ── CloudWatch Logs Interface Endpoint ──────────────────────────────────────
resource "aws_vpc_endpoint" "cloudwatch_logs" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name = "${var.project_name}-${var.environment}-logs-endpoint"
  }
}

# ── SNS Interface Endpoint ─────────────────────────────────────────────────
resource "aws_vpc_endpoint" "sns" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.sns"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name = "${var.project_name}-${var.environment}-sns-endpoint"
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# SQS QUEUES
# ══════════════════════════════════════════════════════════════════════════════

# ── Employee Events FIFO Queue ──────────────────────────────────────────────
resource "aws_sqs_queue" "employee_events" {
  name                        = "${var.project_name}-${var.environment}-employee-events.fifo"
  fifo_queue                  = true
  content_based_deduplication = true

  # ── Message Retention ─────────────────────────────────────────────────
  message_retention_seconds   = 604800  # 7 days
  visibility_timeout_seconds  = 300     # 5 minutes (for long processing)
  receive_wait_time_seconds   = 20      # Long polling (reduces API calls)

  # ── Dead Letter Queue ─────────────────────────────────────────────────
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.employee_events_dlq.arn
    maxReceiveCount     = 5
  })

  # ── Encryption ────────────────────────────────────────────────────────
  sqs_managed_sse_enabled = true

  tags = {
    Name        = "${var.project_name}-employee-events"
    Environment = var.environment
    Purpose     = "employee-lifecycle-events"
  }
}

# ── Employee Events DLQ ─────────────────────────────────────────────────────
resource "aws_sqs_queue" "employee_events_dlq" {
  name                      = "${var.project_name}-${var.environment}-employee-events-dlq.fifo"
  fifo_queue                = true
  message_retention_seconds = 1209600  # 14 days
  sqs_managed_sse_enabled   = true

  tags = {
    Name    = "${var.project_name}-employee-events-dlq"
    Purpose = "dead-letter-queue"
  }
}

# ── Notification Queue (Standard — ordering not critical) ────────────────────
resource "aws_sqs_queue" "notification_events" {
  name = "${var.project_name}-${var.environment}-notification-events"

  message_retention_seconds   = 345600  # 4 days
  visibility_timeout_seconds  = 60
  receive_wait_time_seconds   = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_events_dlq.arn
    maxReceiveCount     = 3
  })

  sqs_managed_sse_enabled = true

  tags = {
    Name        = "${var.project_name}-notification-events"
    Environment = var.environment
    Purpose     = "notification-dispatch"
  }
}

resource "aws_sqs_queue" "notification_events_dlq" {
  name                      = "${var.project_name}-${var.environment}-notification-events-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true

  tags = {
    Name    = "${var.project_name}-notification-events-dlq"
    Purpose = "dead-letter-queue"
  }
}

# ── Payroll Queue (FIFO — strict ordering for financial transactions) ────────
resource "aws_sqs_queue" "payroll_events" {
  name                        = "${var.project_name}-${var.environment}-payroll-events.fifo"
  fifo_queue                  = true
  content_based_deduplication = false  # Explicit dedup IDs for payroll
  deduplication_scope         = "messageGroup"
  fifo_throughput_limit       = "perMessageGroupId"

  message_retention_seconds   = 604800
  visibility_timeout_seconds  = 600  # 10 minutes for payroll processing
  receive_wait_time_seconds   = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.payroll_events_dlq.arn
    maxReceiveCount     = 3
  })

  sqs_managed_sse_enabled = true

  tags = {
    Name        = "${var.project_name}-payroll-events"
    Environment = var.environment
    Purpose     = "payroll-processing"
  }
}

resource "aws_sqs_queue" "payroll_events_dlq" {
  name                      = "${var.project_name}-${var.environment}-payroll-events-dlq.fifo"
  fifo_queue                = true
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true

  tags = {
    Name    = "${var.project_name}-payroll-events-dlq"
    Purpose = "dead-letter-queue"
  }
}

# ── SNS Topic for Employee Alerts (fan-out to multiple queues) ───────────────
resource "aws_sns_topic" "employee_alerts" {
  name              = "${var.project_name}-${var.environment}-employee-alerts"
  kms_master_key_id = "alias/aws/sns"

  tags = {
    Name        = "${var.project_name}-employee-alerts"
    Environment = var.environment
  }
}

# ── SNS → SQS Subscription (fan-out pattern) ────────────────────────────────
resource "aws_sns_topic_subscription" "notification_fanout" {
  topic_arn = aws_sns_topic.employee_alerts.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.notification_events.arn
}

# ── SQS Queue Policy (allow SNS to send messages) ──────────────────────────
resource "aws_sqs_queue_policy" "notification_events_policy" {
  queue_url = aws_sqs_queue.notification_events.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSNS"
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.notification_events.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.employee_alerts.arn
        }
      }
    }]
  })
}

# ── CloudWatch Alarms for SQS DLQ ──────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "employee_dlq_messages" {
  alarm_name          = "${var.project_name}-${var.environment}-employee-dlq-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Employee events DLQ has messages — investigate failed processing"

  dimensions = {
    QueueName = aws_sqs_queue.employee_events_dlq.name
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "payroll_dlq_messages" {
  alarm_name          = "${var.project_name}-${var.environment}-payroll-dlq-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Payroll events DLQ has messages — CRITICAL: investigate immediately"
  alarm_actions       = []  # Add SNS topic ARN for alerts

  dimensions = {
    QueueName = aws_sqs_queue.payroll_events_dlq.name
  }

  tags = {
    Environment = var.environment
  }
}
