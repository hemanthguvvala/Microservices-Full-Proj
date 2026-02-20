# ═══════════════════════════════════════════════════════════════════════════════
# Azure Terraform Outputs
# ═══════════════════════════════════════════════════════════════════════════════

# ── AKS ──────────────────────────────────────────────────────────────────────
output "aks_cluster_name" {
  description = "The name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_fqdn" {
  description = "The FQDN of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.fqdn
}

output "aks_kube_config" {
  description = "Kubeconfig for AKS cluster"
  value       = azurerm_kubernetes_cluster.main.kube_admin_config_raw
  sensitive   = true
}

output "aks_oidc_issuer_url" {
  description = "OIDC issuer URL for Workload Identity"
  value       = azurerm_kubernetes_cluster.main.oidc_issuer_url
}

# ── Database ─────────────────────────────────────────────────────────────────
output "postgresql_fqdn" {
  description = "FQDN of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgresql_connection_string" {
  description = "JDBC connection string for PostgreSQL"
  value       = "jdbc:postgresql://${azurerm_postgresql_flexible_server.main.fqdn}:5432/employee_db?sslmode=require"
  sensitive   = true
}

# ── Redis ────────────────────────────────────────────────────────────────────
output "redis_hostname" {
  description = "Hostname of the Redis cache"
  value       = azurerm_redis_cache.main.hostname
}

output "redis_port" {
  description = "SSL port of the Redis cache"
  value       = azurerm_redis_cache.main.ssl_port
}

output "redis_connection_string" {
  description = "Primary connection string for Redis"
  value       = azurerm_redis_cache.main.primary_connection_string
  sensitive   = true
}

# ── Event Hubs ───────────────────────────────────────────────────────────────
output "eventhub_namespace_fqdn" {
  description = "Event Hubs namespace FQDN (Kafka bootstrap server)"
  value       = "${azurerm_eventhub_namespace.main.name}.servicebus.windows.net:9093"
}

output "eventhub_connection_string" {
  description = "Primary connection string for Event Hubs"
  value       = azurerm_eventhub_namespace.main.default_primary_connection_string
  sensitive   = true
}

# ── Container Registry ───────────────────────────────────────────────────────
output "acr_login_server" {
  description = "Login server URL for Azure Container Registry"
  value       = azurerm_container_registry.main.login_server
}

output "acr_id" {
  description = "Resource ID of the Azure Container Registry"
  value       = azurerm_container_registry.main.id
}

# ── Storage ──────────────────────────────────────────────────────────────────
output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.main.name
}

output "storage_primary_blob_endpoint" {
  description = "Primary blob endpoint for the storage account"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

# ── Monitoring ───────────────────────────────────────────────────────────────
output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = azurerm_log_analytics_workspace.main.id
}

# ── Resource Group ───────────────────────────────────────────────────────────
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.main.location
}
