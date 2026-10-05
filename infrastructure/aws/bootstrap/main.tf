locals {
  state_bucket_name = var.state_bucket_name != "" ? var.state_bucket_name : "${var.project_name}-tfstate-${var.aws_account_id}-${var.aws_region}"
  lock_table_name   = var.lock_table_name != "" ? var.lock_table_name : "${var.project_name}-tfstate-lock"

  tags = merge(
    {
      Project   = var.project_name
      Purpose   = "terraform-state"
      ManagedBy = "terraform"
    },
    var.tags,
  )
}

# Private, encrypted, versioned bucket. Versioning means a bad apply or a
# corrupted state file can always be rolled back to an earlier version.
module "state_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 5.16"

  bucket        = local.state_bucket_name
  force_destroy = var.force_destroy

  # Nobody outside the account, and nothing over plain HTTP
  block_public_acls                     = true
  block_public_policy                   = true
  ignore_public_acls                    = true
  restrict_public_buckets               = true
  attach_deny_insecure_transport_policy = true
  control_object_ownership              = true
  object_ownership                      = "BucketOwnerEnforced"

  versioning = {
    enabled = true
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }

  # Old state versions are tiny, but don't keep them forever
  lifecycle_rule = [
    {
      id      = "expire-old-state-versions"
      enabled = true
      filter  = {}
      noncurrent_version_expiration = {
        noncurrent_days = var.noncurrent_version_retention_days
      }
    }
  ]
}

# On-demand billing: a lock table that is idle almost all the time costs
# nothing beyond a few cents.
module "lock_table" {
  source  = "terraform-aws-modules/dynamodb-table/aws"
  version = "~> 5.5"

  create_table = var.create_dynamodb_lock_table

  name         = local.lock_table_name
  hash_key     = "LockID"
  billing_mode = "PAY_PER_REQUEST"

  attributes = [
    {
      name = "LockID"
      type = "S"
    }
  ]

  server_side_encryption_enabled = true
  point_in_time_recovery_enabled = false
}
