# The Cloud Run service.
#
# Why a plain resource instead of the GoogleCloudPlatform/cloud-run module:
# the module gives every container a port, and Cloud Run allows exactly one
# container with a port (the ingress container). Our api and pocketbase
# sidecars must have none, which the module can't express, so the service
# itself is written out here. Everything around it uses modules.

resource "google_cloud_run_v2_service" "app" {
  project  = local.project_id
  name     = local.name
  location = var.region

  ingress              = "INGRESS_TRAFFIC_ALL"
  invoker_iam_disabled = var.allow_public_access # public URL without an allUsers IAM binding
  deletion_protection  = var.cloud_run_deletion_protection

  template {
    service_account       = module.run_service_account.email
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2" # needed for volume mounts

    # ---- Exactly one instance at most ----
    # SQLite has a single writer, so two instances must never run at once.
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = 1
    }
    max_instance_request_concurrency = 80

    # Private traffic (e.g. to Filestore) goes through our VPC; internet
    # traffic (OpenFoodFacts, image pulls) goes out directly
    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network    = module.vpc.network_name
        subnetwork = local.subnet_name
      }
    }

    # ---- app: nginx, the only container that receives traffic ----
    # Cloud Run sets PORT=80 for it from container_port.
    containers {
      name       = "app"
      image      = local.app_image
      depends_on = ["api"]

      ports {
        container_port = local.app_port
      }

      env {
        name  = "API_URL"
        value = "http://localhost:${local.api_port}"
      }
      env {
        name  = "POCKETBASE_URL"
        value = "http://localhost:${local.pocketbase_port}"
      }
      env {
        name  = "HEALTHCHECK_PATH"
        value = var.healthcheck_path
      }
      env {
        name  = "HEALTHCHECK_PORT"
        value = tostring(var.healthcheck_port)
      }

      resources {
        limits = {
          cpu    = var.app_cpu
          memory = var.app_memory
        }
        cpu_idle          = !var.cpu_always_allocated
        startup_cpu_boost = true
      }

      # Cloud Run's version of the load balancer health check
      startup_probe {
        http_get {
          path = var.healthcheck_path
          port = var.healthcheck_port
        }
        period_seconds    = 5
        timeout_seconds   = 3
        failure_threshold = 24
      }
    }

    # ---- api: Node service, sidecar ----
    containers {
      name       = "api"
      image      = local.api_image
      depends_on = ["pocketbase"]

      env {
        name  = "POCKETBASE_URL"
        value = "http://localhost:${local.pocketbase_port}"
      }
      env {
        name  = "HEALTHCHECK_PATH"
        value = var.api_healthcheck_path
      }
      env {
        name  = "OPENFOODFACTS_URL"
        value = var.openfoodfacts_url
      }
      env {
        name  = "UPSTREAM_TIMEOUT_MS"
        value = tostring(var.upstream_timeout_ms)
      }
      env {
        name  = "FOOD_SEARCH_TIMEOUT_MS"
        value = tostring(var.food_search_timeout_ms)
      }

      resources {
        limits = {
          cpu    = var.api_cpu
          memory = var.api_memory
        }
        cpu_idle = !var.cpu_always_allocated
      }

      # The app container waits until this passes
      startup_probe {
        http_get {
          path = var.api_healthcheck_path
          port = local.api_port
        }
        period_seconds    = 3
        timeout_seconds   = 2
        failure_threshold = 30
      }
    }

    # ---- pocketbase: the database, sidecar ----
    containers {
      name  = "pocketbase"
      image = local.pocketbase_image

      env {
        name  = "PB_PORT"
        value = tostring(local.pocketbase_port)
      }
      env {
        name  = "PB_DATA_DIR"
        value = "/pb/pb_data"
      }
      env {
        name  = "PB_ADMIN_EMAIL"
        value = var.pocketbase_admin_email
      }
      env {
        name  = "APP_USER_EMAIL"
        value = local.app_user_email
      }
      env {
        name = "PB_ADMIN_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = local.admin_password_secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "APP_USER_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = local.app_password_secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "pb-data"
        mount_path = "/pb/pb_data"
      }

      resources {
        limits = {
          cpu    = var.pocketbase_cpu
          memory = var.pocketbase_memory
        }
        cpu_idle = !var.cpu_always_allocated
      }

      # The api container waits until this passes
      startup_probe {
        http_get {
          path = "/api/health"
          port = local.pocketbase_port
        }
        period_seconds    = 3
        timeout_seconds   = 2
        failure_threshold = 40
      }
    }

    # ---- The data volume: a bucket or a Filestore share ----
    volumes {
      name = "pb-data"

      dynamic "gcs" {
        for_each = local.use_filestore ? [] : [1]
        content {
          bucket    = module.data_bucket[0].name
          read_only = false
        }
      }

      dynamic "nfs" {
        for_each = local.use_filestore ? [1] : []
        content {
          server    = google_filestore_instance.pocketbase[0].networks[0].ip_addresses[0]
          path      = "/${google_filestore_instance.pocketbase[0].file_shares[0].name}"
          read_only = false
        }
      }
    }
  }

  # The secrets must be readable before the first revision starts
  depends_on = [module.secrets]
}
