# Infrastructure

Terraform that deploys the nutrition app to the serverless container service of each of the three big clouds, starting from an empty account:

| Cloud | Folder | Runs on | Database storage |
|-------|--------|---------|------------------|
| AWS | [`aws/`](aws) | ECS on Fargate, behind an Application Load Balancer | EFS |
| Google Cloud | [`gcp/`](gcp) | Cloud Run | Cloud Storage bucket (FUSE), or Filestore |
| Azure | [`azure/`](azure) | Azure Container Apps | Azure Files |

> ## ⚠️ Run `terraform plan` and `terraform apply` by hand
>
> Every `terraform plan` and `terraform apply` in this folder must be run **manually by a person**, from their own terminal, after reading the plan.
> Do **not** run them in an automated CI/CD workflow or pipeline (GitHub Actions or anything else).
>
> These stacks create billable cloud resources and hold the keys to a whole account. A person should see exactly what will be created, changed or destroyed before it happens, and the cloud credentials should never be stored in CI. The repository's CI only builds images; it has no cloud access.

## What gets deployed

The same three containers as `docker compose up`, configured only through environment variables:

```
internet ──► app (nginx :80) ──► api (Node :4000) ──► pocketbase (:8090) ──► persistent volume (/pb/pb_data)
```

On every cloud all three containers run **together in one unit** (an ECS task, a Cloud Run instance, a Container App replica), so they reach each other on `localhost`, exactly like [`ecs/task-definition.json`](ecs/task-definition.json). That unit is capped at **one copy**, because PocketBase stores its data in SQLite, which allows a single writer.

Each stack also creates, from scratch:

| | AWS | Google Cloud | Azure |
|---|---|---|---|
| Network | VPC, public + private subnets, routing | VPC + subnet (Direct VPC egress) | VNet, delegated subnet, NSG |
| Identity | Task execution role, task role | Dedicated service account | User-assigned managed identity |
| Images | ECR repositories | Artifact Registry repository | Azure Container Registry |
| Secrets | SSM Parameter Store | Secret Manager | Container App secrets |
| Logs | CloudWatch Logs | Cloud Logging | Log Analytics |

Core components use the official module libraries, with pinned versions: [terraform-aws-modules](https://github.com/terraform-aws-modules), [terraform-google-modules](https://github.com/terraform-google-modules) (plus the Google-maintained `GoogleCloudPlatform/*` modules), and [Azure Verified Modules](https://azure.github.io/Azure-Verified-Modules/). Plain resources are used only where no such module fits; each one says why in a comment.

## Folder layout

```
infrastructure/
├── README.md               # This file
├── ecs/task-definition.json
├── aws/
│   ├── bootstrap/          # STEP 1: S3 bucket + DynamoDB table for Terraform state
│   ├── backend.hcl         # Where the state lives (filled in from bootstrap outputs)
│   ├── terraform.tfvars    # ← every setting, documented. The only file you edit
│   ├── providers.tf  variables.tf  outputs.tf  main.tf
│   └── network.tf  registry.tf  secrets.tf  storage.tf  load_balancer.tf  ecs.tf
├── gcp/
│   ├── bootstrap/          # STEP 1: (optional) project via Project Factory + GCS state bucket
│   ├── backend.hcl
│   ├── terraform.tfvars
│   ├── providers.tf  variables.tf  outputs.tf  main.tf
│   └── network.tf  iam.tf  registry.tf  secrets.tf  storage.tf  cloud_run.tf
└── azure/
    ├── bootstrap/          # STEP 1: resource group + storage account + container for state
    ├── backend.hcl
    ├── terraform.tfvars
    ├── providers.tf  variables.tf  outputs.tf  main.tf
    └── network.tf  identity.tf  registry.tf  secrets.tf  storage.tf  environment.tf  container_app.tf
```

## Deploying (same five steps on every cloud)

You need Terraform 1.10 or newer, Docker, and the cloud's CLI logged in to your account (`aws configure`, `gcloud auth application-default login`, or `az login`).

**1. Create the state backend (once per account).** Fill in `bootstrap/terraform.tfvars`, then:

```bash
cd infrastructure/<cloud>/bootstrap
terraform init
terraform plan       # read it
terraform apply
terraform output backend_config
```

The bootstrap keeps its own small state in a local `terraform.tfstate` file, because the remote backend doesn't exist yet. Keep that file somewhere safe.

**2. Point the main stack at the backend.** Paste the `backend_config` output into `<cloud>/backend.hcl`.

**3. Fill in `<cloud>/terraform.tfvars`.** Replace every `<...>` placeholder. Every other setting is listed there too, commented out with its default; uncomment one only to change it. Passwords can stay empty: Terraform generates them and stores them in the cloud's secret store.

**4. Create the registry, push the images, then deploy everything.** The service can't start before its images exist, so the first deploy happens in two applies. First create only the registry:

```bash
cd infrastructure/<cloud>
terraform init -backend-config=backend.hcl
terraform plan -target=<registry module> -out=tfplan   # read it
terraform apply tfplan
terraform output registry_url
```

where `<registry module>` is `module.ecr` (AWS), `module.artifact_registry` (Google Cloud) or `module.container_registry` (Azure). Then build and push from the repository root:

```bash
# log Docker in to the registry first:
#   AWS:   aws ecr get-login-password | docker login --username AWS --password-stdin <registry_url>
#   GCP:   gcloud auth configure-docker <region>-docker.pkg.dev
#   Azure: az acr login --name <registry name>
REGISTRY=<registry_url> TAG=latest docker compose build
REGISTRY=<registry_url> TAG=latest docker compose push
```

Build for the CPU architecture the cloud runs (`linux/amd64` by default; on Apple Silicon add `--platform linux/amd64`). Finally deploy the rest:

```bash
cd infrastructure/<cloud>
terraform plan -out=tfplan   # read it
terraform apply tfplan
```

**5. Open the app.** `terraform output app_url` prints the URL, and `terraform output -raw pocketbase_admin_password` the generated admin password. To ship a new version, push images with a new tag, set `image_tag` in `terraform.tfvars`, and run `terraform plan` / `terraform apply` again.

To remove everything: `terraform destroy` in `<cloud>/`, then in `<cloud>/bootstrap/` (set `force_destroy = true` there first if the state bucket still holds files).

## Health checks

`healthcheck_path` and `healthcheck_port` in `terraform.tfvars` become the frontend container's `HEALTHCHECK_PATH` and `HEALTHCHECK_PORT`, and the same values configure the platform's check: the ALB target group on AWS, the startup probe on Cloud Run, and the startup and liveness probes on Container Apps. Changing them needs no code change. nginx answers the check by asking the API's readiness route, which also checks PocketBase, so a broken database takes the app out of rotation.

## Cost and storage choices

Defaults are picked to keep a lecture demo at a few dollars a month or less:

- **AWS** (roughly 25-40 USD/month while it runs): the ALB (about 16-20 USD) and the Fargate task (about 18 USD at 0.5 vCPU / 1 GB) are most of it. There is **no NAT gateway** by default (it would add about 35 USD): the task runs in a public subnet, and its security group only accepts traffic from the load balancer. `task_cpu = 256` / `task_memory = 512` or `use_fargate_spot = true` roughly halve the task cost. **EFS** holds the database: it's NFS, so SQLite's file locks work, and it bills per GB with no minimum.
- **Google Cloud** (usually inside the free tier): Cloud Run scales to zero and bills CPU only while handling requests. The database defaults to a **Cloud Storage bucket mounted with Cloud Storage FUSE** (cents per month). FUSE isn't a real disk, so writes are slower and a crash can lose the last few writes. For real NFS like EFS, set `pocketbase_storage = "filestore"`, but the smallest Filestore share costs about 200 USD/month.
- **Azure** (about 5 USD/month for the registry, the app usually inside the free grant): Container Apps on the Consumption plan scales to zero. The database is on a **Standard Azure Files (SMB) share**, which bills per GB used. It is mounted with `nobrl` so SQLite works over SMB, which is safe because only one replica runs. Premium NFS shares have real locking but start at about 16 USD/month.

## Known limits

- **One copy only.** None of the stacks can scale the app out while PocketBase uses SQLite. That is a property of the database, not of the clouds.
- **Deploys on Cloud Run and Container Apps briefly overlap.** Both start the new revision before stopping the old one, so for a few seconds two PocketBase processes see the same data. Avoid writing data while a deploy rolls out. ECS doesn't have this problem: it is set to stop the old task first (minimum healthy 0%).
- **Admin UI is public.** PocketBase's admin UI is served at `/_/` behind its own login, just like locally. Restrict who can reach the app with `alb_ingress_cidr` (AWS), `allow_public_access` (GCP) or `ingress_allowed_cidr` (Azure) if that matters for your demo.
