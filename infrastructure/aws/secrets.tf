# The PocketBase passwords never appear in the task definition. They live in
# SSM Parameter Store as SecureStrings (free for standard parameters) and ECS
# injects them as environment variables when the container starts.

resource "random_password" "pocketbase_admin" {
  length  = 24
  special = false
}

locals {
  pocketbase_admin_password = var.pocketbase_admin_password != "" ? var.pocketbase_admin_password : random_password.pocketbase_admin.result
  app_user_email            = var.app_user_email != "" ? var.app_user_email : var.pocketbase_admin_email
  app_user_password         = var.app_user_password != "" ? var.app_user_password : local.pocketbase_admin_password
}

module "ssm_pocketbase_admin_password" {
  source  = "terraform-aws-modules/ssm-parameter/aws"
  version = "~> 2.1"

  name        = "/${var.project_name}/${var.environment}/PB_ADMIN_PASSWORD"
  description = "PocketBase admin password"
  value       = local.pocketbase_admin_password
  secure_type = true
}

module "ssm_app_user_password" {
  source  = "terraform-aws-modules/ssm-parameter/aws"
  version = "~> 2.1"

  name        = "/${var.project_name}/${var.environment}/APP_USER_PASSWORD"
  description = "Login password for the nutrition app"
  value       = local.app_user_password
  secure_type = true
}
