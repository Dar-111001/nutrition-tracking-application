# One Docker repository for the three images. Push to it with:
#   gcloud auth configure-docker <region>-docker.pkg.dev
#   REGISTRY=<registry_url output> TAG=<image_tag> docker compose build && docker compose push
# Cloud Run pulls from a repository in the same project without extra IAM.

module "artifact_registry" {
  source  = "GoogleCloudPlatform/artifact-registry/google"
  version = "~> 0.8"
  count   = var.create_artifact_registry ? 1 : 0

  project_id    = local.project_id
  location      = var.region
  repository_id = local.name
  format        = "DOCKER"
  description   = "Images for the nutrition app"

  # Keep only the newest versions so storage stays inside the free 0.5 GB
  cleanup_policies = {
    keep-recent = {
      action = "KEEP"
      most_recent_versions = {
        keep_count = var.artifact_registry_keep_count
      }
    }
    delete-rest = {
      action = "DELETE"
      condition = {
        tag_state = "ANY"
      }
    }
  }
}

locals {
  registry_url = "${var.region}-docker.pkg.dev/${local.project_id}/${local.name}"

  app_image        = var.app_image != "" ? var.app_image : "${local.registry_url}/${var.name_prefix}-app:${var.image_tag}"
  api_image        = var.api_image != "" ? var.api_image : "${local.registry_url}/${var.name_prefix}-api:${var.image_tag}"
  pocketbase_image = var.pocketbase_image != "" ? var.pocketbase_image : "${local.registry_url}/${var.name_prefix}-pocketbase:${var.image_tag}"
}
