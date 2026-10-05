variable "subscription_id" {
  description = "ID of the Azure subscription to create the state backend in."
  type        = string
}

variable "location" {
  description = "Azure region for the state storage, e.g. westeurope. Use the same region as the main stack."
  type        = string
}

variable "project_name" {
  description = "Short name used as a prefix for every resource."
  type        = string
  default     = "nutrition"
}

variable "resource_group_name" {
  description = "Name of the resource group for the state storage. Leave empty to use rg-<project_name>-tfstate."
  type        = string
  default     = ""
}

variable "storage_account_name" {
  description = "Name of the storage account (3-24 lowercase letters and digits, globally unique). Leave empty to use st<project_name>tfstate<random suffix>."
  type        = string
  default     = ""
}

variable "container_name" {
  description = "Name of the blob container that holds the state files."
  type        = string
  default     = "tfstate"
}

variable "replication_type" {
  description = "Storage redundancy: LRS (cheapest, 3 copies in one datacenter), ZRS (3 zones) or GRS (second region)."
  type        = string
  default     = "LRS"
}

variable "blob_retention_days" {
  description = "Days deleted or overwritten state versions can still be restored."
  type        = number
  default     = 30
}

variable "allowed_ip_ranges" {
  description = "Public IPs or CIDR ranges allowed to reach the state storage. Leave empty to allow any network (access still needs an Entra ID login with a data role)."
  type        = list(string)
  default     = []
}

variable "enable_telemetry" {
  description = "Send anonymous usage telemetry for the Azure Verified Modules to Microsoft."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Extra tags added to every resource."
  type        = map(string)
  default     = {}
}
