# The only public entry point. It forwards to the app container (nginx) on
# port 80 and checks HEALTHCHECK_PATH, which nginx answers by asking the API's
# readiness route, so a broken API or database takes the task out of rotation.
#
# Cost note: an ALB is about 16-20 USD/month even when idle. It is kept because
# it gives a stable DNS name, HTTPS with a free ACM certificate, and health
# checks, which are exactly what the lecture demonstrates.

module "alb" {
  source  = "terraform-aws-modules/alb/aws"
  version = "~> 10.5"
  count   = var.create ? 1 : 0

  name               = local.name
  load_balancer_type = "application"
  vpc_id             = module.vpc[0].vpc_id
  subnets            = module.vpc[0].public_subnets

  enable_deletion_protection = var.alb_deletion_protection

  security_group_ingress_rules = {
    for k, v in {
      http = {
        from_port   = 80
        to_port     = 80
        ip_protocol = "tcp"
        cidr_ipv4   = var.alb_ingress_cidr
      }
      https = {
        from_port   = 443
        to_port     = 443
        ip_protocol = "tcp"
        cidr_ipv4   = var.alb_ingress_cidr
      }
    } : k => v if k == "http" || local.https_enabled
  }
  security_group_egress_rules = {
    vpc = {
      ip_protocol = "-1"
      cidr_ipv4   = module.vpc[0].vpc_cidr_block
    }
  }

  listeners = {
    for k, v in {
      # Plain HTTP forwards to the app, or redirects to HTTPS when a certificate is set
      http = {
        port     = 80
        protocol = "HTTP"
        forward  = local.https_enabled ? null : { target_group_key = "app" }
        redirect = local.https_enabled ? {
          port        = "443"
          protocol    = "HTTPS"
          status_code = "HTTP_301"
        } : null
        certificate_arn = null
        ssl_policy      = null
      }
      https = {
        port            = 443
        protocol        = "HTTPS"
        forward         = { target_group_key = "app" }
        redirect        = null
        certificate_arn = var.certificate_arn
        ssl_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      }
    } : k => v if k == "http" || local.https_enabled
  }

  target_groups = {
    app = {
      name_prefix          = "app-"
      protocol             = "HTTP"
      port                 = local.app_port
      target_type          = "ip" # Fargate tasks register by IP
      deregistration_delay = 10

      health_check = {
        enabled             = true
        path                = var.healthcheck_path
        port                = local.separate_healthcheck_port ? tostring(var.healthcheck_port) : "traffic-port"
        protocol            = "HTTP"
        matcher             = "200"
        interval            = 30
        timeout             = 5
        healthy_threshold   = 2
        unhealthy_threshold = 3
      }

      # ECS registers the task's IP itself
      create_attachment = false
    }
  }
}
