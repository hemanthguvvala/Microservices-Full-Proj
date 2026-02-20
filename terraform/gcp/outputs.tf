# ═══════════════════════════════════════════════════════════════════════════════
# GCP Terraform Outputs
# ═══════════════════════════════════════════════════════════════════════════════

# ── GKE ──────────────────────────────────────────────────────────────────────
output "gke_cluster_name" {
  description = "Name of the GKE cluster"
  value       = google_container_cluster.main.name
}

output "gke_cluster_endpoint" {
  description = "GKE cluster API endpoint"
  value       = google_container_cluster.main.endpoint
  sensitive   = true
}

output "gke_cluster_ca_certificate" {
  description = "GKE cluster CA certificate"
  value       = google_container_cluster.main.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "gke_workload_identity_pool" {
  description = "Workload Identity pool for the GKE cluster"
  value       = "${var.project_id}.svc.id.goog"
}

# ── Cloud SQL ────────────────────────────────────────────────────────────────
output "cloudsql_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.main.name
}

output "cloudsql_private_ip" {
  description = "Private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.main.private_ip_address
}

output "cloudsql_connection_string" {
  description = "JDBC connection string for Cloud SQL"
  value       = "jdbc:postgresql://${google_sql_database_instance.main.private_ip_address}:5432/employee_db?sslmode=require"
  sensitive   = true
}

output "cloudsql_connection_name" {
  description = "Cloud SQL connection name (for Cloud SQL Proxy)"
  value       = google_sql_database_instance.main.connection_name
}

# ── Redis ────────────────────────────────────────────────────────────────────
output "redis_host" {
  description = "Memorystore Redis host"
  value       = google_redis_instance.main.host
}

output "redis_port" {
  description = "Memorystore Redis port"
  value       = google_redis_instance.main.port
}

output "redis_auth_string" {
  description = "Memorystore Redis auth string"
  value       = google_redis_instance.main.auth_string
  sensitive   = true
}

# ── Pub/Sub ──────────────────────────────────────────────────────────────────
output "pubsub_employee_events_topic" {
  description = "Pub/Sub employee events topic name"
  value       = google_pubsub_topic.employee_events.name
}

output "pubsub_notification_events_topic" {
  description = "Pub/Sub notification events topic name"
  value       = google_pubsub_topic.notification_events.name
}

output "pubsub_payroll_events_topic" {
  description = "Pub/Sub payroll events topic name"
  value       = google_pubsub_topic.payroll_events.name
}

# ── Artifact Registry ────────────────────────────────────────────────────────
output "docker_registry_url" {
  description = "Artifact Registry Docker repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

output "maven_registry_url" {
  description = "Artifact Registry Maven repository URL"
  value       = "https://${var.region}-maven.pkg.dev/${var.project_id}/${google_artifact_registry_repository.maven.repository_id}"
}

# ── Storage ──────────────────────────────────────────────────────────────────
output "employee_docs_bucket" {
  description = "Cloud Storage bucket for employee documents"
  value       = google_storage_bucket.employee_documents.name
}

output "backups_bucket" {
  description = "Cloud Storage bucket for backups"
  value       = google_storage_bucket.backups.name
}

# ── Service Accounts ─────────────────────────────────────────────────────────
output "employee_service_account_email" {
  description = "Email of the employee service GCP service account"
  value       = google_service_account.employee_service.email
}

# ── Network ──────────────────────────────────────────────────────────────────
output "vpc_network_name" {
  description = "VPC network name"
  value       = google_compute_network.main.name
}

output "gke_subnet_name" {
  description = "GKE subnet name"
  value       = google_compute_subnetwork.gke.name
}
