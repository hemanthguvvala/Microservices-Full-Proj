# ═══════════════════════════════════════════════════════════════════════════════
# Azure Terraform Variables
# ═══════════════════════════════════════════════════════════════════════════════

# ── General ──────────────────────────────────────────────────────────────────
variable "project_name" {
  description = "Project name used as prefix for all resources"
  type        = string
  default     = "employee-platform"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "location" {
  description = "Azure region for resource deployment"
  type        = string
  default     = "East US 2"
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default = {
    managed_by = "terraform"
    project    = "employee-platform"
  }
}

# ── Networking ───────────────────────────────────────────────────────────────
variable "vnet_cidr" {
  description = "CIDR block for the Virtual Network"
  type        = string
  default     = "10.0.0.0/16"
}

variable "aks_subnet_cidr" {
  description = "CIDR block for the AKS subnet"
  type        = string
  default     = "10.0.0.0/20"
}

variable "db_subnet_cidr" {
  description = "CIDR block for the database subnet"
  type        = string
  default     = "10.0.16.0/24"
}

variable "redis_subnet_cidr" {
  description = "CIDR block for the Redis subnet"
  type        = string
  default     = "10.0.17.0/24"
}

# ── AKS ──────────────────────────────────────────────────────────────────────
variable "kubernetes_version" {
  description = "Kubernetes version for AKS cluster"
  type        = string
  default     = "1.28"
}

variable "system_node_count" {
  description = "Number of nodes in the system node pool"
  type        = number
  default     = 2
}

variable "system_node_vm_size" {
  description = "VM size for system node pool"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "system_node_min_count" {
  description = "Minimum number of nodes for system pool autoscaling"
  type        = number
  default     = 2
}

variable "system_node_max_count" {
  description = "Maximum number of nodes for system pool autoscaling"
  type        = number
  default     = 5
}

variable "app_node_vm_size" {
  description = "VM size for application (spot) node pool"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "app_node_min_count" {
  description = "Minimum number of nodes for application pool autoscaling"
  type        = number
  default     = 1
}

variable "app_node_max_count" {
  description = "Maximum number of nodes for application pool autoscaling"
  type        = number
  default     = 10
}

# ── PostgreSQL ───────────────────────────────────────────────────────────────
variable "postgresql_sku" {
  description = "SKU for PostgreSQL Flexible Server (e.g., B_Standard_B1ms, GP_Standard_D2s_v3)"
  type        = string
  default     = "GP_Standard_D2s_v3"
}

variable "postgresql_storage_mb" {
  description = "Storage size for PostgreSQL in MB"
  type        = number
  default     = 65536  # 64GB
}

variable "postgresql_version" {
  description = "PostgreSQL major version"
  type        = string
  default     = "15"
}

variable "db_admin_username" {
  description = "Administrator username for PostgreSQL"
  type        = string
  default     = "pgadmin"
  sensitive   = true
}

variable "db_admin_password" {
  description = "Administrator password for PostgreSQL"
  type        = string
  sensitive   = true
}

# ── Redis ────────────────────────────────────────────────────────────────────
variable "redis_capacity" {
  description = "Redis cache capacity (0-6 for Basic/Standard, 1-5 for Premium)"
  type        = number
  default     = 1
}

variable "redis_family" {
  description = "Redis cache family (C for Basic/Standard, P for Premium)"
  type        = string
  default     = "C"
}

variable "redis_sku" {
  description = "Redis cache SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
}

# ── Event Hubs ───────────────────────────────────────────────────────────────
variable "eventhub_sku" {
  description = "Event Hubs namespace SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
}

variable "eventhub_capacity" {
  description = "Event Hubs throughput units"
  type        = number
  default     = 1
}

variable "eventhub_partition_count" {
  description = "Number of partitions per Event Hub topic"
  type        = number
  default     = 4
}

# ── Container Registry ───────────────────────────────────────────────────────
variable "acr_sku" {
  description = "Azure Container Registry SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
}

variable "acr_geo_replications" {
  description = "Geo-replication config for ACR (Premium only)"
  type = list(object({
    location        = string
    zone_redundancy = bool
  }))
  default = []
}

# ── Monitoring ───────────────────────────────────────────────────────────────
variable "alert_email" {
  description = "Email address for alert notifications"
  type        = string
  default     = "hemanthguvvala@gmail.com"
}

variable "pagerduty_webhook_url" {
  description = "PagerDuty webhook URL for critical alerts"
  type        = string
  default     = "https://events.pagerduty.com/integration/placeholder/enqueue"
  sensitive   = true
}

variable "log_analytics_retention_days" {
  description = "Log Analytics workspace retention in days"
  type        = number
  default     = 30
}
