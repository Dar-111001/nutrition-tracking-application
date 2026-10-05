output "resource_group_name" {
  description = "Put this in ../backend.hcl as `resource_group_name`."
  value       = module.resource_group.name
}

output "storage_account_name" {
  description = "Put this in ../backend.hcl as `storage_account_name`."
  value       = module.state_storage.name
}

output "container_name" {
  description = "Put this in ../backend.hcl as `container_name`."
  value       = var.container_name
}

output "backend_config" {
  description = "Ready-to-paste contents for ../backend.hcl."
  value       = <<-EOT
    subscription_id      = "${var.subscription_id}"
    resource_group_name  = "${module.resource_group.name}"
    storage_account_name = "${module.state_storage.name}"
    container_name       = "${var.container_name}"
    key                  = "${var.project_name}.tfstate"
    use_azuread_auth     = true
  EOT
}
