# ═══════════════════════════════════════════════════════════════════════════════
# GCP Terraform Variables
# ═══════════════════════════════════════════════════════════════════════════════

# ── General ──────────────────────────────────────────────────────────────────
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

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

variable "region" {
  description = "GCP region for resource deployment"
  type        = string
  default     = "us-central1"
}

variable "replica_region" {
  description = "GCP region for read replicas"
  type        = string
  default     = "us-east1"
}

# ── Networking ───────────────────────────────────────────────────────────────
variable "gke_subnet_cidr" {
  description = "CIDR block for the GKE node subnet"
  type        = string
  default     = "10.0.0.0/20"
}

variable "gke_pod_cidr" {
  description = "CIDR block for GKE pod IPs (secondary range)"
  type        = string
  default     = "10.4.0.0/14"
}

variable "gke_service_cidr" {
  description = "CIDR block for GKE service IPs (secondary range)"
  type        = string
  default     = "10.8.0.0/20"
}

variable "master_cidr" {
  description = "CIDR block for GKE control plane"
  type        = string
  default     = "172.16.0.0/28"
}

variable "authorized_networks" {
  description = "Networks authorized to access the GKE control plane"
  type = list(object({
    cidr = string
    name = string
  }))
  default = [
    {
      cidr = "0.0.0.0/0"
      name = "all-networks"
    }
  ]
}

# ── GKE ──────────────────────────────────────────────────────────────────────
variable "system_node_count" {
  description = "Initial number of nodes in the system node pool"
  type        = number
  default     = 2
}

variable "system_machine_type" {
  description = "Machine type for system node pool"
  type        = string
  default     = "e2-standard-2"
}

variable "system_node_min_count" {
  description = "Minimum number of system nodes for autoscaling"
  type        = number
  default     = 2
}

variable "system_node_max_count" {
  description = "Maximum number of system nodes for autoscaling"
  type        = number
  default     = 5
}

variable "app_machine_type" {
  description = "Machine type for application node pool"
  type        = string
  default     = "e2-standard-4"
}

variable "app_node_min_count" {
  description = "Minimum number of application nodes for autoscaling"
  type        = number
  default     = 1
}

variable "app_node_max_count" {
  description = "Maximum number of application nodes for autoscaling"
  type        = number
  default     = 10
}

# ── Cloud SQL ────────────────────────────────────────────────────────────────
variable "cloudsql_tier" {
  description = "Cloud SQL instance tier (e.g., db-f1-micro, db-custom-2-7680)"
  type        = string
  default     = "db-custom-2-7680"
}

variable "cloudsql_disk_size_gb" {
  description = "Initial disk size in GB for Cloud SQL"
  type        = number
  default     = 50
}

variable "db_admin_username" {
  description = "Administrator username for Cloud SQL"
  type        = string
  default     = "pgadmin"
  sensitive   = true
}

variable "db_admin_password" {
  description = "Administrator password for Cloud SQL"
  type        = string
  sensitive   = true
}

# ── Memorystore (Redis) ─────────────────────────────────────────────────────
variable "redis_memory_gb" {
  description = "Memory size for Memorystore Redis instance in GB"
  type        = number
  default     = 1
}

# ── Monitoring ───────────────────────────────────────────────────────────────
variable "alert_email" {
  description = "Email address for alert notifications"
  type        = string
  default     = "hemanthguvvala@gmail.com"
}

variable "pagerduty_service_key" {
  description = "PagerDuty service key for critical alerts"
  type        = string
  default     = "placeholder-service-key"
  sensitive   = true
}

variable "health_check_host" {
  description = "Hostname for uptime health checks"
  type        = string
  default     = "api.employee-platform.example.com"
}
