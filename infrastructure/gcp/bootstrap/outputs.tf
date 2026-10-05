output "project_id" {
  description = "Project ID to put in ../terraform.tfvars."
  value       = local.project_id
}

output "state_bucket_name" {
  description = "Put this in ../backend.hcl as `bucket`."
  value       = module.state_bucket.name
}

output "backend_config" {
  description = "Ready-to-paste contents for ../backend.hcl."
  value       = <<-EOT
    bucket = "${module.state_bucket.name}"
    prefix = "nutrition"
  EOT
}
