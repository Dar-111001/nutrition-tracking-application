# =============================================================================
# GCP project and remote state bootstrap: settings
#
# Fill in the values marked <...>, then run (by hand, never in CI):
#   gcloud auth application-default login
#   terraform init && terraform apply
#
# Lines that are commented out have a default. To change one, uncomment it and
# replace "" with your value, written as the variable expects: a quoted string,
# a number, true/false, or a map { key = "value" }.
# =============================================================================

# -----------------------------------------------------------------------------
# Required
# -----------------------------------------------------------------------------

# The project to use. With create_project = true this is the ID the new
# project will get: 6-30 lowercase letters, digits or dashes, unique across
# all of Google Cloud (e.g. "nutrition-demo-4821").
project_id = "<YOUR_GCP_PROJECT_ID>"

# Region for the state bucket. Use the same region as the main stack,
# e.g. "europe-west1" or "us-central1".
region = "<YOUR_GCP_REGION>"

# -----------------------------------------------------------------------------
# Create the project (the "empty account" path)
# -----------------------------------------------------------------------------

# true: create a new project with Project Factory and link billing to it.
# false: use project_id as an existing project (you created it in the console).
# create_project = "" # keep empty for default [false]

# Required when create_project = true. Find it with: gcloud billing accounts list
# billing_account = "" # keep empty for default [none]

# Display name of the new project.
# project_name = "" # keep empty for default [nutrition]

# Organization or folder for the new project. Personal Gmail accounts have
# neither, so leave both empty there. Find yours with: gcloud organizations list
# org_id = "" # keep empty for default [no organization]
# folder_id = "" # keep empty for default [no folder]

# -----------------------------------------------------------------------------
# State bucket
# -----------------------------------------------------------------------------

# Bucket names are global across all of Google Cloud.
# state_bucket_name = "" # keep empty for default [<project_id>-tfstate]

# Lets `terraform destroy` delete the bucket while it still contains state.
# force_destroy = "" # keep empty for default [false]

# Old versions of each state file kept for rollback.
# state_versions_to_keep = "" # keep empty for default [10]

# Extra labels, e.g. { owner = "aws-sbgl", course = "cloud-101" }
# labels = "" # keep empty for default [{}]
