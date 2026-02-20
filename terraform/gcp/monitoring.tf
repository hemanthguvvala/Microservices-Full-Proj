# ═══════════════════════════════════════════════════════════════════════════════
# GCP Cloud Monitoring + Alerting Policies
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "Cloud Monitoring vs CloudWatch vs Azure Monitor?"
# → Cloud Monitoring: Built-in GKE dashboards, Google Managed Prometheus,
#   MQL (Monitoring Query Language), multi-project monitoring, SLO monitoring.
# → CloudWatch: Per-service metrics, Logs Insights (SQL-like), X-Ray tracing,
#   Composite alarms, Anomaly Detection. Metric math for complex conditions.
# → Azure Monitor: KQL for log queries, Application Insights for APM,
#   Action Groups for notification routing, Workbooks for dashboards.

# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATION CHANNELS
# ══════════════════════════════════════════════════════════════════════════════

resource "google_monitoring_notification_channel" "email" {
  display_name = "Platform Team Email"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }
}

resource "google_monitoring_notification_channel" "pagerduty" {
  display_name = "PagerDuty Critical"
  type         = "pagerduty"

  labels = {
    service_key = var.pagerduty_service_key
  }

  sensitive_labels {
    service_key = var.pagerduty_service_key
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# GKE ALERTING POLICIES
# ══════════════════════════════════════════════════════════════════════════════

# ── GKE Node CPU Utilization ─────────────────────────────────────────────────
resource "google_monitoring_alert_policy" "gke_cpu" {
  display_name = "[${var.environment}] GKE Node CPU > 80%"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "GKE node CPU utilization"

    condition_threshold {
      filter          = "resource.type = \"k8s_node\" AND resource.labels.cluster_name = \"${google_container_cluster.main.name}\" AND metric.type = \"kubernetes.io/node/cpu/allocatable_utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id,
  ]

  alert_strategy {
    auto_close = "1800s"
  }
}

# ── GKE Node Memory Utilization ─────────────────────────────────────────────
resource "google_monitoring_alert_policy" "gke_memory" {
  display_name = "[${var.environment}] GKE Node Memory > 85%"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "GKE node memory utilization"

    condition_threshold {
      filter          = "resource.type = \"k8s_node\" AND resource.labels.cluster_name = \"${google_container_cluster.main.name}\" AND metric.type = \"kubernetes.io/node/memory/allocatable_utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id,
  ]
}

# ── GKE Pod Restart Rate ────────────────────────────────────────────────────
resource "google_monitoring_alert_policy" "pod_restarts" {
  display_name = "[${var.environment}] Pod Restart Rate > 3/30min"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "Pod restart rate"

    condition_threshold {
      filter          = "resource.type = \"k8s_container\" AND resource.labels.cluster_name = \"${google_container_cluster.main.name}\" AND metric.type = \"kubernetes.io/container/restart_count\""
      comparison      = "COMPARISON_GT"
      threshold_value = 3
      duration        = "1800s"

      aggregations {
        alignment_period   = "1800s"
        per_series_aligner = "ALIGN_DELTA"
        group_by_fields    = ["resource.labels.pod_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id,
    google_monitoring_notification_channel.pagerduty.id,
  ]
}

# ══════════════════════════════════════════════════════════════════════════════
# CLOUD SQL ALERTING POLICIES
# ══════════════════════════════════════════════════════════════════════════════

resource "google_monitoring_alert_policy" "cloudsql_cpu" {
  display_name = "[${var.environment}] Cloud SQL CPU > 90%"
  combiner     = "OR"
  severity     = "CRITICAL"

  conditions {
    display_name = "Cloud SQL CPU utilization"

    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND resource.labels.database_id = \"${var.project_id}:${google_sql_database_instance.main.name}\" AND metric.type = \"cloudsql.googleapis.com/database/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.9
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id,
    google_monitoring_notification_channel.pagerduty.id,
  ]
}

resource "google_monitoring_alert_policy" "cloudsql_disk" {
  display_name = "[${var.environment}] Cloud SQL Disk Usage > 85%"
  combiner     = "OR"
  severity     = "CRITICAL"

  conditions {
    display_name = "Cloud SQL disk utilization"

    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND resource.labels.database_id = \"${var.project_id}:${google_sql_database_instance.main.name}\" AND metric.type = \"cloudsql.googleapis.com/database/disk/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id,
    google_monitoring_notification_channel.pagerduty.id,
  ]
}

# ══════════════════════════════════════════════════════════════════════════════
# REDIS ALERTING POLICIES
# ══════════════════════════════════════════════════════════════════════════════

resource "google_monitoring_alert_policy" "redis_memory" {
  display_name = "[${var.environment}] Redis Memory Usage > 80%"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "Redis memory usage ratio"

    condition_threshold {
      filter          = "resource.type = \"redis_instance\" AND resource.labels.instance_id = \"${google_redis_instance.main.name}\" AND metric.type = \"redis.googleapis.com/stats/memory/usage_ratio\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id,
  ]
}

# ══════════════════════════════════════════════════════════════════════════════
# PUB/SUB ALERTING POLICIES
# ══════════════════════════════════════════════════════════════════════════════

resource "google_monitoring_alert_policy" "pubsub_oldest_unacked" {
  display_name = "[${var.environment}] Pub/Sub Oldest Unacked Message > 5min"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "Pub/Sub oldest unacked message age"

    condition_threshold {
      filter          = "resource.type = \"pubsub_subscription\" AND metric.type = \"pubsub.googleapis.com/subscription/oldest_unacked_message_age\""
      comparison      = "COMPARISON_GT"
      threshold_value = 300  # 5 minutes
      duration        = "60s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MAX"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id,
  ]
}

resource "google_monitoring_alert_policy" "pubsub_dead_letter" {
  display_name = "[${var.environment}] Dead Letter Topic Messages > 0"
  combiner     = "OR"
  severity     = "CRITICAL"

  conditions {
    display_name = "Dead letter topic receiving messages"

    condition_threshold {
      filter          = "resource.type = \"pubsub_topic\" AND resource.labels.topic_id = \"${google_pubsub_topic.dead_letter.name}\" AND metric.type = \"pubsub.googleapis.com/topic/send_message_operation_count\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "60s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id,
    google_monitoring_notification_channel.pagerduty.id,
  ]
}

# ══════════════════════════════════════════════════════════════════════════════
# UPTIME CHECKS
# ══════════════════════════════════════════════════════════════════════════════

resource "google_monitoring_uptime_check_config" "health_check" {
  display_name = "${var.project_name}-${var.environment}-health"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/actuator/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.health_check_host
    }
  }
}
