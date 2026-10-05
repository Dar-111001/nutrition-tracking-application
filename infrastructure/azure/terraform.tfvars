# =============================================================================
# Nutrition app on Azure (Container Apps): settings
#
# This file is the only one you need to edit. Before using it:
#   1. Deploy ./bootstrap once (it creates the state storage).
#   2. Fill in backend.hcl with the bootstrap outputs.
#   3. Replace every <...> value below.
# Then, by hand (never in CI):
#   az login
#   terraform init -backend-config=backend.hcl
#   terraform plan -out=tfplan
#   terraform apply tfplan
#
# Lines that are commented out have a default. To change one, uncomment it and
# replace "" with your value, written as the variable expects: a quoted string,
# a number, true/false, or a map { key = "value" }.
#
# No secrets belong in this file. Leave the passwords empty and Terraform
# generates them and stores them as Container App secrets.
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

# The subscription to deploy into. Find it with: az account show --query id -o tsv
subscription_id = "<YOUR_AZURE_SUBSCRIPTION_ID>"

# Region to deploy into, e.g. "westeurope" or "eastus".
location = "<YOUR_AZURE_REGION>"

# Email of the PocketBase admin account. You log in to the admin UI (/_/)
# with it, and the app login defaults to it too.
pocketbase_admin_email = "<ADMIN_EMAIL>"

# -----------------------------------------------------------------------------
# Naming
# -----------------------------------------------------------------------------

# Prefix for every resource name (2-15 characters). Also names the images in
# the registry (<project_name>-app, -api, -pocketbase).
# project_name = "" # keep empty for default [nutrition]

# Added to resource names so dev and prod can live in one subscription.
# environment = "" # keep empty for default [dev]

# Extra tags on every resource, e.g. { owner = "aws-sbgl", course = "cloud-101" }
# tags = "" # keep empty for default [{}]

# Anonymous usage telemetry for Azure Verified Modules.
# enable_telemetry = "" # keep empty for default [false]

# -----------------------------------------------------------------------------
# Network
# -----------------------------------------------------------------------------

# IP range of the virtual network and of the Container Apps subnet inside it
# (the subnet must be at least a /27).
# vnet_address_space = "" # keep empty for default [10.20.0.0/16]
# aca_subnet_cidr = "" # keep empty for default [10.20.0.0/24]

# Who may open the app. Use your own IP, e.g. "203.0.113.7/32", to keep a demo private.
# ingress_allowed_cidr = "" # keep empty for default [Internet]

# -----------------------------------------------------------------------------
# Container images
# -----------------------------------------------------------------------------

# Create an Azure Container Registry (Basic, about 5 USD/month). Set to false
# only if your images live elsewhere, and then set the three *_image values.
# create_container_registry = "" # keep empty for default [true]

# Registry names are global across Azure: 5-50 letters and digits.
# container_registry_name = "" # keep empty for default [cr<project_name><environment><6 random characters>]

# The tag you pushed with `REGISTRY=... TAG=... docker compose push`.
# image_tag = "" # keep empty for default [latest]

# Full image URIs, only needed for images outside the registry above,
# e.g. "myregistry.azurecr.io/nutrition-app:v1"
# app_image = "" # keep empty for default [<registry>/<project_name>-app:<image_tag>]
# api_image = "" # keep empty for default [<registry>/<project_name>-api:<image_tag>]
# pocketbase_image = "" # keep empty for default [<registry>/<project_name>-pocketbase:<image_tag>]

# -----------------------------------------------------------------------------
# Container app and cost
# -----------------------------------------------------------------------------
# On the Consumption plan you pay only while a replica runs, and the monthly
# free grant usually covers a demo. The maximum replica count is always 1
# (SQLite has a single writer).

# 0 scales to zero when idle (the first request after a pause waits while
# PocketBase starts). 1 keeps a replica running 24/7.
# min_replicas = "" # keep empty for default [0]

# vCPU and memory per container. Together they must form a valid Consumption
# size, with 2Gi of memory per vCPU (the defaults add up to 1 vCPU / 2Gi).
# app_cpu = "" # keep empty for default [0.25]
# app_memory = "" # keep empty for default [0.5Gi]
# api_cpu = "" # keep empty for default [0.25]
# api_memory = "" # keep empty for default [0.5Gi]
# pocketbase_cpu = "" # keep empty for default [0.5]
# pocketbase_memory = "" # keep empty for default [1Gi]

# Spread the environment over availability zones (recreates the environment).
# zone_redundant = "" # keep empty for default [false]

# Log Analytics retention (30-730 days; the first 31 are included) and a
# daily ingestion cap in GB so logs can't run up the bill (-1 = no cap).
# log_retention_days = "" # keep empty for default [30]
# log_daily_quota_gb = "" # keep empty for default [1]

# -----------------------------------------------------------------------------
# Application settings (become container environment variables)
# -----------------------------------------------------------------------------

# PocketBase admin password. Leave it commented out: Terraform generates one,
# stores it as a Container App secret, and shows it with
# `terraform output -raw pocketbase_admin_password`. If you do set it, pass it
# with TF_VAR_pocketbase_admin_password instead of writing it here.
# pocketbase_admin_password = "" # keep empty for default [generated, 24 characters]

# Login for the app itself.
# app_user_email = "" # keep empty for default [same as pocketbase_admin_email]
# app_user_password = "" # keep empty for default [same as the admin password]

# HEALTHCHECK_PATH and HEALTHCHECK_PORT for the frontend container. The
# startup and liveness probes check the same path and port.
# healthcheck_path = "" # keep empty for default [/health]
# healthcheck_port = "" # keep empty for default [80]

# Path of the API's health check (its startup probe).
# api_healthcheck_path = "" # keep empty for default [/api/health]

# Food search backend and timeouts used by the API.
# openfoodfacts_url = "" # keep empty for default [https://world.openfoodfacts.org]
# upstream_timeout_ms = "" # keep empty for default [5000]
# food_search_timeout_ms = "" # keep empty for default [8000]

# -----------------------------------------------------------------------------
# Database storage (Azure Files)
# -----------------------------------------------------------------------------
# PocketBase's SQLite file lives on a Standard (SMB) Azure Files share: billed
# per GB used with no minimum, so a demo database costs cents. It is mounted
# with `nobrl` so SQLite works over SMB, which is safe with a single replica.

# Storage account names are global across Azure: 3-24 lowercase letters and digits.
# storage_account_name = "" # keep empty for default [st<project_name><environment><6 random characters>]

# LRS is the cheapest; ZRS survives a zone outage.
# storage_replication_type = "" # keep empty for default [LRS]

# Maximum share size in GB (you pay for what is used, not the quota).
# file_share_quota_gb = "" # keep empty for default [5]

# Storage firewall: only the Container Apps subnet may reach the share.
# restrict_storage_to_vnet = "" # keep empty for default [true]
