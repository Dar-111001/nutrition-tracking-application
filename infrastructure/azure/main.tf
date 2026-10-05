# The nutrition app on Azure: one Container App running all three containers
# side by side, in a VNet-integrated Container Apps environment, with
# PocketBase's data folder on an Azure Files share.
#
#   internet -> https://<app>.<env>.azurecontainerapps.io -> app (nginx :80)
#                                                              -> api (Node :4000)
#                                                              -> pocketbase (:8090) -> Azure Files share
#
# Containers in one Container App replica share localhost, just like the
# single ECS task on AWS. The replica count is capped at 1 because SQLite
# allows a single writer.
#
# Files in this folder:
#   network.tf        VNet, subnet, network security group
#   identity.tf       Managed identity the app pulls images with
#   registry.tf       Azure Container Registry for the three images
#   storage.tf        Storage account and file share for the database
#   environment.tf    Log Analytics and the Container Apps environment
#   container_app.tf  The Container App

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  name = "${var.project_name}-${var.environment}"

  # Storage accounts and registries allow only letters and digits
  compact_name = replace(local.name, "-", "")

  tags = merge(
    {
      project     = var.project_name
      environment = var.environment
      managed-by  = "terraform"
    },
    var.tags,
  )

  # Ports the containers use to talk to each other inside the replica
  app_port        = 80
  api_port        = 4000
  pocketbase_port = 8090
}

module "resource_group" {
  source  = "Azure/avm-res-resources-resourcegroup/azurerm"
  version = "~> 0.4"
  count   = var.create ? 1 : 0

  name             = "rg-${local.name}"
  location         = var.location
  tags             = local.tags
  enable_telemetry = var.enable_telemetry
}
