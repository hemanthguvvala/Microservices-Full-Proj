# ═══════════════════════════════════════════════════════════════════════════════
# Memorystore (Redis) + Pub/Sub
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "Memorystore vs ElastiCache vs Azure Cache for Redis?"
# → Memorystore: Managed Redis or Memcached. Standard/Basic tiers.
#   No clustering in standard Redis, but Redis Cluster mode available.
#   VPC peering for private access. Automatic failover in Standard tier.
# → ElastiCache: Redis or Memcached. Cluster mode with up to 500 shards.
#   Global Datastore for cross-region. Reserved nodes for cost savings.
# → Azure Cache: Built-in geo-replication (Premium). Redis Enterprise
#   tier with RediSearch/RedisJSON modules. Zone redundancy.
#
# Interview: "Pub/Sub vs SQS/SNS vs Event Hubs?"
# → Pub/Sub: Global, serverless, exactly-once delivery, ordering keys,
#   dead-letter topics, push/pull subscriptions, BigQuery export.
# → SQS: Queue-based (not topic), FIFO for ordering, max 14-day retention,
#   256KB message size. SNS adds fan-out to multiple SQS queues.
# → Event Hubs: Kafka-compatible, throughput units pricing, Event
#   Capture to Blob Storage, consumer groups. Partition-based ordering.

# ══════════════════════════════════════════════════════════════════════════════
# MEMORYSTORE (REDIS)
# ══════════════════════════════════════════════════════════════════════════════

resource "google_redis_instance" "main" {
  name           = "${var.project_name}-${var.environment}-redis"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.redis_memory_gb
  region         = var.region

  # ── Version ────────────────────────────────────────────────────────────
  redis_version = "REDIS_7_0"

  # ── Network ────────────────────────────────────────────────────────────
  authorized_network = google_compute_network.main.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  # ── Configuration ──────────────────────────────────────────────────────
  redis_configs = {
    maxmemory-policy  = "volatile-lru"
    notify-keyspace-events = "KEA"
  }

  # ── Maintenance ────────────────────────────────────────────────────────
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }

  # ── Auth ───────────────────────────────────────────────────────────────
  auth_enabled = true

  # ── Transit Encryption ─────────────────────────────────────────────────
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  labels = {
    environment = var.environment
    project     = var.project_name
  }

  depends_on = [google_service_networking_connection.private_services]
}

# ══════════════════════════════════════════════════════════════════════════════
# PUB/SUB TOPICS & SUBSCRIPTIONS
# ══════════════════════════════════════════════════════════════════════════════

# ── Employee Events Topic ────────────────────────────────────────────────────
resource "google_pubsub_topic" "employee_events" {
  name = "${var.project_name}-${var.environment}-employee-events"

  # ── Ordering ───────────────────────────────────────────────────────────
  # Interview: "How does Pub/Sub guarantee ordering?"
  # → Use ordering keys. Messages with the same ordering key are
  #   delivered in order to the same subscriber. Similar to Kafka
  #   partition keys, but without partition management.

  message_retention_duration = "604800s"  # 7 days

  # ── Schema (Avro) ──────────────────────────────────────────────────────
  schema_settings {
    schema   = google_pubsub_schema.employee_event.id
    encoding = "JSON"
  }

  labels = {
    environment = var.environment
    project     = var.project_name
  }
}

resource "google_pubsub_schema" "employee_event" {
  name       = "${var.project_name}-${var.environment}-employee-event-schema"
  type       = "AVRO"
  definition = jsonencode({
    type = "record"
    name = "EmployeeEvent"
    fields = [
      { name = "eventId", type = "string" },
      { name = "eventType", type = "string" },
      { name = "employeeId", type = "long" },
      { name = "timestamp", type = "string" },
      { name = "payload", type = "string" }
    ]
  })
}

# ── Notification Service Subscription ────────────────────────────────────────
resource "google_pubsub_subscription" "notification_consumer" {
  name  = "${var.project_name}-${var.environment}-notification-sub"
  topic = google_pubsub_topic.employee_events.id

  ack_deadline_seconds       = 60
  message_retention_duration = "604800s"  # 7 days
  retain_acked_messages      = false
  enable_exactly_once_delivery = true

  # ── Dead Letter Policy ─────────────────────────────────────────────────
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 5
  }

  # ── Retry Policy ──────────────────────────────────────────────────────
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  # ── Expiration ────────────────────────────────────────────────────────
  expiration_policy {
    ttl = ""  # Never expires
  }

  labels = {
    environment = var.environment
    consumer    = "notification-service"
  }
}

# ── Analytics Service Subscription ──────────────────────────────────────────
resource "google_pubsub_subscription" "analytics_consumer" {
  name  = "${var.project_name}-${var.environment}-analytics-sub"
  topic = google_pubsub_topic.employee_events.id

  ack_deadline_seconds       = 120
  message_retention_duration = "604800s"

  # ── BigQuery Export (analytics data directly to BigQuery) ──────────────
  # Interview: "How do you stream events to BigQuery?"
  # → Pub/Sub BigQuery subscription writes directly to BigQuery table.
  #   No intermediate processing needed. Schema auto-detected or specified.
  bigquery_config {
    table            = "${var.project_id}.${var.project_name}_analytics.employee_events"
    write_metadata   = true
    drop_unknown_fields = true
  }

  labels = {
    environment = var.environment
    consumer    = "analytics-service"
  }
}

# ── Notification Events Topic ────────────────────────────────────────────────
resource "google_pubsub_topic" "notification_events" {
  name                       = "${var.project_name}-${var.environment}-notification-events"
  message_retention_duration = "604800s"

  labels = {
    environment = var.environment
    project     = var.project_name
  }
}

# ── Payroll Events Topic ────────────────────────────────────────────────────
resource "google_pubsub_topic" "payroll_events" {
  name                       = "${var.project_name}-${var.environment}-payroll-events"
  message_retention_duration = "604800s"

  labels = {
    environment = var.environment
    project     = var.project_name
  }
}

# ── Dead Letter Topic ───────────────────────────────────────────────────────
resource "google_pubsub_topic" "dead_letter" {
  name                       = "${var.project_name}-${var.environment}-dead-letter"
  message_retention_duration = "1209600s"  # 14 days

  labels = {
    environment = var.environment
    purpose     = "dead-letter"
  }
}

resource "google_pubsub_subscription" "dead_letter_monitor" {
  name  = "${var.project_name}-${var.environment}-dead-letter-monitor"
  topic = google_pubsub_topic.dead_letter.id

  ack_deadline_seconds       = 300
  message_retention_duration = "1209600s"

  labels = {
    environment = var.environment
    purpose     = "dead-letter-monitoring"
  }
}
