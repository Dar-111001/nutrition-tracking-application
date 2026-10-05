# One private ECR repository per image. Push to them with:
#   aws ecr get-login-password | docker login --username AWS --password-stdin <registry_url output>
#   REGISTRY=<registry_url output> TAG=<image_tag> docker compose build && docker compose push

locals {
  images = toset(["app", "api", "pocketbase"])
}

module "ecr" {
  source  = "terraform-aws-modules/ecr/aws"
  version = "~> 3.2"

  for_each = var.create && var.create_ecr_repositories ? local.images : toset([])

  # Same names docker-compose.yml uses: nutrition-app, nutrition-api, nutrition-pocketbase
  repository_name                 = "${var.project_name}-${each.key}"
  repository_image_tag_mutability = var.ecr_image_tag_mutability
  repository_force_delete         = var.ecr_force_delete
  repository_image_scan_on_push   = true

  # Keep only the newest images so storage stays free-tier sized
  repository_lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep the last ${var.ecr_keep_last_images} images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.ecr_keep_last_images
        }
        action = { type = "expire" }
      }
    ]
  })
}

locals {
  # try(): the repositories don't exist when create or create_ecr_repositories is false
  ecr_urls = { for k in local.images : k => try(module.ecr[k].repository_url, "") }

  app_image        = var.app_image != "" ? var.app_image : "${local.ecr_urls["app"]}:${var.image_tag}"
  api_image        = var.api_image != "" ? var.api_image : "${local.ecr_urls["api"]}:${var.image_tag}"
  pocketbase_image = var.pocketbase_image != "" ? var.pocketbase_image : "${local.ecr_urls["pocketbase"]}:${var.image_tag}"
}
