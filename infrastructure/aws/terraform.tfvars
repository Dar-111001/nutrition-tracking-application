# =============================================================================
# Nutrition app on AWS (ECS Fargate): settings
#
# This file is the only one you need to edit. Before using it:
#   1. Deploy ./bootstrap once (it creates the state bucket).
#   2. Fill in backend.hcl with the bootstrap outputs.
#   3. Replace every <...> value below.
# Then, by hand (never in CI):
#   terraform init -backend-config=backend.hcl
#   terraform plan -out=tfplan
#   terraform apply tfplan
#
# Lines that are commented out have a default. To change one, uncomment it and
# replace "" with your value, written as the variable expects: a quoted string,
# a number, true/false, a list ["a", "b"] or a map { key = "value" }.
#
# No secrets belong in this file. Leave the passwords empty and Terraform
# generates them and stores them in SSM Parameter Store.
# =============================================================================

# -----------------------------------------------------------------------------
# On/off switch
# -----------------------------------------------------------------------------

# true: create (or keep) the whole application.
# false: the next `terraform plan` / `terraform apply` deletes every resource
#   of this stack (database storage included, so the data is gone). Set it
#   back to true to rebuild everything. The state backend from ./bootstrap is
#   deliberately left alone: Terraform needs it to remember what to delete.
# create = "" # keep empty for default [true]

# -----------------------------------------------------------------------------
# Required
# -----------------------------------------------------------------------------

# The 12-digit AWS account number. Terraform refuses to touch any other account.
# Find it with: aws sts get-caller-identity --query Account --output text
aws_account_id = "<YOUR_AWS_ACCOUNT_ID>"

# Region to deploy into, e.g. "eu-central-1" (Frankfurt) or "us-east-1".
aws_region = "<YOUR_AWS_REGION>"

# Email of the PocketBase admin account. You log in to the admin UI (/_/)
# with it, and the app login defaults to it too.
pocketbase_admin_email = "<ADMIN_EMAIL>"

# -----------------------------------------------------------------------------
# Account and naming
# -----------------------------------------------------------------------------

# Prefix for every resource name. Also used for the ECR repository names
# (<project_name>-app, -api, -pocketbase), so keep it in line with
# docker-compose.yml if you change it.
# project_name = "" # keep empty for default [nutrition]

# Added to resource names so dev and prod can live in one account.
# environment = "" # keep empty for default [dev]

# Extra tags on every resource, e.g. { Owner = "aws-sbgl", Course = "cloud-101" }
# tags = "" # keep empty for default [{}]

# -----------------------------------------------------------------------------
# Network
# -----------------------------------------------------------------------------

# IP range of the new VPC. Change it only if it clashes with a network you
# want to peer with.
# vpc_cidr = "" # keep empty for default [10.0.0.0/16]

# Availability zones to use (2 or 3). The load balancer needs at least 2.
# az_count = "" # keep empty for default [2]

# false (cheapest): the task runs in a public subnet with a public IP, and its
#   security group only lets the load balancer in.
# true: the task runs in a private subnet behind a NAT gateway, which adds
#   about 35 USD/month. Choose this when a private task is a requirement.
# enable_nat_gateway = "" # keep empty for default [false]

# -----------------------------------------------------------------------------
# Container images
# -----------------------------------------------------------------------------

# Create ECR repositories for the three images. Set to false only if your
# images live in another registry, and then set the three *_image values.
# create_ecr_repositories = "" # keep empty for default [true]

# MUTABLE lets you push "latest" again; IMMUTABLE forces a new tag per build
# (safer for production, since a tag then always means the same image).
# ecr_image_tag_mutability = "" # keep empty for default [MUTABLE]

# Let `terraform destroy` delete repositories that still hold images.
# ecr_force_delete = "" # keep empty for default [true]

# Each repository keeps only this many images; older ones are deleted.
# ecr_keep_last_images = "" # keep empty for default [10]

# The tag you pushed with `REGISTRY=... TAG=... docker compose push`.
# image_tag = "" # keep empty for default [latest]

# Full image URIs, only needed for images that are not in the ECR repositories
# above, e.g. "123456789012.dkr.ecr.eu-central-1.amazonaws.com/nutrition-app:v1"
# app_image = "" # keep empty for default [<ECR nutrition-app repository>:<image_tag>]
# api_image = "" # keep empty for default [<ECR nutrition-api repository>:<image_tag>]
# pocketbase_image = "" # keep empty for default [<ECR nutrition-pocketbase repository>:<image_tag>]

# -----------------------------------------------------------------------------
# ECS task size and cost
# -----------------------------------------------------------------------------

# CPU and memory for the whole task (the three containers share it). The
# default 0.5 vCPU / 1 GB costs about 18 USD/month on Fargate. 256 / 512 is
# the smallest valid size (about 9 USD/month) and is enough for a demo.
# task_cpu = "" # keep empty for default [512]
# task_memory = "" # keep empty for default [1024]

# ARM64 (Graviton) is about 20% cheaper, but the images must be built for
# arm64: docker buildx build --platform linux/arm64 ...
# cpu_architecture = "" # keep empty for default [X86_64]

# Fargate Spot is about 70% cheaper, but AWS may stop the task with two
# minutes notice (it restarts by itself). Fine for a demo, not for production.
# use_fargate_spot = "" # keep empty for default [false]

# Allow `aws ecs execute-command --interactive --command sh` into the containers.
# enable_execute_command = "" # keep empty for default [false]

# How long CloudWatch keeps container logs, in days.
# log_retention_days = "" # keep empty for default [14]

# Detailed CloudWatch metrics for the cluster (billed per metric).
# enable_container_insights = "" # keep empty for default [false]

# -----------------------------------------------------------------------------
# Application settings (become container environment variables)
# -----------------------------------------------------------------------------

# PocketBase admin password. Leave it commented out: Terraform generates one,
# stores it in SSM, and shows it with `terraform output -raw pocketbase_admin_password`.
# If you do set it, pass it with TF_VAR_pocketbase_admin_password instead of
# writing it here.
# pocketbase_admin_password = "" # keep empty for default [generated, 24 characters]

# Login for the app itself.
# app_user_email = "" # keep empty for default [same as pocketbase_admin_email]
# app_user_password = "" # keep empty for default [same as the admin password]

# HEALTHCHECK_PATH and HEALTHCHECK_PORT for the frontend container. The load
# balancer target group checks the same path and port, so changing them here
# reconfigures both with no code change.
# healthcheck_path = "" # keep empty for default [/health]
# healthcheck_port = "" # keep empty for default [80]

# Path of the API container's own health check.
# api_healthcheck_path = "" # keep empty for default [/api/health]

# Food search backend and timeouts used by the API.
# openfoodfacts_url = "" # keep empty for default [https://world.openfoodfacts.org]
# upstream_timeout_ms = "" # keep empty for default [5000]
# food_search_timeout_ms = "" # keep empty for default [8000]

# -----------------------------------------------------------------------------
# Load balancer
# -----------------------------------------------------------------------------

# ARN of an ACM certificate for your domain. When set, the app is served on
# HTTPS and HTTP redirects to it. Request one for free in ACM (same region).
# certificate_arn = "" # keep empty for default [HTTP only]

# Who may open the app. Use your own IP, e.g. "203.0.113.7/32", to keep a demo private.
# alb_ingress_cidr = "" # keep empty for default [0.0.0.0/0]

# Protect the load balancer from deletion (also blocks `terraform destroy`).
# alb_deletion_protection = "" # keep empty for default [false]

# -----------------------------------------------------------------------------
# Database storage (EFS)
# -----------------------------------------------------------------------------
# PocketBase's SQLite file lives on EFS: the only Fargate storage that
# survives restarts, NFS-based (SQLite needs its file locking), billed per GB
# with no minimum. A demo database costs well under 1 USD/month.

# Daily AWS Backup snapshots of the database.
# efs_enable_backups = "" # keep empty for default [true]

# Move files nobody read for this long to the cheaper Infrequent Access class.
# Use "NONE" to keep everything in the Standard class.
# efs_transition_to_ia = "" # keep empty for default [AFTER_30_DAYS]
