# -----------------------------------------------------------------------------
# Subscription and naming
# -----------------------------------------------------------------------------

variable "subscription_id" {
  description = "ID of the Azure subscription to deploy into."
  type        = string
}

variable "location" {
  description = "Azure region to deploy into, e.g. westeurope."
  type        = string
}

variable "project_name" {
  description = "Short name used as a prefix for every resource."
  type        = string
  default     = "nutrition"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,14}$", var.project_name))
    error_message = "project_name must be 2-15 lowercase letters, digits or dashes, starting with a letter."
  }
}

variable "environment" {
  description = "Environment name added to resource names, e.g. dev or prod."
  type        = string
  default     = "dev"
}

variable "tags" {
  description = "Extra tags added to every resource."
  type        = map(string)
  default     = {}
}

variable "enable_telemetry" {
  description = "Send anonymous usage telemetry for the Azure Verified Modules to Microsoft."
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Network
# -----------------------------------------------------------------------------

variable "vnet_address_space" {
  description = "IP range of the virtual network."
  type        = string
  default     = "10.20.0.0/16"
}

variable "aca_subnet_cidr" {
  description = "Subnet for the Container Apps environment (at least /27, delegated to Microsoft.App/environments)."
  type        = string
  default     = "10.20.0.0/24"
}

variable "ingress_allowed_cidr" {
  description = "Who may reach the app (NSG rule on the environment subnet). Internet means everyone."
  type        = string
  default     = "Internet"
}

# -----------------------------------------------------------------------------
# Container images
# -----------------------------------------------------------------------------

variable "create_container_registry" {
  description = "Create an Azure Container Registry (Basic SKU, about 5 USD/month) for the three images."
  type        = bool
  default     = true
}

variable "container_registry_name" {
  description = "Name of the registry (5-50 letters and digits, globally unique). Leave empty to use cr<project_name><environment><random suffix>."
  type        = string
  default     = ""
}

variable "image_tag" {
  description = "Tag of the images in the container registry."
  type        = string
  default     = "latest"
}

variable "app_image" {
  description = "Full image URI for the frontend (nginx). Leave empty to use <registry>/nutrition-app:<image_tag>."
  type        = string
  default     = ""

  validation {
    condition     = var.app_image != "" || var.create_container_registry
    error_message = "Set app_image when create_container_registry is false."
  }
}

variable "api_image" {
  description = "Full image URI for the Node API. Leave empty to use <registry>/nutrition-api:<image_tag>."
  type        = string
  default     = ""

  validation {
    condition     = var.api_image != "" || var.create_container_registry
    error_message = "Set api_image when create_container_registry is false."
  }
}

variable "pocketbase_image" {
  description = "Full image URI for PocketBase. Leave empty to use <registry>/nutrition-pocketbase:<image_tag>."
  type        = string
  default     = ""

  validation {
    condition     = var.pocketbase_image != "" || var.create_container_registry
    error_message = "Set pocketbase_image when create_container_registry is false."
  }
}

# -----------------------------------------------------------------------------
# Container app
# -----------------------------------------------------------------------------

variable "min_replicas" {
  description = "Replicas kept running. 0 scales to zero when idle (cheapest). The maximum is always 1, because SQLite has a single writer."
  type        = number
  default     = 0

  validation {
    condition     = var.min_replicas == 0 || var.min_replicas == 1
    error_message = "min_replicas must be 0 or 1."
  }
}

variable "app_cpu" {
  description = "vCPU for the frontend (nginx) container. The three containers together must match a valid Consumption size (e.g. 1 vCPU / 2Gi in total)."
  type        = number
  default     = 0.25
}

variable "app_memory" {
  description = "Memory for the frontend (nginx) container (2Gi per vCPU)."
  type        = string
  default     = "0.5Gi"
}

variable "api_cpu" {
  description = "vCPU for the Node API container."
  type        = number
  default     = 0.25
}

variable "api_memory" {
  description = "Memory for the Node API container."
  type        = string
  default     = "0.5Gi"
}

variable "pocketbase_cpu" {
  description = "vCPU for the PocketBase container."
  type        = number
  default     = 0.5
}

variable "pocketbase_memory" {
  description = "Memory for the PocketBase container."
  type        = string
  default     = "1Gi"
}

variable "zone_redundant" {
  description = "Spread the Container Apps environment over availability zones. Changing it recreates the environment."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "Days Log Analytics keeps the container logs (30-730; up to 31 days is included in the price)."
  type        = number
  default     = 30
}

variable "log_daily_quota_gb" {
  description = "Daily ingestion cap for Log Analytics in GB, so a noisy container can't run up the bill. -1 means no cap."
  type        = number
  default     = 1
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
  description = "Path the startup and liveness probes check on the frontend (HEALTHCHECK_PATH). It asks the API, which also checks PocketBase."
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
# Database storage (Azure Files)
# -----------------------------------------------------------------------------

variable "storage_account_name" {
  description = "Name of the storage account for the PocketBase data (3-24 lowercase letters and digits, globally unique). Leave empty to use st<project_name><environment><random suffix>."
  type        = string
  default     = ""
}

variable "storage_replication_type" {
  description = "Redundancy of the data share: LRS (cheapest) or ZRS (survives a zone outage)."
  type        = string
  default     = "LRS"
}

variable "file_share_quota_gb" {
  description = "Maximum size of the PocketBase file share in GB. Standard shares bill for what is used, not for the quota."
  type        = number
  default     = 5
}

variable "restrict_storage_to_vnet" {
  description = "Only let the Container Apps subnet reach the data share (storage firewall + service endpoint). false allows any network that has the account key."
  type        = bool
  default     = true
}
