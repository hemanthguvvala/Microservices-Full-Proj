# ═══════════════════════════════════════════════════════════════════════════════
# Artifact Registry + Cloud Storage
# ═══════════════════════════════════════════════════════════════════════════════
#
# Interview: "Artifact Registry vs Container Registry vs ECR vs ACR?"
# → Artifact Registry: Multi-format (Docker, Maven, npm, Python, Go).
#   Regional/multi-regional. Vulnerability scanning. IAM-based access.
#   Replaced Container Registry (gcr.io) as the recommended service.
# → ECR: Docker-only. Per-region. Cross-region replication available.
#   Lifecycle policies for image cleanup. Image scanning via Inspector.
# → ACR: Docker, Helm, OCI artifacts. Geo-replication (Premium).
#   ACR Tasks for in-registry builds. Content trust with Notary v2.

# ══════════════════════════════════════════════════════════════════════════════
# ARTIFACT REGISTRY
# ══════════════════════════════════════════════════════════════════════════════

resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "${var.project_name}-${var.environment}-docker"
  description   = "Docker container images for employee platform"
  format        = "DOCKER"
  mode          = "STANDARD_REPOSITORY"

  # ── Cleanup Policies ──────────────────────────────────────────────────
  cleanup_policies {
    id     = "keep-tagged"
    action = "KEEP"
    condition {
      tag_state = "TAGGED"
    }
  }

  cleanup_policies {
    id     = "delete-old-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s"  # 7 days
    }
  }

  # ── Vulnerability Scanning ────────────────────────────────────────────
  docker_config {
    immutable_tags = var.environment == "production"  # Prevent tag overwriting
  }

  labels = {
    environment = var.environment
    project     = var.project_name
  }
}

# ── Maven Repository (for shared Java libraries) ────────────────────────────
resource "google_artifact_registry_repository" "maven" {
  location      = var.region
  repository_id = "${var.project_name}-${var.environment}-maven"
  description   = "Maven artifacts for shared Java libraries"
  format        = "MAVEN"
  mode          = "STANDARD_REPOSITORY"

  maven_config {
    version_policy            = var.environment == "production" ? "RELEASE" : "NONE"
    allow_snapshot_overwrites = var.environment != "production"
  }

  labels = {
    environment = var.environment
    project     = var.project_name
  }
}

# ── IAM: GKE → Artifact Registry (pull images) ──────────────────────────────
resource "google_artifact_registry_repository_iam_member" "gke_reader" {
  location   = google_artifact_registry_repository.docker.location
  repository = google_artifact_registry_repository.docker.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_container_cluster.main.node_config[0].service_account}"
}

# ══════════════════════════════════════════════════════════════════════════════
# CLOUD STORAGE
# ══════════════════════════════════════════════════════════════════════════════

resource "google_storage_bucket" "employee_documents" {
  name          = "${var.project_id}-${var.environment}-employee-docs"
  location      = var.environment == "production" ? "US" : var.region  # Multi-region for prod
  storage_class = var.environment == "production" ? "STANDARD" : "NEARLINE"
  force_destroy = var.environment != "production"

  # ── Versioning ────────────────────────────────────────────────────────
  versioning {
    enabled = true
  }

  # ── Lifecycle Rules ───────────────────────────────────────────────────
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 3
    }
    action {
      type = "Delete"
    }
  }

  # ── Security ──────────────────────────────────────────────────────────
  uniform_bucket_level_access = true  # IAM-only (no ACLs)

  # ── Encryption ────────────────────────────────────────────────────────
  # Default: Google-managed key. Can be CMEK for compliance.

  # ── CORS (for pre-signed URL uploads from frontend) ───────────────────
  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST", "DELETE"]
    response_header = ["Content-Type", "Content-Disposition"]
    max_age_seconds = 3600
  }

  labels = {
    environment = var.environment
    project     = var.project_name
  }
}

# ── Backup Bucket ───────────────────────────────────────────────────────────
resource "google_storage_bucket" "backups" {
  name          = "${var.project_id}-${var.environment}-backups"
  location      = var.environment == "production" ? "US" : var.region
  storage_class = "NEARLINE"
  force_destroy = var.environment != "production"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  uniform_bucket_level_access = true

  labels = {
    environment = var.environment
    purpose     = "backups"
  }
}

# ── IAM: Employee Service → Storage ─────────────────────────────────────────
resource "google_storage_bucket_iam_member" "employee_service_docs" {
  bucket = google_storage_bucket.employee_documents.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.employee_service.email}"
}
