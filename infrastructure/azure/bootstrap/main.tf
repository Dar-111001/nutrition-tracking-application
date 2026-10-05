data "azurerm_client_config" "current" {}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  resource_group_name  = var.resource_group_name != "" ? var.resource_group_name : "rg-${var.project_name}-tfstate"
  storage_account_name = var.storage_account_name != "" ? var.storage_account_name : substr("st${replace(var.project_name, "-", "")}tfstate${random_string.suffix.result}", 0, 24)

  tags = merge({ project = var.project_name, purpose = "terraform-state", managed-by = "terraform" }, var.tags)
}

module "resource_group" {
  source  = "Azure/avm-res-resources-resourcegroup/azurerm"
  version = "~> 0.4"

  name             = local.resource_group_name
  location         = var.location
  tags             = local.tags
  enable_telemetry = var.enable_telemetry
}

# Private state storage:
#   - no shared keys: Terraform authenticates with your Entra ID login
#   - versioning and soft delete: any earlier state can be restored
#   - TLS 1.2+, no anonymous blob access
module "state_storage" {
  source  = "Azure/avm-res-storage-storageaccount/azurerm"
  version = "~> 0.10"

  name      = local.storage_account_name
  location  = var.location
  parent_id = module.resource_group.resource_id
  tags      = local.tags

  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = var.replication_type

  shared_access_key_enabled       = false
  public_network_access_enabled   = true
  allow_nested_items_to_be_public = false
  min_tls_version                 = "TLS1_2"

  # null = reachable from any network (Entra ID still required);
  # otherwise only from the listed IPs
  network_rules = length(var.allowed_ip_ranges) == 0 ? null : {
    default_action = "Deny"
    bypass         = ["AzureServices"]
    ip_rules       = var.allowed_ip_ranges
  }

  blob_properties = {
    versioning_enabled = true
    delete_retention_policy = {
      enabled = true
      days    = var.blob_retention_days
    }
    container_delete_retention_policy = {
      enabled = true
      days    = var.blob_retention_days
    }
  }

  containers = {
    tfstate = {
      name = var.container_name
    }
  }

  # Whoever runs this bootstrap may read and write the state blobs
  role_assignments = {
    state_writer = {
      role_definition_id_or_name = "Storage Blob Data Contributor"
      principal_id               = data.azurerm_client_config.current.object_id
    }
  }

  enable_telemetry = var.enable_telemetry
}
