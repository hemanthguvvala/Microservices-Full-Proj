# ═══════════════════════════════════════════════════════════════════════════════
# Azure Kubernetes Service (AKS) — Equivalent to AWS EKS
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "AKS vs EKS — what are the key differences?"
# → AKS: free control plane, built-in AAD integration, Azure CNI or Kubenet,
#   Workload Identity (replaces IRSA), built-in monitoring via Container Insights.
#   EKS: paid control plane ($0.10/hr), IRSA for pod-level IAM, VPC CNI only.
#   Both use managed node groups. AKS has tighter Azure AD integration.

# ── AKS Cluster ──────────────────────────────────────────────────────────────
resource "azurerm_kubernetes_cluster" "main" {
  name                = "${var.project_name}-${var.environment}-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "${var.project_name}-${var.environment}"
  kubernetes_version  = var.aks_kubernetes_version

  # ── System Node Pool (always-on for system pods) ──────────────────────────
  default_node_pool {
    name                = "system"
    vm_size             = var.aks_system_node_size
    node_count          = var.aks_system_node_count
    vnet_subnet_id      = azurerm_subnet.aks.id
    os_disk_size_gb     = 100
    os_disk_type        = "Managed"
    type                = "VirtualMachineScaleSets"
    enable_auto_scaling = true
    min_count           = var.aks_system_node_min
    max_count           = var.aks_system_node_max

    node_labels = {
      "node-type" = "system"
    }
  }

  # ── Identity (Managed Identity instead of Service Principal) ──────────────
  identity {
    type = "SystemAssigned"
  }

  # ── Workload Identity (AKS equivalent of AWS IRSA) ────────────────────────
  # Interview: "How do pods authenticate to Azure services?"
  # → Workload Identity: K8s ServiceAccount → Federated Credential → Managed Identity
  #   → RBAC on Azure resources. Same concept as IRSA but with AAD federation.
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  # ── Network Configuration ─────────────────────────────────────────────────
  network_profile {
    network_plugin    = "azure"      # Azure CNI (vs kubenet)
    network_policy    = "calico"     # Network Policies enforcement
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
    service_cidr      = "10.2.0.0/16"
    dns_service_ip    = "10.2.0.10"
  }

  # ── Azure AD Integration ──────────────────────────────────────────────────
  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
    admin_group_object_ids = var.aks_admin_group_ids
  }

  # ── Monitoring (Container Insights → Azure Monitor) ────────────────────────
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  # ── Key Vault Secrets Provider (≈ External Secrets Operator) ───────────────
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "5m"
  }

  tags = azurerm_resource_group.main.tags
}

# ── Application Node Pool (spot instances for cost optimization) ─────────────
resource "azurerm_kubernetes_cluster_node_pool" "application" {
  name                  = "apppool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.aks_app_node_size
  vnet_subnet_id        = azurerm_subnet.aks.id
  os_disk_size_gb       = 100
  enable_auto_scaling   = true
  min_count             = var.aks_app_node_min
  max_count             = var.aks_app_node_max
  priority              = "Spot"
  eviction_policy       = "Delete"
  spot_max_price         = -1  # Pay up to on-demand price

  node_labels = {
    "node-type"                    = "application"
    "kubernetes.azure.com/scalesetpriority" = "spot"
  }

  node_taints = ["kubernetes.azure.com/scalesetpriority=spot:NoSchedule"]

  tags = azurerm_resource_group.main.tags
}

# ── Log Analytics Workspace (Azure Monitor backend) ──────────────────────────
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project_name}-${var.environment}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = azurerm_resource_group.main.tags
}

# ── Workload Identity for Employee Service ───────────────────────────────────
resource "azurerm_user_assigned_identity" "employee_service" {
  name                = "${var.project_name}-${var.environment}-employee-svc"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

resource "azurerm_federated_identity_credential" "employee_service" {
  name                = "employee-service-federated"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.employee_service.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.main.oidc_issuer_url
  subject             = "system:serviceaccount:employee-platform:employee-service"
}
