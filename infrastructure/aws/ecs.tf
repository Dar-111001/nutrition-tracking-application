# ECS cluster, task definition and service.
#
# The service module also creates the IAM roles the task needs:
#   - task execution role: pulls images from ECR, writes logs, reads the two
#     SSM passwords (task_exec_ssm_param_arns below)
#   - task role: what the running code may do in AWS (nothing, unless
#     enable_execute_command adds the ECS Exec permissions)

module "ecs_cluster" {
  source  = "terraform-aws-modules/ecs/aws//modules/cluster"
  version = "~> 7.6"
  count   = var.create ? 1 : 0

  name = local.name

  cluster_capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  setting = [
    {
      name  = "containerInsights"
      value = var.enable_container_insights ? "enabled" : "disabled"
    }
  ]

  cloudwatch_log_group_retention_in_days = var.log_retention_days
}

locals {
  # Settings shared by every container
  container_defaults = {
    essential                              = true
    readonlyRootFilesystem                 = false # nginx renders its config and PocketBase writes temp files at start
    cloudwatch_log_group_retention_in_days = var.log_retention_days
  }
}

module "ecs_service" {
  source  = "terraform-aws-modules/ecs/aws//modules/service"
  version = "~> 7.6"
  count   = var.create ? 1 : 0

  name        = local.name
  cluster_arn = module.ecs_cluster[0].arn

  # ---- Task size and platform ----
  cpu    = var.task_cpu
  memory = var.task_memory
  runtime_platform = {
    cpu_architecture        = var.cpu_architecture
    operating_system_family = "LINUX"
  }

  capacity_provider_strategy = {
    main = {
      capacity_provider = var.use_fargate_spot ? "FARGATE_SPOT" : "FARGATE"
      weight            = 100
    }
  }

  # ---- Exactly one task, always ----
  # SQLite has a single writer, so two PocketBase tasks must never run at the
  # same time. A deploy stops the old task before starting the new one, which
  # means a short outage instead of a corrupted database.
  desired_count                      = 1
  enable_autoscaling                 = false
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
  deployment_circuit_breaker = {
    enable   = true
    rollback = true
  }
  health_check_grace_period_seconds = 120

  enable_execute_command = var.enable_execute_command

  # ---- Network ----
  subnet_ids       = local.task_subnet_ids
  assign_public_ip = local.task_assign_public_ip

  security_group_name = "${local.name}-task"
  security_group_ingress_rules = {
    for k, v in {
      app = {
        description                  = "App port from the load balancer"
        from_port                    = local.app_port
        to_port                      = local.app_port
        ip_protocol                  = "tcp"
        referenced_security_group_id = module.alb[0].security_group_id
      }
      healthcheck = {
        description                  = "Health check port from the load balancer"
        from_port                    = var.healthcheck_port
        to_port                      = var.healthcheck_port
        ip_protocol                  = "tcp"
        referenced_security_group_id = module.alb[0].security_group_id
      }
    } : k => v if k == "app" || local.separate_healthcheck_port
  }
  security_group_egress_rules = {
    all = {
      description = "Image pulls, EFS, SSM and OpenFoodFacts"
      ip_protocol = "-1"
      cidr_ipv4   = "0.0.0.0/0"
    }
  }

  load_balancer = {
    app = {
      target_group_arn = module.alb[0].target_groups["app"].arn
      container_name   = "app"
      container_port   = local.app_port
    }
  }

  # ---- Storage ----
  volume = {
    pb_data = {
      efs_volume_configuration = {
        file_system_id     = module.efs[0].id
        transit_encryption = "ENABLED"
      }
    }
  }

  # ---- Secrets the execution role may read ----
  task_exec_ssm_param_arns = [
    module.ssm_pocketbase_admin_password[0].ssm_parameter_arn,
    module.ssm_app_user_password[0].ssm_parameter_arn,
  ]

  # ---- Containers (they share localhost) ----
  container_definitions = {
    app = merge(local.container_defaults, {
      image = local.app_image
      portMappings = concat(
        [{ name = "http", containerPort = local.app_port, hostPort = local.app_port, protocol = "tcp" }],
        local.separate_healthcheck_port ? [{ name = "health", containerPort = var.healthcheck_port, hostPort = var.healthcheck_port, protocol = "tcp" }] : [],
      )
      environment = [
        { name = "PORT", value = tostring(local.app_port) },
        { name = "API_URL", value = "http://localhost:${local.api_port}" },
        { name = "POCKETBASE_URL", value = "http://localhost:${local.pocketbase_port}" },
        { name = "HEALTHCHECK_PATH", value = var.healthcheck_path },
        { name = "HEALTHCHECK_PORT", value = tostring(var.healthcheck_port) },
      ]
      dependsOn = [{ containerName = "api", condition = "HEALTHY" }]
      healthCheck = {
        command     = ["CMD", "healthcheck"]
        interval    = 15
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    })

    api = merge(local.container_defaults, {
      image = local.api_image
      portMappings = [
        { name = "api", containerPort = local.api_port, hostPort = local.api_port, protocol = "tcp" }
      ]
      environment = [
        { name = "PORT", value = tostring(local.api_port) },
        { name = "POCKETBASE_URL", value = "http://localhost:${local.pocketbase_port}" },
        { name = "HEALTHCHECK_PATH", value = var.api_healthcheck_path },
        { name = "OPENFOODFACTS_URL", value = var.openfoodfacts_url },
        { name = "UPSTREAM_TIMEOUT_MS", value = tostring(var.upstream_timeout_ms) },
        { name = "FOOD_SEARCH_TIMEOUT_MS", value = tostring(var.food_search_timeout_ms) },
      ]
      dependsOn = [{ containerName = "pocketbase", condition = "HEALTHY" }]
      healthCheck = {
        command     = ["CMD", "node", "healthcheck.js"]
        interval    = 15
        timeout     = 5
        retries     = 3
        startPeriod = 20
      }
    })

    pocketbase = merge(local.container_defaults, {
      image = local.pocketbase_image
      portMappings = [
        { name = "pocketbase", containerPort = local.pocketbase_port, hostPort = local.pocketbase_port, protocol = "tcp" }
      ]
      environment = [
        { name = "PB_PORT", value = tostring(local.pocketbase_port) },
        { name = "PB_DATA_DIR", value = "/pb/pb_data" },
        { name = "PB_ADMIN_EMAIL", value = var.pocketbase_admin_email },
        { name = "APP_USER_EMAIL", value = local.app_user_email },
      ]
      secrets = [
        { name = "PB_ADMIN_PASSWORD", valueFrom = module.ssm_pocketbase_admin_password[0].ssm_parameter_arn },
        { name = "APP_USER_PASSWORD", valueFrom = module.ssm_app_user_password[0].ssm_parameter_arn },
      ]
      mountPoints = [
        { sourceVolume = "pb_data", containerPath = "/pb/pb_data", readOnly = false }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "curl -sf http://127.0.0.1:${local.pocketbase_port}/api/health || exit 1"]
        interval    = 10
        timeout     = 3
        retries     = 5
        startPeriod = 20
      }
    })
  }
}
