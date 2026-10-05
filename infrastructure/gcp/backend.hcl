# GCS backend settings for `terraform init -backend-config=backend.hcl`.
# Copy the values from `terraform output backend_config` in ./bootstrap.
# GCS locks the state by itself, so no lock table is needed.

bucket = "<STATE_BUCKET_NAME_FROM_BOOTSTRAP>"
prefix = "nutrition"
