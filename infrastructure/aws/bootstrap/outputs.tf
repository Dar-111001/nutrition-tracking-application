output "state_bucket_name" {
  description = "Put this in ../backend.hcl as `bucket`."
  value       = module.state_bucket.s3_bucket_id
}

output "lock_table_name" {
  description = "Put this in ../backend.hcl as `dynamodb_table` (empty when no table was created)."
  value       = var.create_dynamodb_lock_table ? module.lock_table.dynamodb_table_id : ""
}

output "backend_config" {
  description = "Ready-to-paste contents for ../backend.hcl."
  value       = <<-EOT
    bucket         = "${module.state_bucket.s3_bucket_id}"
    key            = "${var.project_name}/terraform.tfstate"
    region         = "${var.aws_region}"
    encrypt        = true
    use_lockfile   = true
    %{if var.create_dynamodb_lock_table}dynamodb_table = "${module.lock_table.dynamodb_table_id}"%{endif}
  EOT
}
