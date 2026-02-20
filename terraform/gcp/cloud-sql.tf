# ═══════════════════════════════════════════════════════════════════════════════
# Cloud SQL for PostgreSQL
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "Cloud SQL vs RDS vs Azure Database for PostgreSQL?"
# → Cloud SQL: Automatic storage increase, built-in HA with regional persistent
#   disk, maintenance windows, IAM DB authentication, Cross-region read replicas.
# → RDS: Multi-AZ for HA (synchronous standby), Read Replicas (async),
#   RDS Proxy for connection pooling. Parameter groups for tuning.
# → Azure DB for PostgreSQL Flexible: Zone-redundant HA, built-in PgBouncer,
#   flexible maintenance windows, Private Link. Hyperscale (Citus) option.
#
# Interview: "How do you handle Cloud SQL private connectivity?"
# → Private Services Access: VPC peering with Google-managed VPC.
#   No public IP. Authorized networks for Cloud SQL Proxy if needed.
#   Cloud SQL Auth Proxy for IAM-based authentication.

resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-${var.environment}-pg"
  database_version = "POSTGRES_15"
  region           = var.region

  # ── Don't delete on terraform destroy (safety) ─────────────────────────
  deletion_protection = var.environment == "production"

  settings {
    tier              = var.cloudsql_tier
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_autoresize   = true
    disk_size         = var.cloudsql_disk_size_gb
    disk_type         = "PD_SSD"

    # ── Private Network ─────────────────────────────────────────────────
    ip_configuration {
      ipv4_enabled                                  = false  # No public IP
      private_network                               = google_compute_network.main.id
      enable_private_path_for_google_cloud_services = true
    }

    # ── Backup Configuration ────────────────────────────────────────────
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = var.environment == "production" ? 30 : 7
        retention_unit   = "COUNT"
      }
    }

    # ── Maintenance Window ──────────────────────────────────────────────
    maintenance_window {
      day          = 7  # Sunday
      hour         = 3
      update_track = var.environment == "production" ? "stable" : "canary"
    }

    # ── Database Flags ──────────────────────────────────────────────────
    # Interview: "What PostgreSQL flags do you tune for Debezium CDC?"
    # → wal_level=logical is mandatory for logical replication.
    #   max_wal_senders and max_replication_slots should accommodate
    #   the number of Debezium connectors.
    database_flags {
      name  = "wal_level"
      value = "logical"  # Required for Debezium CDC
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    database_flags {
      name  = "max_wal_senders"
      value = "10"
    }

    database_flags {
      name  = "max_replication_slots"
      value = "10"
    }

    database_flags {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements"
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"  # Log queries > 1 second
    }

    # ── Insights (Query Performance Monitoring) ─────────────────────────
    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 4096
      record_application_tags = true
      record_client_address   = true
    }

    user_labels = {
      environment = var.environment
      project     = var.project_name
    }
  }

  depends_on = [google_service_networking_connection.private_services]
}

# ── Database ─────────────────────────────────────────────────────────────────
resource "google_sql_database" "employee" {
  name     = "employee_db"
  instance = google_sql_database_instance.main.name
}

# ── User ─────────────────────────────────────────────────────────────────────
resource "google_sql_user" "admin" {
  name     = var.db_admin_username
  instance = google_sql_database_instance.main.name
  password = var.db_admin_password

  deletion_policy = "ABANDON"
}

# ── IAM DB Authentication User (passwordless for applications) ───────────────
resource "google_sql_user" "iam_employee_service" {
  name     = google_service_account.employee_service.email
  instance = google_sql_database_instance.main.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}

# ── Read Replica (production only) ──────────────────────────────────────────
resource "google_sql_database_instance" "read_replica" {
  count                = var.environment == "production" ? 1 : 0
  name                 = "${var.project_name}-${var.environment}-pg-replica"
  master_instance_name = google_sql_database_instance.main.name
  database_version     = "POSTGRES_15"
  region               = var.replica_region

  replica_configuration {
    failover_target = false
  }

  settings {
    tier            = var.cloudsql_tier
    disk_autoresize = true
    disk_type       = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 4096
      record_application_tags = true
    }

    user_labels = {
      environment = var.environment
      role        = "read-replica"
    }
  }
}
