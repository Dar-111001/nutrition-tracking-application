# =============================================================================
# Azure remote state bootstrap: settings
#
# Fill in the values marked <...>, then run (by hand, never in CI):
#   az login
#   terraform init && terraform apply
#
# Lines that are commented out have a default. To change one, uncomment it and
# replace "" with your value, written as the variable expects: a quoted string,
# a number, true/false, a list ["a", "b"] or a map { key = "value" }.
# =============================================================================

# -----------------------------------------------------------------------------
# Required
# -----------------------------------------------------------------------------

# The subscription to use. Find it with: az account show --query id -o tsv
subscription_id = "<YOUR_AZURE_SUBSCRIPTION_ID>"

# Region for the state storage. Use the same region as the main stack,
# e.g. "westeurope" or "eastus".
location = "<YOUR_AZURE_REGION>"

# -----------------------------------------------------------------------------
# Optional
# -----------------------------------------------------------------------------

# Prefix for resource names. Must match project_name in ../terraform.tfvars.
# project_name = "" # keep empty for default [nutrition]

# resource_group_name = "" # keep empty for default [rg-<project_name>-tfstate]

# Storage account names are global across Azure: 3-24 lowercase letters and
# digits. The default adds a random suffix to make it unique.
# storage_account_name = "" # keep empty for default [st<project_name>tfstate<6 random characters>]

# container_name = "" # keep empty for default [tfstate]

# LRS is the cheapest; a state file is a few KB either way.
# replication_type = "" # keep empty for default [LRS]

# Days deleted or overwritten state versions stay restorable.
# blob_retention_days = "" # keep empty for default [30]

# Lock the state storage to your own IPs, e.g. ["203.0.113.7"]. Access always
# needs an Entra ID login with a data role, even when this is empty.
# allowed_ip_ranges = "" # keep empty for default [[] (any network)]

# Anonymous usage telemetry for Azure Verified Modules.
# enable_telemetry = "" # keep empty for default [false]

# Extra tags on every resource, e.g. { owner = "aws-sbgl", course = "cloud-101" }
# tags = "" # keep empty for default [{}]
