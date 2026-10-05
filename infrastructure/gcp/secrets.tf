# The PocketBase passwords never appear in the service definition. They live
# in Secret Manager (a few cents per month) and Cloud Run injects them as
# environment variables when the container starts.

resource "random_password" "pocketbase_admin" {
  length  = 24
  special = false
}

locals {
  pocketbase_admin_password = var.pocketbase_admin_password != "" ? var.pocketbase_admin_password : random_password.pocketbase_admin.result
  app_user_email            = var.app_user_email != "" ? var.app_user_email : var.pocketbase_admin_email
  app_user_password         = var.app_user_password != "" ? var.app_user_password : local.pocketbase_admin_password

  admin_password_secret_id = "${local.name}-pb-admin-password"
  app_password_secret_id   = "${local.name}-app-user-password"
}

module "secrets" {
  source  = "GoogleCloudPlatform/secret-manager/google"
  version = "~> 0.9"

  project_id = local.project_id
  secrets = [
    {
      name        = local.admin_password_secret_id
      secret_data = local.pocketbase_admin_password
    },
    {
      name        = local.app_password_secret_id
      secret_data = local.app_user_password
    },
  ]

  # Only the service's own account may read them
  secret_accessors_list = [module.run_service_account.iam_email]
}
