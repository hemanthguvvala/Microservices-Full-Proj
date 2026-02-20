# ═══════════════════════════════════════════════════════════════════════════════
# Azure Terraform — Main Configuration
# ═══════════════════════════════════════════════════════════════════════════════
#
# Production-grade Azure infrastructure for Employee Platform:
#   Resource Group → AKS → Azure Database for PostgreSQL → Azure Cache for Redis
#   → Event Hubs (Kafka-compatible) → Container Registry → Key Vault
#   → Azure Monitor → Application Insights
#
# Interview: "You have AWS Terraform. How would you deploy to Azure?"
# → Same Terraform patterns, different provider. Resource Group = AWS account boundary.
#   AKS = EKS equivalent. Azure DB for PostgreSQL = RDS PostgreSQL.
#   Key design difference: Azure uses Resource Groups for lifecycle management.
#   Workload Identity replaces IRSA.

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  # ── Remote State Backend (Azure Storage Account) ──────────────────────────
  # Interview: Same concept as S3 backend, but uses Azure Blob + lease for locking
  backend "azurerm" {
    resource_group_name  = "employee-platform-tfstate"
    storage_account_name = "empplatformtfstate"
    container_name       = "tfstate"
    key                  = "infrastructure/terraform.tfstate"
    use_oidc             = true  # GitHub Actions OIDC federation
  }
}

# ── Azure Provider ──────────────────────────────────────────────────────────
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
  subscription_id = var.subscription_id
}

provider "azuread" {
  tenant_id = var.tenant_id
}

# ── Data Sources ──────────────────────────────────────────────────────────────
data "azurerm_client_config" "current" {}

# ── Resource Group ────────────────────────────────────────────────────────────
# Interview: "What's a Resource Group?"
# → Logical container. When you delete the RG, ALL resources inside are deleted.
#   Equivalent to tagging everything in AWS and filtering, but enforced.
resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-${var.environment}-rg"
  location = var.azure_region

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Team        = "platform-engineering"
  }
}

# ── Virtual Network (≈ AWS VPC) ──────────────────────────────────────────────
resource "azurerm_virtual_network" "main" {
  name                = "${var.project_name}-${var.environment}-vnet"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  address_space       = [var.vnet_cidr]

  tags = azurerm_resource_group.main.tags
}

resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.aks_subnet_cidr]

  service_endpoints = ["Microsoft.Sql", "Microsoft.Storage", "Microsoft.KeyVault"]
}

resource "azurerm_subnet" "database" {
  name                 = "database-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.database_subnet_cidr]

  delegation {
    name = "postgresql-delegation"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "redis" {
  name                 = "redis-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.redis_subnet_cidr]
}

# ── Network Security Groups ──────────────────────────────────────────────────
resource "azurerm_network_security_group" "aks" {
  name                = "${var.project_name}-${var.environment}-aks-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = azurerm_resource_group.main.tags
}
