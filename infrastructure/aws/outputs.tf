output "app_url" {
  description = "Open this in a browser once the service is healthy."
  value       = try("${local.https_enabled ? "https" : "http"}://${module.alb[0].dns_name}", null)
}

output "pocketbase_admin_url" {
  description = "PocketBase admin UI (log in with the admin email and password)."
  value       = try("${local.https_enabled ? "https" : "http"}://${module.alb[0].dns_name}/_/", null)
}

output "alb_dns_name" {
  description = "DNS name of the load balancer, for a CNAME or Route 53 alias record."
  value       = try(module.alb[0].dns_name, null)
}

output "alb_zone_id" {
  description = "Hosted zone ID of the load balancer, for a Route 53 alias record."
  value       = try(module.alb[0].zone_id, null)
}

output "registry_url" {
  description = "ECR registry to push images to: REGISTRY=<this> TAG=<image_tag> docker compose build && docker compose push"
  value       = local.ecr_urls["app"] != "" ? split("/", local.ecr_urls["app"])[0] : ""
}

output "ecr_repository_urls" {
  description = "ECR repository URL per image."
  value       = { for k, m in module.ecr : k => m.repository_url }
}

output "ecs_cluster_name" {
  description = "ECS cluster name (for `aws ecs` commands)."
  value       = try(module.ecs_cluster[0].name, null)
}

output "ecs_service_name" {
  description = "ECS service name. Redeploy after pushing new images with: aws ecs update-service --cluster <cluster> --service <service> --force-new-deployment"
  value       = try(module.ecs_service[0].name, null)
}

output "efs_file_system_id" {
  description = "EFS file system holding the PocketBase data."
  value       = try(module.efs[0].id, null)
}

output "vpc_id" {
  description = "ID of the VPC."
  value       = try(module.vpc[0].vpc_id, null)
}

output "pocketbase_admin_password_ssm_parameter" {
  description = "SSM parameter holding the admin password: aws ssm get-parameter --with-decryption --name <this>"
  value       = try(module.ssm_pocketbase_admin_password[0].ssm_parameter_name, null)
}

output "pocketbase_admin_password" {
  description = "The PocketBase admin password (generated when left empty). Show it with: terraform output -raw pocketbase_admin_password"
  value       = local.pocketbase_admin_password
  sensitive   = true
}
