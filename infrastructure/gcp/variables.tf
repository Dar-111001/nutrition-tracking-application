# -----------------------------------------------------------------------------
# On/off switch
# -----------------------------------------------------------------------------

variable "create" {
  description = "true creates (or keeps) the whole application. false deletes every resource of this stack on the next apply. The state backend from ./bootstrap is not touched."
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Project and naming
# -----------------------------------------------------------------------------

variable "project_id" {
  description = "ID of the Google Cloud project (the one ./bootstrap created or used)."
  type        = string
}

variable "region" {
  description = "Region to deploy into, e.g. europe-west1."
  type        = string
}

variable "name_prefix" {
  description = "Short name used as a prefix for every resource."
  type        = string
  default     = "nutrition"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,19}$", var.name_prefix))
    error_message = "name_prefix must be 2-20 lowercase letters, digits or dashes, starting with a letter."
  }
}

variable "environment" {
  description = "Environment name added to resource names, e.g. dev or prod."
  type        = string
  default     = "dev"
}

variable "labels" {
  description = "Extra labels added to every resource."
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Network
# -----------------------------------------------------------------------------

variable "subnet_cidr" {
  description = "IP range of the subnet Cloud Run sends private traffic through (Direct VPC egress)."
  type        = string
  default     = "10.10.0.0/24"
}

# -----------------------------------------------------------------------------
# Container images
# -----------------------------------------------------------------------------

variable "create_artifact_registry" {
  description = "Create an Artifact Registry Docker repository for the three images."
  type        = bool
  default     = true
}

variable "artifact_registry_keep_count" {
  description = "How many versions of each image the repository keeps; older ones are cleaned up."
  type        = number
  default     = 10
}

variable "image_tag" {
  description = "Tag of the images in the Artifact Registry repository."
  type        = string
  default     = "latest"
}

variable "app_image" {
  description = "Full image URI for the frontend (nginx). Leave empty to use <artifact registry>/<name_prefix>-app:<image_tag>."
  type        = string
  default     = ""

  validation {
    condition     = var.app_image != "" || var.create_artifact_registry
    error_message = "Set app_image when create_artifact_registry is false."
  }
}

variable "api_image" {
  description = "Full image URI for the Node API. Leave empty to use <artifact registry>/<name_prefix>-api:<image_tag>."
  type        = string
  default     = ""

  validation {
    condition     = var.api_image != "" || var.create_artifact_registry
    error_message = "Set api_image when create_artifact_registry is false."
  }
}

variable "pocketbase_image" {
  description = "Full image URI for PocketBase. Leave empty to use <artifact registry>/<name_prefix>-pocketbase:<image_tag>."
  type        = string
  default     = ""

  validation {
    condition     = var.pocketbase_image != "" || var.create_artifact_registry
    error_message = "Set pocketbase_image when create_artifact_registry is false."
  }
}

# -----------------------------------------------------------------------------
# Cloud Run service
# -----------------------------------------------------------------------------

variable "min_instances" {
  description = "Instances kept warm. 0 scales to zero when idle (cheapest; the first request after a pause waits a few seconds). The maximum is always 1, because SQLite has a single writer."
  type        = number
  default     = 0

  validation {
    condition     = var.min_instances == 0 || var.min_instances == 1
    error_message = "min_instances must be 0 or 1."
  }
}

variable "cpu_always_allocated" {
  description = "Keep CPU allocated between requests (instance-based billing). false bills CPU only while a request is handled."
  type        = bool
  default     = false
}

variable "app_cpu" {
  description = "CPU limit of the frontend (nginx) container."
  type        = string
  default     = "1"
}

variable "app_memory" {
  description = "Memory limit of the frontend (nginx) container."
  type        = string
  default     = "512Mi"
}

variable "api_cpu" {
  description = "CPU limit of the Node API container."
  type        = string
  default     = "1"
}

variable "api_memory" {
  description = "Memory limit of the Node API container."
  type        = string
  default     = "512Mi"
}

variable "pocketbase_cpu" {
  description = "CPU limit of the PocketBase container."
  type        = string
  default     = "1"
}

variable "pocketbase_memory" {
  description = "Memory limit of the PocketBase container."
  type        = string
  default     = "512Mi"
}

variable "allow_public_access" {
  description = "Let anyone on the internet open the app. false requires an authenticated request with the run.invoker role."
  type        = bool
  default     = true
}

variable "cloud_run_deletion_protection" {
  description = "Stop Terraform from deleting the Cloud Run service (also blocks `terraform destroy`)."
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Application settings (passed to the containers as environment variables)
# -----------------------------------------------------------------------------

variable "pocketbase_admin_email" {
  description = "Email of the PocketBase admin account (admin UI at /_/)."
  type        = string
}

variable "pocketbase_admin_password" {
  description = "Password of the PocketBase admin account. Leave empty to generate a random one (read it with `terraform output -raw pocketbase_admin_password`)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "app_user_email" {
  description = "Login email for the app itself. Leave empty to reuse the admin email."
  type        = string
  default     = ""
}

variable "app_user_password" {
  description = "Login password for the app itself. Leave empty to reuse the admin password."
  type        = string
  default     = ""
  sensitive   = true
}

variable "healthcheck_path" {
  description = "Path Cloud Run's startup probe checks on the frontend (HEALTHCHECK_PATH). It asks the API, which also checks PocketBase."
  type        = string
  default     = "/health"

  validation {
    condition     = startswith(var.healthcheck_path, "/")
    error_message = "healthcheck_path must start with /."
  }
}

variable "healthcheck_port" {
  description = "Port the frontend answers the health check on (HEALTHCHECK_PORT). 80 is the app port itself; any other port opens a health-check-only listener."
  type        = number
  default     = 80
}

variable "api_healthcheck_path" {
  description = "Path of the API's health check (used for its startup probe)."
  type        = string
  default     = "/api/health"
}

variable "openfoodfacts_url" {
  description = "Base URL of the OpenFoodFacts API the food search uses."
  type        = string
  default     = "https://world.openfoodfacts.org"
}

variable "upstream_timeout_ms" {
  description = "How long the API waits for PocketBase before giving up, in milliseconds."
  type        = number
  default     = 5000
}

variable "food_search_timeout_ms" {
  description = "How long the API waits for OpenFoodFacts before giving up, in milliseconds."
  type        = number
  default     = 8000
}

# -----------------------------------------------------------------------------
# Database storage
# -----------------------------------------------------------------------------

variable "pocketbase_storage" {
  description = "Where PocketBase's data folder lives: gcs (a Cloud Storage bucket mounted with Cloud Storage FUSE, cents per month) or filestore (a managed NFS share, about 200 USD/month minimum)."
  type        = string
  default     = "gcs"

  validation {
    condition     = contains(["gcs", "filestore"], var.pocketbase_storage)
    error_message = "pocketbase_storage must be gcs or filestore."
  }
}

variable "data_bucket_force_destroy" {
  description = "Let Terraform delete the data bucket even when it still holds the database (gcs storage only). Needed for create = false to remove everything; set false to protect the data."
  type        = bool
  default     = true
}

variable "filestore_tier" {
  description = "Filestore tier (filestore storage only). BASIC_HDD is the cheapest."
  type        = string
  default     = "BASIC_HDD"
}

variable "filestore_capacity_gb" {
  description = "Filestore share size in GB (filestore storage only). 1024 is the minimum for BASIC_HDD."
  type        = number
  default     = 1024
}

variable "filestore_zone" {
  description = "Zone for the Filestore instance (filestore storage only). Leave empty to use <region>-b."
  type        = string
  default     = ""
}
