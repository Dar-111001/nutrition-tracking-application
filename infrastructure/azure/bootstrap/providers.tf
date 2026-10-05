# ---------------------------------------------------------------------------
# STEP 1 OF 2: REMOTE STATE BOOTSTRAP
#
# Creates a resource group, a storage account and a blob container that the
# main stack (../) stores its Terraform state in. It has to exist before the
# main stack can run `terraform init`, so it keeps its own state in a local
# file. Run it once per subscription, by hand (see ../../README.md).
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

  # Deliberately no backend block: the state for these few resources lives in
  # terraform.tfstate next to this file. Keep that file safe.
}

provider "azurerm" {
  subscription_id = var.subscription_id
  features {}

  # Talk to blob storage with your Entra ID login instead of account keys
  storage_use_azuread = true
}

provider "azapi" {
  subscription_id = var.subscription_id
}
