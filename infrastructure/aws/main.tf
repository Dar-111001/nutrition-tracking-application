# The nutrition app on AWS: one ECS Fargate task behind an Application Load
# Balancer, with PocketBase's SQLite file on EFS.
#
#   internet -> ALB :80/:443 -> task (public or private subnet)
#                                 app (nginx :80) -> api (Node :4000) -> pocketbase (:8090)
#                                                                          '-> EFS /pb/pb_data
#
# All three containers run in ONE task, so they share localhost exactly like
# infrastructure/ecs/task-definition.json. The task count is fixed at 1
# because SQLite allows a single writer.
#
# Files in this folder:
#   network.tf        VPC, subnets, routing
#   registry.tf       ECR repositories for the three images
#   secrets.tf        PocketBase passwords in SSM Parameter Store
#   storage.tf        EFS file system for the database
#   load_balancer.tf  ALB, listeners, target group
#   ecs.tf            ECS cluster, task definition and service (+ IAM roles)

data "aws_availability_zones" "available" {
  # Skip Local Zones and Wavelength zones, which can't host every service
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  name = "${var.project_name}-${var.environment}"
  azs  = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags,
  )

  https_enabled = var.certificate_arn != ""

  # The app container listens on 80; a different health check port gets its own listener
  app_port                  = 80
  separate_healthcheck_port = var.healthcheck_port != local.app_port

  # Ports the containers use to talk to each other inside the task
  api_port        = 4000
  pocketbase_port = 8090
}
