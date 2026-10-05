# The Container App pulls its images with this identity instead of registry
# passwords. It gets AcrPull on the registry (registry.tf) and nothing else.

module "app_identity" {
  source  = "Azure/avm-res-managedidentity-userassignedidentity/azurerm"
  version = "~> 0.5"

  name                = "id-${local.name}"
  location            = var.location
  resource_group_name = module.resource_group.name
  tags                = local.tags
  enable_telemetry    = var.enable_telemetry
}
