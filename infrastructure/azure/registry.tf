# Azure Container Registry for the three images. Push to it with:
#   az acr login --name <registry name>
#   REGISTRY=<registry_url output> TAG=<image_tag> docker compose build && docker compose push
#
# Basic SKU (about 5 USD/month, 10 GB included) is plenty for three images.
# Premium-only features (zone redundancy, retention, export policy) are off.

module "container_registry" {
  source  = "Azure/avm-res-containerregistry-registry/azurerm"
  version = "~> 0.8"
  count   = var.create && var.create_container_registry ? 1 : 0

  name                = var.container_registry_name != "" ? var.container_registry_name : substr("cr${local.compact_name}${random_string.suffix.result}", 0, 50)
  location            = var.location
  resource_group_name = module.resource_group[0].name
  tags                = local.tags
  enable_telemetry    = var.enable_telemetry

  sku                           = "Basic"
  admin_enabled                 = false
  public_network_access_enabled = true
  zone_redundancy_enabled       = false
  export_policy_enabled         = true
  retention_policy_in_days      = null

  role_assignments = {
    app_pull = {
      role_definition_id_or_name = "AcrPull"
      principal_id               = module.app_identity[0].principal_id
      principal_type             = "ServicePrincipal"
    }
  }
}

locals {
  # try(): the registry doesn't exist when create or create_container_registry is false
  registry_server = try(module.container_registry[0].login_server, "")

  app_image        = var.app_image != "" ? var.app_image : "${local.registry_server}/${var.project_name}-app:${var.image_tag}"
  api_image        = var.api_image != "" ? var.api_image : "${local.registry_server}/${var.project_name}-api:${var.image_tag}"
  pocketbase_image = var.pocketbase_image != "" ? var.pocketbase_image : "${local.registry_server}/${var.project_name}-pocketbase:${var.image_tag}"
}
