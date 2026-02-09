# ─── EKS (Elastic Kubernetes Service) ─────────────────────────────────────────
# Interview insight: EKS = managed Kubernetes control plane
# AWS manages: etcd, API server, scheduler, controller manager
# You manage: worker nodes, pod deployments, networking
#
# Key features:
#   - Managed node groups (auto-scaling, auto-patching)
#   - IRSA (IAM Roles for Service Accounts) — pod-level IAM
#   - Cluster Autoscaler / Karpenter for node scaling
#   - ALB Ingress Controller for L7 load balancing

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.21"

  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = var.eks_cluster_version

  # Network configuration
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets    # Nodes in private subnets

  # Cluster endpoint access
  cluster_endpoint_public_access  = true     # kubectl from local machine
  cluster_endpoint_private_access = true     # Nodes access API server privately

  # ── EKS Add-ons (managed by AWS) ─────────────────────────────
  cluster_addons = {
    coredns = {
      most_recent = true    # DNS resolution inside cluster
    }
    kube-proxy = {
      most_recent = true    # Network proxy on each node
    }
    vpc-cni = {
      most_recent = true    # AWS VPC CNI — each pod gets real VPC IP
    }
    aws-ebs-csi-driver = {
      most_recent = true    # EBS volumes for StatefulSets (PostgreSQL, Kafka)
    }
  }

  # ── Managed Node Group ───────────────────────────────────────
  # Interview insight: Managed node groups vs Self-managed vs Fargate
  # Managed = AWS handles EC2 lifecycle, AMI updates, drain before termination
  eks_managed_node_groups = {
    # General purpose nodes for microservices
    general = {
      name            = "${var.project_name}-general"
      instance_types  = var.eks_node_instance_types
      min_size        = var.eks_node_min_size
      max_size        = var.eks_node_max_size
      desired_size    = var.eks_node_desired_size

      # Use Amazon Linux 2023 (AL2023) — latest EKS optimized AMI
      ami_type = "AL2023_x86_64_STANDARD"

      # Disk configuration
      disk_size = 50    # GB

      # Labels for pod scheduling
      labels = {
        role        = "general"
        environment = var.environment
      }

      # Taints — prevent scheduling on special nodes
      # taints = [{
      #   key    = "dedicated"
      #   value  = "monitoring"
      #   effect = "NO_SCHEDULE"
      # }]

      tags = {
        "k8s.io/cluster-autoscaler/enabled"                              = "true"
        "k8s.io/cluster-autoscaler/${var.project_name}-${var.environment}" = "owned"
      }
    }

    # Spot instances for non-critical workloads (cost optimization)
    # Interview insight: Spot instances = up to 90% cheaper, but can be interrupted
    spot = {
      name            = "${var.project_name}-spot"
      instance_types  = ["t3.large", "t3.xlarge", "m5.large"]
      min_size        = 0
      max_size        = 5
      desired_size    = var.environment == "production" ? 2 : 0
      capacity_type   = "SPOT"

      labels = {
        role          = "spot"
        "node-type"   = "spot"
      }

      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NO_SCHEDULE"    # Only pods that tolerate spot run here
      }]
    }
  }

  # ── IRSA (IAM Roles for Service Accounts) ────────────────────
  # Interview insight: IRSA = fine-grained IAM for individual pods
  # Each microservice gets its own IAM role (least privilege)
  enable_irsa = true

  # ── Cluster Security Group Rules ─────────────────────────────
  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-eks"
  }
}

# ── IRSA for Employee Service ─────────────────────────────────────────────────
# Allows employee-service pods to access specific AWS resources
module "employee_service_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.30"

  role_name = "${var.project_name}-employee-service"

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["employee-platform:employee-service-sa"]
    }
  }

  role_policy_arns = {
    s3     = aws_iam_policy.employee_service_s3.arn
    sqs    = aws_iam_policy.employee_service_sqs.arn
  }
}

# S3 access for employee service (file uploads, exports)
resource "aws_iam_policy" "employee_service_s3" {
  name = "${var.project_name}-employee-s3"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.app_assets.arn,
        "${aws_s3_bucket.app_assets.arn}/*"
      ]
    }]
  })
}

# SQS access (if using SQS instead of Kafka for some queues)
resource "aws_iam_policy" "employee_service_sqs" {
  name = "${var.project_name}-employee-sqs"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ]
      Resource = "*"
    }]
  })
}

# ── AWS Load Balancer Controller (for Ingress → ALB) ─────────────────────────
module "aws_lb_controller_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.30"

  role_name = "${var.project_name}-aws-lb-controller"

  attach_load_balancer_controller_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }
}
