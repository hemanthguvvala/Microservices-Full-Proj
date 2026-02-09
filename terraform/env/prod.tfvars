# ─── Environment-Specific Variables (Production) ─────────────────────────────
# Usage: terraform apply -var-file="env/prod.tfvars"

environment = "production"
aws_region  = "us-east-1"

# EKS
eks_cluster_version     = "1.28"
eks_node_instance_types = ["m5.xlarge"]    # 4 vCPU, 16GB — production grade
eks_node_min_size       = 3
eks_node_max_size       = 20
eks_node_desired_size   = 5

# RDS
db_instance_class  = "db.r6g.large"     # 2 vCPU, 16GB RAM — memory optimized
db_allocated_storage = 100
db_name            = "employee_db"

# ElastiCache
redis_node_type       = "cache.r6g.large"
redis_num_cache_nodes = 3
