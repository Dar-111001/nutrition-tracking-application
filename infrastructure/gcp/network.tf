# A custom VPC with one subnet. Cloud Run is serverless and reaches the
# internet on its own, so the VPC only carries private traffic (Direct VPC
# egress, PRIVATE_RANGES_ONLY): that is how the service reaches a Filestore
# share. Direct VPC egress has no connector to pay for, so this costs nothing.

module "vpc" {
  source  = "terraform-google-modules/network/google"
  version = "~> 18.3"

  project_id   = local.project_id
  network_name = local.name
  routing_mode = "REGIONAL"

  subnets = [
    {
      subnet_name           = "${local.name}-run"
      subnet_ip             = var.subnet_cidr
      subnet_region         = var.region
      subnet_private_access = "true" # reach Google APIs without public IPs
    }
  ]
}

locals {
  subnet_name = "${local.name}-run"
}
