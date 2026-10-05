# The PocketBase passwords are stored as Container App secrets: encrypted by
# the platform, injected as environment variables, never shown in the portal.

resource "random_password" "pocketbase_admin" {
  length  = 24
  special = false
}

locals {
  pocketbase_admin_password = var.pocketbase_admin_password != "" ? var.pocketbase_admin_password : random_password.pocketbase_admin.result
  app_user_email            = var.app_user_email != "" ? var.app_user_email : var.pocketbase_admin_email
  app_user_password         = var.app_user_password != "" ? var.app_user_password : local.pocketbase_admin_password
}
