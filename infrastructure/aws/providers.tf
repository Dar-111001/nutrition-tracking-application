# ---------------------------------------------------------------------------
# STEP 2 OF 2: THE APPLICATION
#
# Needs the state bucket from ./bootstrap first. Initialise with:
#   terraform init -backend-config=backend.hcl
# ---------------------------------------------------------------------------

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.42"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state in the S3 bucket created by ./bootstrap. Backend blocks can't
  # use variables, so the bucket name, key and region come from backend.hcl.
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  # Refuses to run against any other account, so a wrong profile can't
  # deploy into the wrong place.
  allowed_account_ids = [var.aws_account_id]

  default_tags {
    tags = local.tags
  }
}
