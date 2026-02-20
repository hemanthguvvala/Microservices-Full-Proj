# ═══════════════════════════════════════════════════════════════════════════════
# Azure Container Registry + Storage Account
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "ACR vs ECR vs Artifact Registry?"
# → ACR: Geo-replication, content trust, ACR Tasks for in-registry builds,
#   integrated with AKS via managed identity (no image pull secrets).
# → ECR: Per-region, cross-region replication requires separate config,
#   image scanning built-in, lifecycle policies for cleanup.
# → Artifact Registry (GCP): Supports Docker, Maven, npm, Python packages.
#   Regional/multi-regional, integrated with GKE Workload Identity.
#
# Interview: "How do you secure container images in ACR?"
# → Private endpoint (no public access), content trust with Notary v2,
#   vulnerability scanning with Microsoft Defender for Containers,
#   quarantine pattern with ACR webhooks, immutable image tags.

# ══════════════════════════════════════════════════════════════════════════════
# CONTAINER REGISTRY
# ══════════════════════════════════════════════════════════════════════════════

resource "azurerm_container_registry" "main" {
  name                = replace("${var.project_name}${var.environment}acr", "-", "")
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = var.acr_sku
  admin_enabled       = false  # Use managed identity, not admin credentials

  # ── Security ────────────────────────────────────────────────────────────
  public_network_access_enabled = false
  network_rule_bypass_option    = "AzureServices"
  zone_redundancy_enabled       = var.acr_sku == "Premium"

  # ── Geo-replication (Premium only) ─────────────────────────────────────
  dynamic "georeplications" {
    for_each = var.acr_sku == "Premium" ? var.acr_geo_replications : []
    content {
      location                = georeplications.value.location
      zone_redundancy_enabled = georeplications.value.zone_redundancy
      tags                    = azurerm_resource_group.main.tags
    }
  }

  # ── Retention Policy ───────────────────────────────────────────────────
  retention_policy {
    days    = 30
    enabled = var.acr_sku == "Premium"
  }

  tags = azurerm_resource_group.main.tags
}

# ── AKS → ACR role assignment (pull images without secrets) ──────────────────
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# ── Private Endpoint for ACR ─────────────────────────────────────────────────
resource "azurerm_private_endpoint" "acr" {
  name                = "${var.project_name}-${var.environment}-acr-pe"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.aks.id

  private_service_connection {
    name                           = "acr-connection"
    private_connection_resource_id = azurerm_container_registry.main.id
    subresource_names              = ["registry"]
    is_manual_connection           = false
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# STORAGE ACCOUNT
# ══════════════════════════════════════════════════════════════════════════════

resource "azurerm_storage_account" "main" {
  name                     = replace("${var.project_name}${var.environment}sa", "-", "")
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "production" ? "GRS" : "LRS"
  account_kind             = "StorageV2"
  min_tls_version          = "TLS1_2"
  access_tier              = "Hot"

  # ── Security ────────────────────────────────────────────────────────────
  public_network_access_enabled   = false
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true

  # ── Blob Properties ────────────────────────────────────────────────────
  blob_properties {
    versioning_enabled       = true
    change_feed_enabled      = true
    last_access_time_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  tags = azurerm_resource_group.main.tags
}

# ── Blob Containers ──────────────────────────────────────────────────────────
resource "azurerm_storage_container" "employee_documents" {
  name                  = "employee-documents"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "event_archive" {
  name                  = "event-archive"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "backups" {
  name                  = "database-backups"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# ── Lifecycle Management ─────────────────────────────────────────────────────
resource "azurerm_storage_management_policy" "lifecycle" {
  storage_account_id = azurerm_storage_account.main.id

  rule {
    name    = "archive-old-documents"
    enabled = true
    filters {
      prefix_match = ["employee-documents/"]
      blob_types   = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 90
        delete_after_days_since_modification_greater_than          = 365
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 30
      }
    }
  }

  rule {
    name    = "cleanup-event-archives"
    enabled = true
    filters {
      prefix_match = ["event-archive/"]
      blob_types   = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than = 7
        delete_after_days_since_modification_greater_than       = 90
      }
    }
  }
}
