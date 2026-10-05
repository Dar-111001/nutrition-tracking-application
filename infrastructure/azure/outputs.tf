output "app_url" {
  description = "Open this in a browser once the app is running."
  value       = try(module.container_app[0].fqdn_url, null)
}

output "pocketbase_admin_url" {
  description = "PocketBase admin UI (log in with the admin email and password)."
  value       = try("${module.container_app[0].fqdn_url}/_/", null)
}

output "registry_url" {
  description = "Container registry to push images to: REGISTRY=<this> TAG=<image_tag> docker compose build && docker compose push"
  value       = var.create ? local.registry_server : null
}

output "resource_group_name" {
  description = "Resource group holding everything (delete it to remove the whole app)."
  value       = try(module.resource_group[0].name, null)
}

output "container_app_name" {
  description = "Container App name. Redeploy after pushing new images with: az containerapp update -n <name> -g <resource group> --image ... (or terraform apply with a new image_tag)"
  value       = try(module.container_app[0].name, null)
}

output "storage_account_name" {
  description = "Storage account holding the PocketBase file share."
  value       = try(module.data_storage[0].name, null)
}

output "vnet_name" {
  description = "Name of the virtual network."
  value       = try(module.vnet[0].name, null)
}

output "pocketbase_admin_password" {
  description = "The PocketBase admin password (generated when left empty). Show it with: terraform output -raw pocketbase_admin_password"
  value       = local.pocketbase_admin_password
  sensitive   = true
}
