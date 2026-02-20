# ═══════════════════════════════════════════════════════════════════════════════
# GCP Terraform — Main Configuration
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "GCP vs AWS vs Azure networking model?"
# → GCP: Global VPC (spans all regions natively), subnets are regional.
#   Auto-mode vs custom-mode. Uses Shared VPC for multi-project isolation.
# → AWS: VPC is regional. Subnets are AZ-scoped. Transit Gateway for
#   cross-VPC/cross-region. No native global VPC.
# → Azure: VNet is regional. VNet peering for cross-region. Global VNet
#   peering supported. Hub-spoke topology common.
#
# Interview: "How do you manage Terraform state in GCP?"
# → GCS backend with state locking via Cloud Storage object locking.
#   Enable versioning on the bucket for state recovery.
#   Use Workload Identity Federation for keyless auth in CI/CD.

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.10"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.10"
    }
  }

  # ── Remote State in GCS ─────────────────────────────────────────────────
  backend "gcs" {
    bucket = "employee-platform-terraform-state"
    prefix = "gcp/terraform.tfstate"
  }
}

# ── Providers ────────────────────────────────────────────────────────────────
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ── Enable Required APIs ────────────────────────────────────────────────────
resource "google_project_service" "apis" {
  for_each = toset([
    "container.googleapis.com",           # GKE
    "sqladmin.googleapis.com",            # Cloud SQL
    "redis.googleapis.com",               # Memorystore
    "pubsub.googleapis.com",              # Pub/Sub
    "artifactregistry.googleapis.com",    # Artifact Registry
    "secretmanager.googleapis.com",       # Secret Manager
    "monitoring.googleapis.com",          # Cloud Monitoring
    "logging.googleapis.com",             # Cloud Logging
    "cloudresourcemanager.googleapis.com",# Resource Manager
    "iam.googleapis.com",                 # IAM
    "servicenetworking.googleapis.com",   # VPC peering for Cloud SQL
    "compute.googleapis.com",             # Compute Engine (GKE nodes)
  ])

  project = var.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy         = false
}

# ══════════════════════════════════════════════════════════════════════════════
# VPC NETWORK
# ══════════════════════════════════════════════════════════════════════════════

resource "google_compute_network" "main" {
  name                    = "${var.project_name}-${var.environment}-vpc"
  auto_create_subnetworks = false  # Custom mode — full control over CIDR ranges
  routing_mode            = "GLOBAL"

  depends_on = [google_project_service.apis]
}

# ── GKE Subnet ───────────────────────────────────────────────────────────────
resource "google_compute_subnetwork" "gke" {
  name          = "${var.project_name}-${var.environment}-gke-subnet"
  ip_cidr_range = var.gke_subnet_cidr
  region        = var.region
  network       = google_compute_network.main.id

  # ── Secondary Ranges for GKE Pods and Services ─────────────────────────
  # Interview: "Why separate IP ranges for pods/services?"
  # → GKE VPC-native clusters use alias IPs. Separate ranges avoid
  #   IP exhaustion on the node subnet and enable network policy
  #   enforcement at the pod level.
  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = var.gke_pod_cidr
  }

  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = var.gke_service_cidr
  }

  private_ip_google_access = true  # Access Google APIs without external IP

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# ── Private Services Access (for Cloud SQL, Memorystore) ─────────────────────
resource "google_compute_global_address" "private_services" {
  name          = "${var.project_name}-${var.environment}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_services" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_services.name]

  depends_on = [google_project_service.apis]
}

# ── Cloud Router + NAT (for private GKE nodes to pull images) ────────────────
resource "google_compute_router" "main" {
  name    = "${var.project_name}-${var.environment}-router"
  region  = var.region
  network = google_compute_network.main.id
}

resource "google_compute_router_nat" "main" {
  name   = "${var.project_name}-${var.environment}-nat"
  router = google_compute_router.main.name
  region = var.region

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.gke.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# ── Firewall Rules ───────────────────────────────────────────────────────────
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.project_name}-${var.environment}-allow-internal"
  network = google_compute_network.main.id

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [
    var.gke_subnet_cidr,
    var.gke_pod_cidr,
    var.gke_service_cidr,
  ]
}

resource "google_compute_firewall" "deny_all_ingress" {
  name     = "${var.project_name}-${var.environment}-deny-all-ingress"
  network  = google_compute_network.main.id
  priority = 65534

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
}
