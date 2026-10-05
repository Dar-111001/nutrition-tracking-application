# ---------------------------------------------------------------------------
# STEP 2 OF 2: THE APPLICATION
#
# Needs the project and state bucket from ./bootstrap first. Initialise with:
#   terraform init -backend-config=backend.hcl
# ---------------------------------------------------------------------------

terraform {
  required_version = ">= 1.10"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 7.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state in the GCS bucket created by ./bootstrap. Backend blocks
  # can't use variables, so the bucket name comes from backend.hcl.
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region

  default_labels = local.labels
}

provider "google-beta" {
  project = var.project_id
  region  = var.region

  default_labels = local.labels
}
