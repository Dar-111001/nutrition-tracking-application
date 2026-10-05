variable "project_id" {
  description = "ID of the Google Cloud project. With create_project = true this is the ID the new project gets (globally unique, 6-30 characters)."
  type        = string
}

variable "region" {
  description = "Region for the state bucket, e.g. europe-west1. Use the same region as the main stack."
  type        = string
}

variable "create_project" {
  description = "Create the project with Project Factory. Needs billing_account. Set false to use a project that already exists."
  type        = bool
  default     = false
}

variable "billing_account" {
  description = "Billing account ID (XXXXXX-XXXXXX-XXXXXX) linked to the new project. Only used when create_project = true."
  type        = string
  default     = ""

  validation {
    condition     = !var.create_project || var.billing_account != ""
    error_message = "billing_account is required when create_project is true."
  }
}

variable "project_name" {
  description = "Display name of the new project. Only used when create_project = true."
  type        = string
  default     = "nutrition"
}

variable "org_id" {
  description = "Organization ID to create the project under. Leave empty for a personal account without an organization."
  type        = string
  default     = ""
}

variable "folder_id" {
  description = "Folder ID to create the project in. Leave empty to create it directly under the organization (or with no parent)."
  type        = string
  default     = ""
}

variable "state_bucket_name" {
  description = "Name of the GCS bucket for Terraform state. Bucket names are global, so leave empty to use <project_id>-tfstate."
  type        = string
  default     = ""
}

variable "force_destroy" {
  description = "Allow `terraform destroy` to delete the state bucket even when it still holds state files."
  type        = bool
  default     = false
}

variable "state_versions_to_keep" {
  description = "How many old versions of each state file the bucket keeps."
  type        = number
  default     = 10
}

variable "labels" {
  description = "Extra labels added to the project and the bucket."
  type        = map(string)
  default     = {}
}
