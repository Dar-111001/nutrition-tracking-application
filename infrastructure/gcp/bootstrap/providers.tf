# ---------------------------------------------------------------------------
# STEP 1 OF 2: PROJECT AND REMOTE STATE BOOTSTRAP
#
# Creates (optionally) the Google Cloud project itself, then the GCS bucket
# that the main stack (../) stores its Terraform state in. It has to exist
# before the main stack can run `terraform init`, so it keeps its own state
# in a local file. Run it once, by hand (see ../../README.md).
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
  }

  # Deliberately no backend block: the state for these few resources lives in
  # terraform.tfstate next to this file. Keep that file safe.
}

provider "google" {
  region = var.region
}

provider "google-beta" {
  region = var.region
}
