# azurerm backend settings for `terraform init -backend-config=backend.hcl`.
# Copy the values from `terraform output backend_config` in ./bootstrap.
# Azure blob leases lock the state by themselves, so no lock table is needed.

subscription_id      = "<YOUR_AZURE_SUBSCRIPTION_ID>"
resource_group_name  = "<RESOURCE_GROUP_FROM_BOOTSTRAP>"
storage_account_name = "<STORAGE_ACCOUNT_FROM_BOOTSTRAP>"
container_name       = "tfstate"
key                  = "nutrition.tfstate"
use_azuread_auth     = true
