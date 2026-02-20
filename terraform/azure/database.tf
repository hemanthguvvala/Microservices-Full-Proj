# ═══════════════════════════════════════════════════════════════════════════════
# Azure Database for PostgreSQL Flexible Server — Equivalent to AWS RDS
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "Azure DB for PostgreSQL vs RDS — what's different?"
# → Flexible Server is the current-gen (Single Server is deprecated).
#   Zone-redundant HA (same as RDS Multi-AZ), read replicas, PgBouncer built-in,
#   Azure AD auth (in addition to password), VNet integration via delegated subnet.
#   Key advantage: built-in PgBouncer connection pooling (RDS needs RDS Proxy separately).

# ── Private DNS Zone (required for VNet integration) ─────────────────────────
resource "azurerm_private_dns_zone" "postgresql" {
  name                = "${var.project_name}-${var.environment}.private.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgresql" {
  name                  = "postgresql-vnet-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgresql.name
  resource_group_name   = azurerm_resource_group.main.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

# ── PostgreSQL Flexible Server ───────────────────────────────────────────────
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${var.project_name}-${var.environment}-pg"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "15"
  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password

  delegated_subnet_id = azurerm_subnet.database.id
  private_dns_zone_id = azurerm_private_dns_zone.postgresql.id

  sku_name   = var.postgresql_sku
  storage_mb = var.postgresql_storage_mb

  # ── High Availability ────────────────────────────────────────────────────
  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }

  # ── Backup ───────────────────────────────────────────────────────────────
  backup_retention_days        = 35
  geo_redundant_backup_enabled = var.environment == "production"

  # ── Maintenance Window ───────────────────────────────────────────────────
  maintenance_window {
    day_of_week  = 0  # Sunday
    start_hour   = 3
    start_minute = 0
  }

  tags = azurerm_resource_group.main.tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgresql]
}

# ── PostgreSQL Configuration (performance tuning) ────────────────────────────
resource "azurerm_postgresql_flexible_server_configuration" "pgbouncer" {
  name      = "pgbouncer.enabled"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "true"
}

resource "azurerm_postgresql_flexible_server_configuration" "max_connections" {
  name      = "max_connections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "500"
}

resource "azurerm_postgresql_flexible_server_configuration" "shared_buffers" {
  name      = "shared_buffers"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "262144"  # 1GB / 4KB pages = 262144
}

resource "azurerm_postgresql_flexible_server_configuration" "wal_level" {
  name      = "wal_level"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "logical"  # Required for Debezium CDC
}

# ── Database ─────────────────────────────────────────────────────────────────
resource "azurerm_postgresql_flexible_server_database" "employee" {
  name      = "employee_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# ── Read Replica (CQRS pattern) ──────────────────────────────────────────────
resource "azurerm_postgresql_flexible_server" "replica" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.project_name}-${var.environment}-pg-replica"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  create_mode      = "Replica"
  source_server_id = azurerm_postgresql_flexible_server.main.id
  sku_name         = var.postgresql_sku

  tags = azurerm_resource_group.main.tags
}

# ── Diagnostic Settings (ship logs to Log Analytics) ─────────────────────────
resource "azurerm_monitor_diagnostic_setting" "postgresql" {
  name                       = "postgresql-diagnostics"
  target_resource_id         = azurerm_postgresql_flexible_server.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
