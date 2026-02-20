# ═══════════════════════════════════════════════════════════════════════════════
# GKE (Google Kubernetes Engine) Cluster
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "GKE vs EKS vs AKS — key differences?"
# → GKE: Free control plane, fastest K8s version adoption, Autopilot mode
#   (fully managed nodes), native integration with Cloud Monitoring/Logging.
#   Binary Authorization for supply chain security.
# → EKS: $0.10/hr control plane fee, add-on model (CoreDNS, kube-proxy),
#   Fargate for serverless pods, deeper IAM integration (IRSA).
# → AKS: Free control plane, Azure AD integration, Virtual Nodes (ACI),
#   Windows container support, Azure Policy integration.
#
# Interview: "What is Workload Identity in GKE?"
# → Maps Kubernetes service accounts to GCP IAM service accounts.
#   Pods authenticate to GCP APIs using the GKE metadata server
#   instead of storing JSON keys. Eliminates credential management.
#   Similar to EKS IRSA and AKS Workload Identity.

# ══════════════════════════════════════════════════════════════════════════════
# GKE CLUSTER
# ══════════════════════════════════════════════════════════════════════════════

resource "google_container_cluster" "main" {
  provider = google-beta

  name     = "${var.project_name}-${var.environment}-gke"
  location = var.region

  # ── VPC-Native Cluster ─────────────────────────────────────────────────
  network    = google_compute_network.main.id
  subnetwork = google_compute_subnetwork.gke.id

  networking_mode = "VPC_NATIVE"
  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }

  # ── Remove default node pool, manage separately ────────────────────────
  remove_default_node_pool = true
  initial_node_count       = 1

  # ── Control Plane Configuration ────────────────────────────────────────
  release_channel {
    channel = var.environment == "production" ? "REGULAR" : "RAPID"
  }

  # ── Private Cluster ───────────────────────────────────────────────────
  # Interview: "Why private GKE cluster?"
  # → Nodes only have internal IPs. Control plane accessible via
  #   private endpoint or authorized networks. Reduces attack surface.
  #   Cloud NAT provides outbound internet for image pulls.
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false  # Allow kubectl from authorized networks
    master_ipv4_cidr_block  = var.master_cidr
  }

  master_authorized_networks_config {
    dynamic "cidr_blocks" {
      for_each = var.authorized_networks
      content {
        cidr_block   = cidr_blocks.value.cidr
        display_name = cidr_blocks.value.name
      }
    }
  }

  # ── Workload Identity ─────────────────────────────────────────────────
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # ── Security ──────────────────────────────────────────────────────────
  # Binary Authorization: Enforce only signed images in production
  binary_authorization {
    evaluation_mode = var.environment == "production" ? "PROJECT_SINGLETON_POLICY_ENFORCE" : "DISABLED"
  }

  # Shielded GKE Nodes
  node_config {
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  # ── Monitoring & Logging ──────────────────────────────────────────────
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
    managed_prometheus {
      enabled = true  # GMP — Google Managed Prometheus
    }
  }

  # ── Maintenance Window ────────────────────────────────────────────────
  maintenance_policy {
    recurring_window {
      start_time = "2024-01-01T03:00:00Z"
      end_time   = "2024-01-01T07:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SU"
    }
  }

  # ── Addons ────────────────────────────────────────────────────────────
  addons_config {
    horizontal_pod_autoscaling {
      disabled = false
    }
    http_load_balancing {
      disabled = false
    }
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
    gcs_fuse_csi_driver_config {
      enabled = true  # Mount GCS buckets as file systems
    }
    network_policy_config {
      disabled = false
    }
  }

  # ── Network Policy ───────────────────────────────────────────────────
  network_policy {
    enabled  = true
    provider = "CALICO"
  }

  # ── DNS Config ────────────────────────────────────────────────────────
  dns_config {
    cluster_dns        = "CLOUD_DNS"
    cluster_dns_scope  = "CLUSTER_SCOPE"
    cluster_dns_domain = "cluster.local"
  }

  resource_labels = {
    environment = var.environment
    project     = var.project_name
    managed_by  = "terraform"
  }

  depends_on = [
    google_project_service.apis,
    google_service_networking_connection.private_services,
  ]
}

# ══════════════════════════════════════════════════════════════════════════════
# NODE POOLS
# ══════════════════════════════════════════════════════════════════════════════

# ── System Node Pool ─────────────────────────────────────────────────────────
resource "google_container_node_pool" "system" {
  name     = "system-pool"
  cluster  = google_container_cluster.main.id
  location = var.region

  initial_node_count = var.system_node_count

  autoscaling {
    min_node_count = var.system_node_min_count
    max_node_count = var.system_node_max_count
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.system_machine_type
    disk_size_gb = 50
    disk_type    = "pd-ssd"

    # ── Workload Identity ────────────────────────────────────────────────
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # ── Security ─────────────────────────────────────────────────────────
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    labels = {
      role        = "system"
      environment = var.environment
    }

    taint {
      key    = "CriticalAddonsOnly"
      value  = "true"
      effect = "PREFER_NO_SCHEDULE"
    }
  }
}

# ── Application Node Pool ───────────────────────────────────────────────────
resource "google_container_node_pool" "application" {
  name     = "application-pool"
  cluster  = google_container_cluster.main.id
  location = var.region

  initial_node_count = var.app_node_min_count

  autoscaling {
    min_node_count = var.app_node_min_count
    max_node_count = var.app_node_max_count
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.app_machine_type
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    labels = {
      role        = "application"
      environment = var.environment
    }
  }
}

# ── Preemptible Node Pool (cost optimization, non-production) ────────────────
resource "google_container_node_pool" "preemptible" {
  count    = var.environment != "production" ? 1 : 0
  name     = "preemptible-pool"
  cluster  = google_container_cluster.main.id
  location = var.region

  initial_node_count = 1

  autoscaling {
    min_node_count = 0
    max_node_count = 5
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.app_machine_type
    preemptible  = true
    disk_size_gb = 50
    disk_type    = "pd-standard"

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    labels = {
      role        = "preemptible"
      environment = var.environment
    }

    taint {
      key    = "cloud.google.com/gke-preemptible"
      value  = "true"
      effect = "NO_SCHEDULE"
    }
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# WORKLOAD IDENTITY — Service Account Bindings
# ══════════════════════════════════════════════════════════════════════════════

# ── GCP Service Account for employee-service ─────────────────────────────────
resource "google_service_account" "employee_service" {
  account_id   = "${var.project_name}-employee"
  display_name = "Employee Service Workload Identity"
}

# Grant required permissions
resource "google_project_iam_member" "employee_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.employee_service.email}"
}

resource "google_project_iam_member" "employee_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.employee_service.email}"
}

resource "google_project_iam_member" "employee_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.employee_service.email}"
}

# ── Workload Identity Binding ────────────────────────────────────────────────
resource "google_service_account_iam_member" "employee_workload_identity" {
  service_account_id = google_service_account.employee_service.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[employee-ns/employee-service]"
}
