# ─── ECR (Elastic Container Registry) ─────────────────────────────────────────
# Interview insight: ECR = private Docker registry
# Used by: GitHub Actions CI/CD → build image → push to ECR → deploy to EKS

resource "aws_ecr_repository" "services" {
  for_each = toset([
    "employee-service",
    "payroll-service",
    "api-gateway",
    "frontend"
  ])

  name                 = "${var.project_name}/${each.key}"
  image_tag_mutability = "IMMUTABLE"    # Can't overwrite tags — audit trail

  image_scanning_configuration {
    scan_on_push = true    # Scan for CVEs on every push
  }

  encryption_configuration {
    encryption_type = "KMS"
  }

  tags = {
    Name = "${var.project_name}-${each.key}"
  }
}

# Lifecycle policy: keep only last 30 images (save storage cost)
resource "aws_ecr_lifecycle_policy" "cleanup" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 30 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 30
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
# Interview insight: Outputs = return values from Terraform
# Used by CI/CD pipelines, other Terraform modules, or kubectl configuration

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_certificate_authority_data" {
  description = "EKS cluster CA certificate"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "rds_endpoint" {
  description = "RDS primary endpoint"
  value       = aws_db_instance.primary.endpoint
}

output "rds_read_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = var.environment == "production" ? aws_db_instance.read_replica[0].endpoint : "N/A (not created in ${var.environment})"
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "msk_bootstrap_brokers" {
  description = "MSK Kafka bootstrap brokers"
  value       = aws_msk_cluster.main.bootstrap_brokers
}

output "ecr_repository_urls" {
  description = "ECR repository URLs for all services"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "s3_assets_bucket" {
  description = "S3 bucket for application assets"
  value       = aws_s3_bucket.app_assets.bucket
}

# ── kubectl Configuration Command ───────────────────────────────────────────
output "configure_kubectl" {
  description = "Command to configure kubectl for this cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}
