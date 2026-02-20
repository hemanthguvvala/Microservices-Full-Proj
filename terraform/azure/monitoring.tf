# ═══════════════════════════════════════════════════════════════════════════════
# Azure Monitoring: Application Insights + Alert Rules + Dashboards
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "Azure Monitor vs CloudWatch vs Cloud Monitoring?"
# → Azure Monitor: Application Insights (APM), Log Analytics (centralized logs),
#   Metric Alerts, Action Groups. Kusto Query Language (KQL) for log queries.
# → CloudWatch: Metrics, Logs, Alarms, X-Ray for tracing. CloudWatch Insights
#   for log analysis. Pay-per-metric/log-group model.
# → Cloud Monitoring: Built-in GKE metrics, Cloud Trace, Cloud Logging.
#   Monitoring Query Language (MQL). Tighter integration with GCP services.

# ══════════════════════════════════════════════════════════════════════════════
# APPLICATION INSIGHTS
# ══════════════════════════════════════════════════════════════════════════════

resource "azurerm_application_insights" "main" {
  name                = "${var.project_name}-${var.environment}-appinsights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "java"

  # ── Sampling ────────────────────────────────────────────────────────────
  sampling_percentage = var.environment == "production" ? 25 : 100

  # ── Daily Cap ──────────────────────────────────────────────────────────
  daily_data_cap_in_gb = var.environment == "production" ? 10 : 1

  tags = azurerm_resource_group.main.tags
}

# ══════════════════════════════════════════════════════════════════════════════
# ACTION GROUP (who gets alerted)
# ══════════════════════════════════════════════════════════════════════════════

resource "azurerm_monitor_action_group" "critical" {
  name                = "${var.project_name}-${var.environment}-critical-ag"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "critical"

  email_receiver {
    name          = "platform-team"
    email_address = var.alert_email
  }

  webhook_receiver {
    name = "pagerduty"
    service_uri = var.pagerduty_webhook_url
  }

  tags = azurerm_resource_group.main.tags
}

resource "azurerm_monitor_action_group" "warning" {
  name                = "${var.project_name}-${var.environment}-warning-ag"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "warning"

  email_receiver {
    name          = "platform-team"
    email_address = var.alert_email
  }

  tags = azurerm_resource_group.main.tags
}

# ══════════════════════════════════════════════════════════════════════════════
# METRIC ALERTS
# ══════════════════════════════════════════════════════════════════════════════

# ── AKS Node CPU ─────────────────────────────────────────────────────────────
resource "azurerm_monitor_metric_alert" "aks_cpu" {
  name                = "${var.project_name}-${var.environment}-aks-cpu-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_kubernetes_cluster.main.id]
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_cpu_usage_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }

  tags = azurerm_resource_group.main.tags
}

# ── AKS Node Memory ─────────────────────────────────────────────────────────
resource "azurerm_monitor_metric_alert" "aks_memory" {
  name                = "${var.project_name}-${var.environment}-aks-memory-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_kubernetes_cluster.main.id]
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_memory_rss_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 85
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }

  tags = azurerm_resource_group.main.tags
}

# ── PostgreSQL CPU ───────────────────────────────────────────────────────────
resource "azurerm_monitor_metric_alert" "db_cpu" {
  name                = "${var.project_name}-${var.environment}-db-cpu-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_postgresql_flexible_server.main.id]
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "cpu_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 90
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = azurerm_resource_group.main.tags
}

# ── PostgreSQL Storage ───────────────────────────────────────────────────────
resource "azurerm_monitor_metric_alert" "db_storage" {
  name                = "${var.project_name}-${var.environment}-db-storage-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_postgresql_flexible_server.main.id]
  severity            = 1
  frequency           = "PT15M"
  window_size         = "PT1H"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "storage_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 85
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = azurerm_resource_group.main.tags
}

# ── Redis Cache Hit Rate ─────────────────────────────────────────────────────
resource "azurerm_monitor_metric_alert" "redis_cache_miss" {
  name                = "${var.project_name}-${var.environment}-redis-miss-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_redis_cache.main.id]
  severity            = 3
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "cachemissrate"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 50
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }

  tags = azurerm_resource_group.main.tags
}

# ── Redis Server Load ────────────────────────────────────────────────────────
resource "azurerm_monitor_metric_alert" "redis_server_load" {
  name                = "${var.project_name}-${var.environment}-redis-load-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_redis_cache.main.id]
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "serverLoad"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }

  tags = azurerm_resource_group.main.tags
}

# ── Event Hubs Throttled Requests ────────────────────────────────────────────
resource "azurerm_monitor_metric_alert" "eventhub_throttled" {
  name                = "${var.project_name}-${var.environment}-eh-throttled-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_eventhub_namespace.main.id]
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.EventHub/namespaces"
    metric_name      = "ThrottledRequests"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }

  tags = azurerm_resource_group.main.tags
}

# ══════════════════════════════════════════════════════════════════════════════
# KQL-BASED LOG ALERTS
# ══════════════════════════════════════════════════════════════════════════════

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "pod_restarts" {
  name                = "${var.project_name}-${var.environment}-pod-restart-alert"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_log_analytics_workspace.main.id]
  severity            = 2
  window_duration     = "PT30M"
  evaluation_frequency = "PT10M"

  criteria {
    query = <<-KQL
      KubePodInventory
      | where ClusterName == "${azurerm_kubernetes_cluster.main.name}"
      | where Namespace startswith "employee-"
      | summarize RestartCount = sum(PodRestartCount) by PodName, bin(TimeGenerated, 30m)
      | where RestartCount > 3
    KQL

    time_aggregation_method = "Count"
    operator                = "GreaterThan"
    threshold               = 0

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.warning.id]
  }

  tags = azurerm_resource_group.main.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "error_rate" {
  name                = "${var.project_name}-${var.environment}-error-rate-alert"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_log_analytics_workspace.main.id]
  severity            = 1
  window_duration     = "PT15M"
  evaluation_frequency = "PT5M"

  criteria {
    query = <<-KQL
      ContainerLog
      | where LogEntry contains "ERROR" or LogEntry contains "Exception"
      | where _ResourceId contains "${azurerm_kubernetes_cluster.main.name}"
      | summarize ErrorCount = count() by bin(TimeGenerated, 15m)
      | where ErrorCount > 50
    KQL

    time_aggregation_method = "Count"
    operator                = "GreaterThan"
    threshold               = 0

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.critical.id]
  }

  tags = azurerm_resource_group.main.tags
}

# ══════════════════════════════════════════════════════════════════════════════
# DIAGNOSTIC SETTINGS
# ══════════════════════════════════════════════════════════════════════════════

resource "azurerm_monitor_diagnostic_setting" "aks" {
  name                       = "${var.project_name}-${var.environment}-aks-diag"
  target_resource_id         = azurerm_kubernetes_cluster.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "kube-apiserver"
  }

  enabled_log {
    category = "kube-controller-manager"
  }

  enabled_log {
    category = "kube-scheduler"
  }

  enabled_log {
    category = "kube-audit-admin"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

resource "azurerm_monitor_diagnostic_setting" "eventhub" {
  name                       = "${var.project_name}-${var.environment}-eh-diag"
  target_resource_id         = azurerm_eventhub_namespace.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "ArchiveLogs"
  }

  enabled_log {
    category = "OperationalLogs"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
