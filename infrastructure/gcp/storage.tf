# PocketBase keeps everything in one SQLite file under /pb/pb_data. A Cloud
# Run instance's disk is wiped when it stops, so that folder is a volume.
#
# Two choices (pocketbase_storage):
#
#   gcs (default): a Cloud Storage bucket mounted with Cloud Storage FUSE.
#     Costs cents per month, no minimum. Trade-off: FUSE is not a real disk.
#     Writes are slower and are uploaded when SQLite syncs, so a crash can
#     lose the last few writes. Fine for a demo with one instance.
#
#   filestore: a managed NFS share (real file locking, like EFS on AWS).
#     Reliable, but the smallest share is 1 TB, about 200 USD/month.

module "data_bucket" {
  source  = "terraform-google-modules/cloud-storage/google//modules/simple_bucket"
  version = "~> 12.4"
  count   = local.use_filestore ? 0 : 1

  project_id = local.project_id
  name       = "${local.project_id}-${local.name}-pb-data"
  location   = var.region

  force_destroy            = var.data_bucket_force_destroy
  bucket_policy_only       = true
  public_access_prevention = "enforced"
  versioning               = false # SQLite rewrites its file constantly; versions would pile up

  iam_members = [
    {
      role   = "roles/storage.objectUser"
      member = module.run_service_account.iam_email
    }
  ]
}

# No terraform-google-modules module exists for Filestore, so this one is a
# plain resource.
resource "google_filestore_instance" "pocketbase" {
  count = local.use_filestore ? 1 : 0

  project  = local.project_id
  name     = "${local.name}-pb-data"
  location = var.filestore_zone != "" ? var.filestore_zone : "${var.region}-b"
  tier     = var.filestore_tier

  file_shares {
    name        = "pbdata"
    capacity_gb = var.filestore_capacity_gb
  }

  networks {
    network = module.vpc.network_name
    modes   = ["MODE_IPV4"]
  }
}
