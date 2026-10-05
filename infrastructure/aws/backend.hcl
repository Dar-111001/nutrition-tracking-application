# S3 backend settings for `terraform init -backend-config=backend.hcl`.
# Copy the values from `terraform output backend_config` in ./bootstrap.

bucket       = "<STATE_BUCKET_NAME_FROM_BOOTSTRAP>"
key          = "nutrition/terraform.tfstate"
region       = "<YOUR_AWS_REGION>"
encrypt      = true
use_lockfile = true

# Optional: the DynamoDB lock table from ./bootstrap. Terraform 1.10+ locks
# with use_lockfile above, so this line can be removed if you skipped the table.
dynamodb_table = "<LOCK_TABLE_NAME_FROM_BOOTSTRAP>"
