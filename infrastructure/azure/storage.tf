# PocketBase keeps everything in one SQLite file under /pb/pb_data. A
# replica's disk is wiped when it stops, so that folder is an Azure Files
# share mounted into the pocketbase container.
#
# Why Standard (SMB) Azure Files: it bills per GB used with no minimum, so a
# demo database costs cents. SQLite's byte-range locks don't work over SMB,
# so the share is mounted with `nobrl` (container_app.tf): locks stay local,
# which is safe because only one replica ever runs. Premium NFS shares have
# real locking but start at 100 GB (about 16 USD/month).

module "data_storage" {
  source  = "Azure/avm-res-storage-storageaccount/azurerm"
  version = "~> 0.10"

  name      = var.storage_account_name != "" ? var.storage_account_name : substr("st${local.compact_name}${random_string.suffix.result}", 0, 24)
  location  = var.location
  parent_id = module.resource_group.resource_id
  tags      = local.tags

  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = var.storage_replication_type

  # Azure Files over SMB in Container Apps authenticates with the account key
  shared_access_key_enabled       = true
  public_network_access_enabled   = true
  allow_nested_items_to_be_public = false
  min_tls_version                 = "TLS1_2"

  # Storage firewall: only the Container Apps subnet (via its service endpoint)
  network_rules = var.restrict_storage_to_vnet ? {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    virtual_network_subnet_ids = [local.aca_subnet_id]
  } : null

  shares = {
    pb_data = {
      name             = "pbdata"
      quota            = var.file_share_quota_gb
      enabled_protocol = "SMB"
      access_tier      = "TransactionOptimized"
    }
  }

  enable_telemetry = var.enable_telemetry
}

# The Container Apps environment needs the account key to mount the share.
# It is read from Azure at apply time and kept only in the (private) state.
data "azapi_resource_action" "data_storage_keys" {
  type        = "Microsoft.Storage/storageAccounts@2023-05-01"
  resource_id = module.data_storage.resource_id
  action      = "listKeys"

  sensitive_response_export_values = ["keys"]
}

locals {
  data_storage_key = data.azapi_resource_action.data_storage_keys.sensitive_output.keys[0].value
}
