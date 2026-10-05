output "app_url" {
  description = "Open this in a browser once the service is ready."
  value       = google_cloud_run_v2_service.app.uri
}

output "pocketbase_admin_url" {
  description = "PocketBase admin UI (log in with the admin email and password)."
  value       = "${google_cloud_run_v2_service.app.uri}/_/"
}

output "registry_url" {
  description = "Artifact Registry repository to push images to: REGISTRY=<this> TAG=<image_tag> docker compose build && docker compose push"
  value       = local.registry_url
}

output "cloud_run_service_name" {
  description = "Cloud Run service name. Redeploy after pushing new images with: gcloud run services update <name> --region <region> --image ... (or run terraform apply with a new image_tag)"
  value       = google_cloud_run_v2_service.app.name
}

output "service_account_email" {
  description = "Service account the Cloud Run service runs as."
  value       = module.run_service_account.email
}

output "data_location" {
  description = "Where the PocketBase data lives."
  value       = local.use_filestore ? "filestore: ${try(google_filestore_instance.pocketbase[0].name, "")}" : "gs://${try(module.data_bucket[0].name, "")}"
}

output "network_name" {
  description = "Name of the VPC."
  value       = module.vpc.network_name
}

output "pocketbase_admin_password_secret" {
  description = "Secret Manager secret holding the admin password: gcloud secrets versions access latest --secret <this>"
  value       = local.admin_password_secret_id
}

output "pocketbase_admin_password" {
  description = "The PocketBase admin password (generated when left empty). Show it with: terraform output -raw pocketbase_admin_password"
  value       = local.pocketbase_admin_password
  sensitive   = true
}
