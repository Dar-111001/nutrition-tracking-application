output "app_url" {
  description = "Open this in a browser once the app is running."
  value       = module.container_app.fqdn_url
}

output "pocketbase_admin_url" {
  description = "PocketBase admin UI (log in with the admin email and password)."
  value       = "${module.container_app.fqdn_url}/_/"
}

output "registry_url" {
  description = "Container registry to push images to: REGISTRY=<this> TAG=<image_tag> docker compose build && docker compose push"
  value       = local.registry_server
}

output "resource_group_name" {
  description = "Resource group holding everything (delete it to remove the whole app)."
  value       = module.resource_group.name
}

output "container_app_name" {
  description = "Container App name. Redeploy after pushing new images with: az containerapp update -n <name> -g <resource group> --image ... (or terraform apply with a new image_tag)"
  value       = module.container_app.name
}

output "storage_account_name" {
  description = "Storage account holding the PocketBase file share."
  value       = module.data_storage.name
}

output "vnet_name" {
  description = "Name of the virtual network."
  value       = module.vnet.name
}

output "pocketbase_admin_password" {
  description = "The PocketBase admin password (generated when left empty). Show it with: terraform output -raw pocketbase_admin_password"
  value       = local.pocketbase_admin_password
  sensitive   = true
}
