# The service runs as its own service account instead of the default compute
# account (which has the broad Editor role). It gets only what it needs:
#   - write logs and metrics (here)
#   - read the two password secrets (secrets.tf)
#   - read and write the data bucket (storage.tf)

module "run_service_account" {
  source  = "terraform-google-modules/service-accounts/google//modules/simple-sa"
  version = "~> 5.1"

  project_id   = local.project_id
  name         = "${local.name}-run"
  display_name = "Nutrition app (Cloud Run)"
  description  = "Runs the nutrition app's Cloud Run service"

  project_roles = [
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ]
}
