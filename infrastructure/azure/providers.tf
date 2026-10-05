# ---------------------------------------------------------------------------
# STEP 2 OF 2: THE APPLICATION
#
# Needs the state storage from ./bootstrap first. Initialise with:
#   terraform init -backend-config=backend.hcl
# ---------------------------------------------------------------------------

terraform {
  required_version = ">= 1.10"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.37"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state in the storage account created by ./bootstrap. Backend
  # blocks can't use variables, so the names come from backend.hcl.
  backend "azurerm" {}
}

provider "azurerm" {
  subscription_id = var.subscription_id
  features {}

  # An empty subscription has no resource providers registered yet. Register
  # only the ones this stack uses.
  resource_provider_registrations = "core"
  resource_providers_to_register = [
    "Microsoft.App",
    "Microsoft.ContainerRegistry",
    "Microsoft.ManagedIdentity",
    "Microsoft.Network",
    "Microsoft.OperationalInsights",
    "Microsoft.Storage",
  ]
}

provider "azapi" {
  subscription_id = var.subscription_id
}
