# -----------------------------------------------------------------------------
# Account and naming
# -----------------------------------------------------------------------------

variable "aws_account_id" {
  description = "The 12-digit ID of the AWS account to deploy into."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id must be the 12-digit account number."
  }
}

variable "aws_region" {
  description = "The AWS region to deploy into, e.g. eu-central-1."
  type        = string
}

variable "project_name" {
  description = "Short name used as a prefix for every resource."
  type        = string
  default     = "nutrition"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,19}$", var.project_name))
    error_message = "project_name must be 2-20 lowercase letters, digits or dashes, starting with a letter."
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

# -----------------------------------------------------------------------------
# Network
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "IP range of the VPC. Subnets are carved out of it automatically."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "How many availability zones to spread subnets over. The load balancer needs at least 2."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "az_count must be 2 or 3."
  }
}

variable "enable_nat_gateway" {
  description = "Run the task in private subnets behind a NAT gateway (about 35 USD/month extra). When false, the task runs in public subnets with a public IP, locked down by its security group so only the load balancer can reach it."
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Container images
# -----------------------------------------------------------------------------

variable "create_ecr_repositories" {
  description = "Create one ECR repository per image (nutrition-app, nutrition-api, nutrition-pocketbase)."
  type        = bool
  default     = true
}

variable "ecr_image_tag_mutability" {
  description = "MUTABLE lets you push the same tag (e.g. latest) again; IMMUTABLE forces a new tag for every build."
  type        = string
  default     = "MUTABLE"
}

variable "ecr_force_delete" {
  description = "Let `terraform destroy` delete the ECR repositories even when they still contain images."
  type        = bool
  default     = true
}

variable "ecr_keep_last_images" {
  description = "How many images each ECR repository keeps; older ones are deleted automatically."
  type        = number
  default     = 10
}

variable "image_tag" {
  description = "Tag of the images in the ECR repositories (the TAG you used with `docker compose push`)."
  type        = string
  default     = "latest"
}

variable "app_image" {
  description = "Full image URI for the frontend (nginx). Leave empty to use <ecr nutrition-app repository>:<image_tag>."
  type        = string
  default     = ""

  validation {
    condition     = var.app_image != "" || var.create_ecr_repositories
    error_message = "Set app_image when create_ecr_repositories is false."
  }
}

variable "api_image" {
  description = "Full image URI for the Node API. Leave empty to use <ecr nutrition-api repository>:<image_tag>."
  type        = string
  default     = ""

  validation {
    condition     = var.api_image != "" || var.create_ecr_repositories
    error_message = "Set api_image when create_ecr_repositories is false."
  }
}

variable "pocketbase_image" {
  description = "Full image URI for PocketBase. Leave empty to use <ecr nutrition-pocketbase repository>:<image_tag>."
  type        = string
  default     = ""

  validation {
    condition     = var.pocketbase_image != "" || var.create_ecr_repositories
    error_message = "Set pocketbase_image when create_ecr_repositories is false."
  }
}

# -----------------------------------------------------------------------------
# ECS task
# -----------------------------------------------------------------------------

variable "task_cpu" {
  description = "CPU units for the whole task (all three containers share it). 256 = 0.25 vCPU."
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Memory in MiB for the whole task. Must be a valid Fargate pairing with task_cpu."
  type        = number
  default     = 1024
}

variable "cpu_architecture" {
  description = "X86_64, or ARM64 (Graviton, about 20% cheaper; the images must be built for arm64)."
  type        = string
  default     = "X86_64"

  validation {
    condition     = contains(["X86_64", "ARM64"], var.cpu_architecture)
    error_message = "cpu_architecture must be X86_64 or ARM64."
  }
}

variable "use_fargate_spot" {
  description = "Run the task on Fargate Spot (about 70% cheaper, but AWS can stop it with two minutes notice)."
  type        = bool
  default     = false
}

variable "enable_execute_command" {
  description = "Allow `aws ecs execute-command` to open a shell inside the running containers."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "Days CloudWatch keeps the container logs."
  type        = number
  default     = 14
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
  description = "Path the load balancer checks on the frontend (HEALTHCHECK_PATH). It asks the API, which also checks PocketBase."
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
  description = "Path of the API's own container health check."
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
# Load balancer
# -----------------------------------------------------------------------------

variable "certificate_arn" {
  description = "ARN of an ACM certificate. When set, the load balancer serves HTTPS on 443 and redirects HTTP to it."
  type        = string
  default     = ""
}

variable "alb_ingress_cidr" {
  description = "Who may reach the load balancer. 0.0.0.0/0 is the whole internet."
  type        = string
  default     = "0.0.0.0/0"
}

variable "alb_deletion_protection" {
  description = "Stop the load balancer from being deleted (also blocks `terraform destroy`)."
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Database storage (EFS)
# -----------------------------------------------------------------------------

variable "efs_enable_backups" {
  description = "Turn on daily AWS Backup snapshots of the PocketBase data (a few cents per GB per month)."
  type        = bool
  default     = true
}

variable "efs_transition_to_ia" {
  description = "Move files not read for this long to the cheaper Infrequent Access class. One of AFTER_1_DAY, AFTER_7_DAYS, AFTER_14_DAYS, AFTER_30_DAYS, AFTER_60_DAYS, AFTER_90_DAYS, or NONE to never move them."
  type        = string
  default     = "AFTER_30_DAYS"
}

# -----------------------------------------------------------------------------
# Monitoring
# -----------------------------------------------------------------------------

variable "enable_container_insights" {
  description = "Turn on CloudWatch Container Insights (detailed CPU, memory and network metrics; billed per metric)."
  type        = bool
  default     = false
}
