# =============================================================================
# Nutrition app on Google Cloud (Cloud Run): settings
#
# This file is the only one you need to edit. Before using it:
#   1. Deploy ./bootstrap once (it creates the project and the state bucket).
#   2. Fill in backend.hcl with the bootstrap outputs.
#   3. Replace every <...> value below.
# Then, by hand (never in CI):
#   gcloud auth application-default login
#   terraform init -backend-config=backend.hcl
#   terraform plan -out=tfplan
#   terraform apply tfplan
#
# Lines that are commented out have a default. To change one, uncomment it and
# replace "" with your value, written as the variable expects: a quoted string,
# a number, true/false, or a map { key = "value" }.
#
# No secrets belong in this file. Leave the passwords empty and Terraform
# generates them and stores them in Secret Manager.
# =============================================================================

# -----------------------------------------------------------------------------
# Required
# -----------------------------------------------------------------------------

# The project ID (the `project_id` output of ./bootstrap).
project_id = "<YOUR_GCP_PROJECT_ID>"

# Region to deploy into, e.g. "europe-west1" or "us-central1". Pick one of
# Cloud Run's Tier 1 regions for the lowest price.
region = "<YOUR_GCP_REGION>"

# Email of the PocketBase admin account. You log in to the admin UI (/_/)
# with it, and the app login defaults to it too.
pocketbase_admin_email = "<ADMIN_EMAIL>"

# -----------------------------------------------------------------------------
# Naming
# -----------------------------------------------------------------------------

# Prefix for every resource name. Also names the Artifact Registry repository
# and the images in it (<name_prefix>-app, -api, -pocketbase).
# name_prefix = "" # keep empty for default [nutrition]

# Added to resource names so dev and prod can live in one project.
# environment = "" # keep empty for default [dev]

# Extra labels on every resource, e.g. { owner = "aws-sbgl", course = "cloud-101" }
# labels = "" # keep empty for default [{}]

# -----------------------------------------------------------------------------
# Network
# -----------------------------------------------------------------------------

# IP range of the subnet Cloud Run uses for private traffic.
# subnet_cidr = "" # keep empty for default [10.10.0.0/24]

# -----------------------------------------------------------------------------
# Container images
# -----------------------------------------------------------------------------

# Create an Artifact Registry repository. Set to false only if your images
# live in another registry, and then set the three *_image values.
# create_artifact_registry = "" # keep empty for default [true]

# Each image keeps only this many versions; older ones are cleaned up.
# artifact_registry_keep_count = "" # keep empty for default [10]

# The tag you pushed with `REGISTRY=... TAG=... docker compose push`.
# image_tag = "" # keep empty for default [latest]

# Full image URIs, only needed for images outside the repository above,
# e.g. "europe-west1-docker.pkg.dev/my-project/nutrition/nutrition-app:v1"
# app_image = "" # keep empty for default [<region>-docker.pkg.dev/<project_id>/<name_prefix>-<environment>/<name_prefix>-app:<image_tag>]
# api_image = "" # keep empty for default [<region>-docker.pkg.dev/<project_id>/<name_prefix>-<environment>/<name_prefix>-api:<image_tag>]
# pocketbase_image = "" # keep empty for default [<region>-docker.pkg.dev/<project_id>/<name_prefix>-<environment>/<name_prefix>-pocketbase:<image_tag>]

# -----------------------------------------------------------------------------
# Cloud Run service and cost
# -----------------------------------------------------------------------------
# With the defaults the service scales to zero and CPU is billed only while
# a request is handled, so a demo usually stays inside the free tier. The
# maximum instance count is always 1 (SQLite has a single writer).

# 0 scales to zero when idle (the first request after a pause waits a few
# seconds while PocketBase starts). 1 keeps one instance warm, billed 24/7.
# min_instances = "" # keep empty for default [0]

# true keeps CPU allocated between requests (instance-based billing).
# cpu_always_allocated = "" # keep empty for default [false]

# CPU and memory per container, e.g. "1" / "512Mi" or "2" / "1Gi".
# app_cpu = "" # keep empty for default [1]
# app_memory = "" # keep empty for default [512Mi]
# api_cpu = "" # keep empty for default [1]
# api_memory = "" # keep empty for default [512Mi]
# pocketbase_cpu = "" # keep empty for default [1]
# pocketbase_memory = "" # keep empty for default [512Mi]

# false makes the URL require an identity token with the run.invoker role.
# allow_public_access = "" # keep empty for default [true]

# Stop Terraform from deleting the service (also blocks `terraform destroy`).
# cloud_run_deletion_protection = "" # keep empty for default [false]

# -----------------------------------------------------------------------------
# Application settings (become container environment variables)
# -----------------------------------------------------------------------------

# PocketBase admin password. Leave it commented out: Terraform generates one,
# stores it in Secret Manager, and shows it with
# `terraform output -raw pocketbase_admin_password`. If you do set it, pass it
# with TF_VAR_pocketbase_admin_password instead of writing it here.
# pocketbase_admin_password = "" # keep empty for default [generated, 24 characters]

# Login for the app itself.
# app_user_email = "" # keep empty for default [same as pocketbase_admin_email]
# app_user_password = "" # keep empty for default [same as the admin password]

# HEALTHCHECK_PATH and HEALTHCHECK_PORT for the frontend container. Cloud
# Run's startup probe checks the same path and port.
# healthcheck_path = "" # keep empty for default [/health]
# healthcheck_port = "" # keep empty for default [80]

# Path of the API's health check (its startup probe).
# api_healthcheck_path = "" # keep empty for default [/api/health]

# Food search backend and timeouts used by the API.
# openfoodfacts_url = "" # keep empty for default [https://world.openfoodfacts.org]
# upstream_timeout_ms = "" # keep empty for default [5000]
# food_search_timeout_ms = "" # keep empty for default [8000]

# -----------------------------------------------------------------------------
# Database storage
# -----------------------------------------------------------------------------
# PocketBase's SQLite file needs storage that outlives the instance.
#
#   "gcs" (default, cheapest): a Cloud Storage bucket mounted with Cloud
#     Storage FUSE. Cents per month. FUSE is not a real disk: writes are
#     slower and a crash can lose the last few writes. Good for a demo.
#   "filestore": a managed NFS share with real file locking, the closest
#     match to EFS on AWS. Reliable, but the smallest share (1 TB BASIC_HDD)
#     costs about 200 USD/month.
# pocketbase_storage = "" # keep empty for default [gcs]

# Let `terraform destroy` delete the data bucket with the database in it.
# data_bucket_force_destroy = "" # keep empty for default [false]

# Filestore settings (only used with pocketbase_storage = "filestore").
# filestore_tier = "" # keep empty for default [BASIC_HDD]
# filestore_capacity_gb = "" # keep empty for default [1024]
# filestore_zone = "" # keep empty for default [<region>-b]
