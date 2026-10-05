# The nutrition app on Google Cloud: one Cloud Run service running all three
# containers side by side, with PocketBase's data folder on a mounted volume.
#
#   internet -> Cloud Run URL (HTTPS) -> app (nginx :80, ingress container)
#                                          -> api (Node :4000, sidecar)
#                                          -> pocketbase (:8090, sidecar) -> /pb/pb_data volume
#
# Containers in one Cloud Run instance share localhost, just like the single
# ECS task on AWS. The instance count is capped at 1 because SQLite allows a
# single writer.
#
# Files in this folder:
#   network.tf    VPC and subnet (Direct VPC egress for private traffic)
#   iam.tf        Service account the service runs as
#   registry.tf   Artifact Registry repository for the three images
#   secrets.tf    PocketBase passwords in Secret Manager
#   storage.tf    Bucket or Filestore share for the database
#   cloud_run.tf  The Cloud Run service

locals {
  name = "${var.name_prefix}-${var.environment}"

  labels = merge(
    {
      project     = var.name_prefix
      environment = var.environment
      managed-by  = "terraform"
    },
    var.labels,
  )

  use_filestore = var.pocketbase_storage == "filestore"

  # Ports the containers use to talk to each other inside the instance
  app_port        = 80
  api_port        = 4000
  pocketbase_port = 8090
}

# Every API the stack uses. Enabling them is free; the project output below
# waits for them, so nothing is created before its API is on.
module "project_services" {
  source  = "terraform-google-modules/project-factory/google//modules/project_services"
  version = "~> 18.4"
  count   = var.create ? 1 : 0

  project_id = var.project_id
  activate_apis = concat(
    [
      "run.googleapis.com",
      "compute.googleapis.com",
      "iam.googleapis.com",
      "artifactregistry.googleapis.com",
      "secretmanager.googleapis.com",
      "storage.googleapis.com",
      "logging.googleapis.com",
    ],
    local.use_filestore ? ["file.googleapis.com"] : [],
  )

  # Leave APIs on when this stack is destroyed; other things may use them
  disable_services_on_destroy = false
}

locals {
  # try(): with create = false the module is gone, but names still need the ID
  project_id = try(module.project_services[0].project_id, var.project_id)
}
