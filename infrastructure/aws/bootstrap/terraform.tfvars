# =============================================================================
# AWS remote state bootstrap: settings
#
# Fill in the values marked <...>, then run (by hand, never in CI):
#   terraform init && terraform apply
# Everything that is commented out has a default; uncomment a line only to
# change it.
# =============================================================================

# -----------------------------------------------------------------------------
# Required
# -----------------------------------------------------------------------------

# The 12-digit AWS account number (top right of the AWS console, or
# `aws sts get-caller-identity --query Account --output text`).
aws_account_id = "<YOUR_AWS_ACCOUNT_ID>"

# Region for the state bucket. Use the same region as the main stack,
# e.g. "eu-central-1" or "us-east-1".
aws_region = "<YOUR_AWS_REGION>"

# -----------------------------------------------------------------------------
# Optional
# -----------------------------------------------------------------------------

# Prefix for resource names. Must match project_name in ../terraform.tfvars.
# project_name = "" # keep empty for default [nutrition]

# S3 bucket names are global across all AWS customers, so the default adds
# your account id and region to make it unique.
# state_bucket_name = "" # keep empty for default [<project_name>-tfstate-<aws_account_id>-<aws_region>]

# DynamoDB lock table. Terraform 1.10+ can also lock with the bucket alone
# (use_lockfile = true, already set in the generated backend config), so you
# may set this to false to skip the table. It costs cents either way.
# create_dynamodb_lock_table = "" # keep empty for default [true]

# lock_table_name = "" # keep empty for default [<project_name>-tfstate-lock]

# Lets `terraform destroy` delete the bucket while it still contains state.
# Only set to true when you are removing the whole project for good.
# force_destroy = "" # keep empty for default [false]

# Old state versions are kept this many days so you can roll back.
# noncurrent_version_retention_days = "" # keep empty for default [90]

# Extra tags on every resource, e.g. { Owner = "aws-sbgl", Course = "cloud-101" }
# tags = "" # keep empty for default [{}]
