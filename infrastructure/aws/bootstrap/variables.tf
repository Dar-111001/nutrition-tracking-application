variable "aws_account_id" {
  description = "The 12-digit ID of the AWS account to create the state backend in."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id must be the 12-digit account number."
  }
}

variable "aws_region" {
  description = "The AWS region for the state bucket and lock table (use the same region as the main stack)."
  type        = string
}

variable "project_name" {
  description = "Short name used as a prefix for every resource."
  type        = string
  default     = "nutrition"
}

variable "state_bucket_name" {
  description = "Name of the S3 bucket for Terraform state. Bucket names are global, so leave empty to use <project_name>-tfstate-<account_id>-<region>."
  type        = string
  default     = ""
}

variable "create_dynamodb_lock_table" {
  description = "Create a DynamoDB table for state locking. Terraform 1.10+ can lock with the S3 bucket alone (use_lockfile), so this is optional."
  type        = bool
  default     = true
}

variable "lock_table_name" {
  description = "Name of the DynamoDB lock table. Leave empty to use <project_name>-tfstate-lock."
  type        = string
  default     = ""
}

variable "force_destroy" {
  description = "Allow `terraform destroy` to delete the state bucket even when it still holds state files. Keep false unless you are tearing everything down."
  type        = bool
  default     = false
}

variable "noncurrent_version_retention_days" {
  description = "How many days old state versions are kept before S3 deletes them."
  type        = number
  default     = 90
}

variable "tags" {
  description = "Extra tags added to every resource."
  type        = map(string)
  default     = {}
}
