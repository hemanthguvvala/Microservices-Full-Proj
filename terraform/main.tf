# ─── Terraform Main Configuration ─────────────────────────────────────────────
# Infrastructure as Code for AWS deployment of Employee Platform
#
# Interview insight: Terraform is THE industry standard for cloud IaC
# This creates production-grade AWS infrastructure:
#   VPC → EKS → RDS → ElastiCache → MSK → S3 → CloudWatch → IAM
#
# Usage:
#   terraform init      # Download providers
#   terraform plan      # Preview changes
#   terraform apply     # Create infrastructure
#   terraform destroy   # Tear down everything

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  # ── Remote State Backend ──────────────────────────────────────
  # Store Terraform state in S3 + DynamoDB (locking)
  # Interview insight: NEVER store state locally in production
  backend "s3" {
    bucket         = "employee-platform-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# ── AWS Provider ──────────────────────────────────────────────────────────────
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "employee-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
      Team        = "platform-engineering"
    }
  }
}

# ── Kubernetes Provider (connects to EKS after creation) ─────────────────────
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# ── Data Sources ──────────────────────────────────────────────────────────────
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}
