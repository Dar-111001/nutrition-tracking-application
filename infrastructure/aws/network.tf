# A VPC with one public and one private subnet per availability zone.
#
# Cost note: a NAT gateway is the most expensive part of a small VPC (about
# 35 USD/month plus traffic). By default there is none: the task runs in a
# public subnet with a public IP so it can pull images and call OpenFoodFacts,
# and its security group only accepts traffic from the load balancer. Set
# enable_nat_gateway = true to move the task into the private subnets instead.

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.7"

  name = local.name
  cidr = var.vpc_cidr
  azs  = local.azs

  # /24 subnets: 10.0.0.0/24, 10.0.1.0/24 ... public; 10.0.10.0/24 ... private
  public_subnets  = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnets = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, i + 10)]

  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = true # one NAT for all zones keeps the bill down

  enable_dns_hostnames = true
  enable_dns_support   = true
}

locals {
  task_subnet_ids       = var.enable_nat_gateway ? module.vpc.private_subnets : module.vpc.public_subnets
  task_assign_public_ip = !var.enable_nat_gateway
}
