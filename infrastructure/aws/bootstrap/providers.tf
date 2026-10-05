# ---------------------------------------------------------------------------
# STEP 1 OF 2: REMOTE STATE BOOTSTRAP
#
# This small stack creates the S3 bucket and DynamoDB table that the main
# stack (../) stores its Terraform state in. It has to exist before the main
# stack can run `terraform init`, so it keeps its own state in a local file.
# Run it once per AWS account, by hand (see ../../README.md).
# ---------------------------------------------------------------------------

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.42"
    }
  }

  # Deliberately no backend block: the state for these few resources lives in
  # terraform.tfstate next to this file. Keep that file safe (or commit it to
  # a private place); losing it only means you import the bucket again.
}

provider "aws" {
  region = var.aws_region

  # Refuses to run against any other account, so a wrong profile can't
  # create resources in the wrong place.
  allowed_account_ids = [var.aws_account_id]

  default_tags {
    tags = local.tags
  }
}
