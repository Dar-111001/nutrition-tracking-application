# PocketBase keeps everything in one SQLite file under /pb/pb_data. Fargate
# disks are wiped when a task stops, so that folder is an EFS file system.
#
# Why EFS: it is the only Fargate volume that survives task restarts, it is
# NFS (real file locking, which SQLite needs), and it bills per GB stored. A
# demo database of a few MB costs well under 1 USD/month, with no minimum.

module "efs" {
  source  = "terraform-aws-modules/efs/aws"
  version = "~> 2.2"
  count   = var.create ? 1 : 0

  name           = "${local.name}-pocketbase"
  creation_token = "${local.name}-pocketbase"
  encrypted      = true

  # Bursting throughput is free; provisioned throughput is billed per MiB/s
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  # Files nobody read for a while move to the cheaper IA class, and back on first access
  lifecycle_policy = {
    transition_to_ia                    = var.efs_transition_to_ia != "NONE" ? var.efs_transition_to_ia : null
    transition_to_primary_storage_class = var.efs_transition_to_ia != "NONE" ? "AFTER_1_ACCESS" : null
  }

  # One mount target per zone, in the private subnets (reachable from the
  # public ones too, since they share the VPC)
  mount_targets = { for i, az in local.azs : az => { subnet_id = module.vpc[0].private_subnets[i] } }

  security_group_name   = "${local.name}-efs"
  security_group_vpc_id = module.vpc[0].vpc_id
  security_group_ingress_rules = {
    vpc = {
      description = "NFS from inside the VPC"
      cidr_ipv4   = module.vpc[0].vpc_cidr_block
    }
  }

  # Only encrypted connections through a mount target are allowed (module default policy)
  attach_policy = true

  enable_backup_policy = var.efs_enable_backups
}
