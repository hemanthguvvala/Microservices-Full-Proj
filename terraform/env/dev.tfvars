# ─── Environment-Specific Variables (Development) ────────────────────────────
# Usage: terraform apply -var-file="env/dev.tfvars"

environment = "dev"
aws_region  = "us-east-1"

# EKS — smaller for cost savings
eks_cluster_version     = "1.28"
eks_node_instance_types = ["t3.medium"]    # 2 vCPU, 4GB — sufficient for dev
eks_node_min_size       = 1
eks_node_max_size       = 3
eks_node_desired_size   = 2

# RDS — smaller
db_instance_class    = "db.t3.small"
db_allocated_storage = 20
db_name              = "employee_db"

# ElastiCache — single node
redis_node_type       = "cache.t3.small"
redis_num_cache_nodes = 1
