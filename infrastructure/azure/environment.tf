# Log Analytics collects the container logs; the Container Apps environment
# is the shared host the app runs in (Consumption plan: pay per use, with a
# monthly free grant of vCPU-seconds and requests).

module "log_analytics" {
  source  = "Azure/avm-res-operationalinsights-workspace/azurerm"
  version = "~> 0.5"
  count   = var.create ? 1 : 0

  name                = "log-${local.name}"
  location            = var.location
  resource_group_name = module.resource_group[0].name
  tags                = local.tags
  enable_telemetry    = var.enable_telemetry

  log_analytics_workspace_sku               = "PerGB2018"
  log_analytics_workspace_retention_in_days = var.log_retention_days
  log_analytics_workspace_daily_quota_gb    = var.log_daily_quota_gb

  # The environment sends logs over the public endpoint (no private link here)
  log_analytics_workspace_internet_ingestion_enabled = "true"
  log_analytics_workspace_internet_query_enabled     = "true"
}

module "container_app_environment" {
  source  = "Azure/avm-res-app-managedenvironment/azurerm"
  version = "~> 0.5"
  count   = var.create ? 1 : 0

  name                = "cae-${local.name}"
  location            = var.location
  resource_group_name = module.resource_group[0].name
  tags                = local.tags
  enable_telemetry    = var.enable_telemetry

  log_analytics_workspace = { resource_id = module.log_analytics[0].resource_id }

  # Workload-profiles environment with only the free Consumption profile:
  # supports a small /27+ subnet and costs nothing until the app runs
  vnet_configuration = {
    infrastructure_subnet_id = local.aca_subnet_id
    internal                 = false # public ingress
  }
  workload_profiles = [
    {
      name                  = "Consumption"
      workload_profile_type = "Consumption"
    }
  ]
  zone_redundant = var.zone_redundant

  # The file share, registered once on the environment and mounted by the app
  storages = {
    pb_data = {
      name                = "pbdata"
      account_key         = local.data_storage_key
      account_key_version = 1
      azure_file = {
        account_name = module.data_storage[0].name
        share_name   = "pbdata"
        access_mode  = "ReadWrite"
      }
    }
  }
}
