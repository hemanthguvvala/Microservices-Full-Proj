# ═══════════════════════════════════════════════════════════════════════════════
# Azure Cache for Redis + Event Hubs (Kafka-compatible)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "Azure Cache for Redis vs ElastiCache?"
# → Both are managed Redis. Azure Cache supports Redis Enterprise for
#   RediSearch and RedisJSON modules. ElastiCache has Global Datastore
#   for cross-region replication. Azure Cache has built-in geo-replication
#   at Premium tier. Both support TLS, VNet integration, and clustering.
#
# Interview: "Event Hubs vs MSK?"
# → Event Hubs has a Kafka-compatible endpoint (use existing Kafka clients).
#   MSK is actual Kafka (full API, Kafka Connect, Kafka Streams).
#   Event Hubs: serverless pricing option, auto-scale, lower ops overhead.
#   MSK: full Kafka ecosystem, more control, more operational burden.

# ══════════════════════════════════════════════════════════════════════════════
# REDIS
# ══════════════════════════════════════════════════════════════════════════════

resource "azurerm_redis_cache" "main" {
  name                = "${var.project_name}-${var.environment}-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku

  # ── Security ────────────────────────────────────────────────────────────
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
  public_network_access_enabled = false

  # ── Configuration ──────────────────────────────────────────────────────
  redis_configuration {
    maxmemory_policy       = "volatile-lru"
    maxmemory_reserved     = 50
    maxfragmentationmemory_reserved = 50
    notify_keyspace_events = "KEA"  # Enable keyspace notifications for cache invalidation
  }

  # ── Patching Window ────────────────────────────────────────────────────
  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 3
  }

  tags = azurerm_resource_group.main.tags
}

# ── Private Endpoint for Redis (VNet integration) ────────────────────────────
resource "azurerm_private_endpoint" "redis" {
  name                = "${var.project_name}-${var.environment}-redis-pe"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.redis.id

  private_service_connection {
    name                           = "redis-connection"
    private_connection_resource_id = azurerm_redis_cache.main.id
    subresource_names              = ["redisCache"]
    is_manual_connection           = false
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# EVENT HUBS (Kafka-compatible endpoint)
# ══════════════════════════════════════════════════════════════════════════════

resource "azurerm_eventhub_namespace" "main" {
  name                = "${var.project_name}-${var.environment}-ehns"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = var.eventhub_sku
  capacity            = var.eventhub_capacity

  # ── Kafka-compatible endpoint ──────────────────────────────────────────
  # Interview: "Can you use Kafka clients with Event Hubs?"
  # → Yes, Event Hubs exposes a Kafka-compatible endpoint at Standard+ tier.
  #   No code changes: point Kafka bootstrap server to the Event Hubs endpoint.
  #   Only limitation: no Kafka Connect or Kafka Streams.
  kafka_enabled = true

  # ── Auto-inflate (auto-scaling throughput units) ───────────────────────
  auto_inflate_enabled     = var.environment == "production"
  maximum_throughput_units = var.environment == "production" ? 20 : 0

  # ── Network Rules ──────────────────────────────────────────────────────
  network_rulesets {
    default_action                 = "Deny"
    trusted_service_access_enabled = true
    virtual_network_rule {
      subnet_id = azurerm_subnet.aks.id
    }
  }

  tags = azurerm_resource_group.main.tags
}

# ── Event Hubs (Kafka topics) ────────────────────────────────────────────────
resource "azurerm_eventhub" "employee_events" {
  name                = "employee-events"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = azurerm_resource_group.main.name
  partition_count     = var.eventhub_partition_count
  message_retention   = 7

  capture_description {
    enabled             = var.environment == "production"
    encoding            = "Avro"
    interval_in_seconds = 300
    size_limit_in_bytes = 314572800  # 300MB
    skip_empty_archives = true

    destination {
      name                = "EventHubArchive.AzureBlockBlob"
      archive_name_format = "{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}/{Second}"
      blob_container_name = "event-archive"
      storage_account_id  = azurerm_storage_account.main.id
    }
  }
}

resource "azurerm_eventhub" "notification_events" {
  name                = "notification-events"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = azurerm_resource_group.main.name
  partition_count     = var.eventhub_partition_count
  message_retention   = 7
}

resource "azurerm_eventhub" "payroll_events" {
  name                = "payroll-events"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = azurerm_resource_group.main.name
  partition_count     = var.eventhub_partition_count
  message_retention   = 7
}

# ── Consumer Groups ──────────────────────────────────────────────────────────
resource "azurerm_eventhub_consumer_group" "notification_consumer" {
  name                = "notification-service"
  namespace_name      = azurerm_eventhub_namespace.main.name
  eventhub_name       = azurerm_eventhub.employee_events.name
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_eventhub_consumer_group" "analytics_consumer" {
  name                = "analytics-service"
  namespace_name      = azurerm_eventhub_namespace.main.name
  eventhub_name       = azurerm_eventhub.employee_events.name
  resource_group_name = azurerm_resource_group.main.name
}
