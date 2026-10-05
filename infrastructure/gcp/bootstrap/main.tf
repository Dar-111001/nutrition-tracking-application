locals {
  state_bucket_name = var.state_bucket_name != "" ? var.state_bucket_name : "${var.project_id}-tfstate"
  labels            = merge({ purpose = "terraform-state", managed-by = "terraform" }, var.labels)
}

# ---- The project (only when create_project = true) ----
# A brand new project linked to your billing account. The default compute
# service account is disabled so nothing runs with its broad Editor role.
module "project" {
  source  = "terraform-google-modules/project-factory/google"
  version = "~> 18.4"
  count   = var.create_project ? 1 : 0

  name              = var.project_name
  project_id        = var.project_id
  random_project_id = false
  org_id            = var.org_id != "" ? var.org_id : null
  folder_id         = var.folder_id
  billing_account   = var.billing_account
  labels            = var.labels

  default_service_account = "disable"
  auto_create_network     = false
  deletion_policy         = "DELETE"

  activate_apis = ["storage.googleapis.com", "cloudresourcemanager.googleapis.com", "serviceusage.googleapis.com"]
}

# ---- Or: just make sure the Storage API is on in an existing project ----
module "project_services" {
  source  = "terraform-google-modules/project-factory/google//modules/project_services"
  version = "~> 18.4"
  count   = var.create_project ? 0 : 1

  project_id                  = var.project_id
  activate_apis               = ["storage.googleapis.com", "cloudresourcemanager.googleapis.com", "serviceusage.googleapis.com"]
  disable_services_on_destroy = false
}

locals {
  project_id = var.create_project ? module.project[0].project_id : module.project_services[0].project_id
}

# ---- The state bucket ----
# Private (public access prevented), uniform IAM, versioned so any earlier
# state can be restored. A state file is a few KB: this costs nothing.
module "state_bucket" {
  source  = "terraform-google-modules/cloud-storage/google//modules/simple_bucket"
  version = "~> 12.4"

  project_id = local.project_id
  name       = local.state_bucket_name
  location   = var.region
  labels     = local.labels

  force_destroy            = var.force_destroy
  bucket_policy_only       = true
  public_access_prevention = "enforced"
  versioning               = true

  lifecycle_rules = [
    {
      action    = { type = "Delete" }
      condition = { num_newer_versions = var.state_versions_to_keep, with_state = "ARCHIVED" }
    }
  ]
}
