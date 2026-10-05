# Infrastructure

Everything needed to run the app on AWS lives here. Today that is a sample ECS task definition; Terraform will be added next to it later.

```
infrastructure/
└── ecs/
    └── task-definition.json   # Fargate task: app (nginx) + api (Node) + pocketbase
```

## The task at a glance

All three containers run in **one Fargate task**, so they share `localhost`:

| Container | Image | Port | Reaches | Public? |
|-----------|-------|------|---------|---------|
| `app` | `nutrition-app` | 80 | `api` at `http://localhost:4000`, `pocketbase` at `http://localhost:8090` | Yes, via the load balancer |
| `api` | `nutrition-api` | 4000 | `pocketbase` at `http://localhost:8090` | No |
| `pocketbase` | `nutrition-pocketbase` | 8090 | its SQLite file on EFS at `/pb/pb_data` | No |

Containers start in dependency order (`pocketbase`, then `api`, then `app`), each waiting for the previous one's health check.

## Using it

1. Replace every `<...>` placeholder: account id, region, image tag, EFS file system id, admin and login emails.
2. Create the two SSM parameters the task reads its passwords from (`/nutrition/PB_ADMIN_PASSWORD`, `/nutrition/APP_USER_PASSWORD`) and let the execution role read them.
3. Register it:
   ```bash
   aws ecs register-task-definition --cli-input-json file://infrastructure/ecs/task-definition.json
   ```
4. Run it as a service with **desired count 1** (SQLite has a single writer) and point the target group at the `app` container on port 80, health check path `/health`.

The main [README](../README.md#deploying-to-aws-ecr--ecs-fargate) walks through ECR, EFS and the load balancer step by step.
