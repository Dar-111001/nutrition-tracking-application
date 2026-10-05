# The Container App: three containers in one replica, sharing localhost.

locals {
  # Settings every probe shares
  probe_defaults = {
    transport        = "HTTP"
    interval_seconds = 5
    timeout          = 3
  }
}

module "container_app" {
  source  = "Azure/avm-res-app-containerapp/azurerm"
  version = "~> 0.9"

  name                                  = "ca-${local.name}"
  location                              = var.location
  resource_group_name                   = module.resource_group.name
  resource_group_id                     = module.resource_group.resource_id
  container_app_environment_resource_id = module.container_app_environment.resource_id
  workload_profile_name                 = "Consumption"
  revision_mode                         = "Single"
  tags                                  = local.tags
  enable_telemetry                      = var.enable_telemetry

  # ---- Identity and registry ----
  managed_identities = {
    user_assigned_resource_ids = [module.app_identity.resource_id]
  }
  registries = var.create_container_registry ? [
    {
      server   = local.registry_server
      identity = module.app_identity.resource_id
    }
  ] : null

  # ---- Secrets (become env vars via secret_name, never shown in the portal) ----
  secrets = {
    pb_admin_password = {
      name  = "pb-admin-password"
      value = local.pocketbase_admin_password
    }
    app_user_password = {
      name  = "app-user-password"
      value = local.app_user_password
    }
  }

  # ---- Public HTTPS endpoint (HTTP redirects to HTTPS) ----
  ingress = {
    external_enabled           = true
    target_port                = local.app_port
    transport                  = "auto"
    allow_insecure_connections = false
    traffic_weight = [
      {
        latest_revision = true
        percentage      = 100
      }
    ]
  }

  template = {
    # ---- Exactly one replica at most ----
    # SQLite has a single writer, so two replicas must never run at once.
    # 0 lets the app scale to zero when nobody uses it.
    min_replicas = var.min_replicas
    max_replicas = 1

    containers = [
      # ---- app: nginx, receives the traffic ----
      {
        name   = "app"
        image  = local.app_image
        cpu    = var.app_cpu
        memory = var.app_memory
        env = [
          { name = "PORT", value = tostring(local.app_port) },
          { name = "API_URL", value = "http://localhost:${local.api_port}" },
          { name = "POCKETBASE_URL", value = "http://localhost:${local.pocketbase_port}" },
          { name = "HEALTHCHECK_PATH", value = var.healthcheck_path },
          { name = "HEALTHCHECK_PORT", value = tostring(var.healthcheck_port) },
        ]
        # The startup probe waits for the whole chain (nginx -> API -> PocketBase);
        # the liveness probe restarts the replica if it stops answering
        startup_probes = [merge(local.probe_defaults, {
          path                    = var.healthcheck_path
          port                    = var.healthcheck_port
          failure_count_threshold = 10
          initial_delay           = 5
        })]
        liveness_probes = [merge(local.probe_defaults, {
          path                    = var.healthcheck_path
          port                    = var.healthcheck_port
          interval_seconds        = 30
          failure_count_threshold = 5
        })]
      },

      # ---- api: Node service ----
      {
        name   = "api"
        image  = local.api_image
        cpu    = var.api_cpu
        memory = var.api_memory
        env = [
          { name = "PORT", value = tostring(local.api_port) },
          { name = "POCKETBASE_URL", value = "http://localhost:${local.pocketbase_port}" },
          { name = "HEALTHCHECK_PATH", value = var.api_healthcheck_path },
          { name = "OPENFOODFACTS_URL", value = var.openfoodfacts_url },
          { name = "UPSTREAM_TIMEOUT_MS", value = tostring(var.upstream_timeout_ms) },
          { name = "FOOD_SEARCH_TIMEOUT_MS", value = tostring(var.food_search_timeout_ms) },
        ]
        startup_probes = [merge(local.probe_defaults, {
          path                    = var.api_healthcheck_path
          port                    = local.api_port
          failure_count_threshold = 10
        })]
      },

      # ---- pocketbase: the database ----
      {
        name   = "pocketbase"
        image  = local.pocketbase_image
        cpu    = var.pocketbase_cpu
        memory = var.pocketbase_memory
        env = [
          { name = "PB_PORT", value = tostring(local.pocketbase_port) },
          { name = "PB_DATA_DIR", value = "/pb/pb_data" },
          { name = "PB_ADMIN_EMAIL", value = var.pocketbase_admin_email },
          { name = "APP_USER_EMAIL", value = local.app_user_email },
          { name = "PB_ADMIN_PASSWORD", secret_name = "pb-admin-password" },
          { name = "APP_USER_PASSWORD", secret_name = "app-user-password" },
        ]
        volume_mounts = [
          { name = "pb-data", path = "/pb/pb_data" }
        ]
        startup_probes = [merge(local.probe_defaults, {
          path                    = "/api/health"
          port                    = local.pocketbase_port
          failure_count_threshold = 10
        })]
      },
    ]

    volumes = [
      {
        name         = "pb-data"
        storage_type = "AzureFile"
        storage_name = "pbdata" # the environment storage from environment.tf
        # nobrl: keep SQLite's locks local (SMB can't do them); safe with one replica
        mount_options = "dir_mode=0777,file_mode=0777,uid=0,gid=0,mfsymlinks,nobrl,cache=none"
      }
    ]
  }

  # The file share must be registered on the environment and the AcrPull role
  # granted before the first replica starts
  depends_on = [module.container_app_environment, module.container_registry]
}
