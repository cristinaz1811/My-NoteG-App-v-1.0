# NoteG — Distributed System Architecture & AWS Deployment Plan

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Target Distributed Architecture](#2-target-distributed-architecture)
3. [Service Decomposition](#3-service-decomposition)
4. [AWS Services Mapping](#4-aws-services-mapping)
5. [Infrastructure Diagram](#5-infrastructure-diagram)
6. [Networking & Security](#6-networking--security)
7. [Containerization Strategy](#7-containerization-strategy)
8. [Database Layer](#8-database-layer)
9. [Code Execution Service (Sandbox)](#9-code-execution-service-sandbox)
10. [Real-Time Notifications (WebSocket)](#10-real-time-notifications-websocket)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [Cost Estimation](#13-cost-estimation)
14. [Implementation Phases](#14-implementation-phases)
15. [Migration Checklist](#15-migration-checklist)

---

## 1. Current Architecture Analysis

### Current Monolithic Stack

| Component         | Technology                     | Port  | Notes                                      |
|-------------------|-------------------------------|-------|---------------------------------------------|
| **Frontend**      | React 18 (CRA + Tailwind)    | 3000  | Static SPA, proxies to backend              |
| **Backend API**   | Express.js + WebSocket (ws)   | 5001  | REST API + WS on same HTTP server           |
| **Dashboard**     | Streamlit (Python)            | 8501  | Analytics dashboard, direct DB connection   |
| **Database**      | PostgreSQL                    | 5432  | Single instance, local                      |
| **Code Execution**| VM2 (JS) + child_process (Python/Java/C++/C#) | —     | Runs in-process, no isolation       |
| **AI Hints**      | OpenAI API (gpt-4o-mini)      | —     | External API call                           |
| **Email**         | Nodemailer (SMTP/Gmail)       | —     | Sends email directly                        |
| **Plagiarism**    | Custom token-based detector   | —     | CPU-intensive, runs in-process              |

### Problems with Current Architecture

- **Single point of failure** — all services on one machine
- **No horizontal scaling** — cannot scale API and code execution independently
- **Security risk** — code execution (child_process) runs on the same server as the API
- **No redundancy** — database has no replicas or backups
- **Tight coupling** — WebSocket, REST, and code execution share same process
- **No CDN** — frontend served locally or from the Express server
- **No secrets management** — `.env` files with plaintext secrets

---

## 2. Target Distributed Architecture

```
                    ┌────────────────┐
                    │   Route 53     │  (DNS)
                    │  noteg.app     │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │  CloudFront    │  (CDN)
                    │  Distribution  │
                    └──┬─────────┬───┘
                       │         │
           ┌───────────▼──┐   ┌──▼──────────────┐
           │  S3 Bucket   │   │  ALB             │
           │  (Frontend)  │   │  (Load Balancer) │
           └──────────────┘   └──┬──────────┬────┘
                                 │          │
                    ┌────────────▼──┐  ┌────▼───────────┐
                    │ ECS Fargate   │  │ ECS Fargate    │
                    │ API Service   │  │ WebSocket Svc  │
                    │ (x2-4 tasks)  │  │ (x2 tasks)    │
                    └──┬─────┬──────┘  └────────────────┘
                       │     │
          ┌────────────▼┐  ┌─▼──────────────┐
          │ SQS Queue   │  │ RDS PostgreSQL  │
          │ (Job Queue) │  │ (Multi-AZ)      │
          └──────┬──────┘  └──────┬──────────┘
                 │                │
          ┌──────▼──────┐  ┌─────▼───────────┐
          │ ECS Fargate │  │ ElastiCache      │
          │ Code Runner │  │ (Redis)          │
          │ (auto-scale)│  │ Sessions/Cache   │
          └─────────────┘  └──────────────────┘
```

---

## 3. Service Decomposition

The monolith is decomposed into **5 independently deployable services**:

### 3.1 Frontend Service
- **What**: Static React SPA build artifacts
- **Deploy to**: S3 + CloudFront
- **Why separate**: Static files need no compute; CDN provides global low-latency delivery

### 3.2 API Service (Core Backend)
- **What**: Express.js REST API — auth, courses, exercises, enrollments, plagiarism, export, analytics
- **Deploy to**: ECS Fargate (containerized)
- **Scaling**: Horizontal, 2–4 tasks behind ALB
- **Stateless**: JWT auth, no server-side sessions (or use Redis for session state)

### 3.3 WebSocket Service (Notifications)
- **What**: Real-time notification delivery via WebSocket
- **Deploy to**: ECS Fargate with ALB sticky sessions
- **Why separate**: WebSocket connections are long-lived and have different scaling characteristics than REST
- **State**: Connected clients tracked in Redis (pub/sub) for cross-instance notification delivery

### 3.4 Code Execution Service (Sandbox Worker)
- **What**: Isolated code execution for JS, Python, Java, C++, C#
- **Deploy to**: ECS Fargate (or AWS Lambda for short executions)
- **Communication**: SQS queue (API → queue → worker) or synchronous HTTP with strict timeouts
- **Why separate**: Security isolation, independent scaling, resource limits per container
- **Scaling**: Auto-scale based on SQS queue depth

### 3.5 Analytics Dashboard
- **What**: Streamlit Python app
- **Deploy to**: ECS Fargate (or EC2 if simpler)
- **Access**: Internal only or behind ALB with authentication
- **Connects to**: RDS read replica for zero impact on production

---

## 4. AWS Services Mapping

| Purpose                    | AWS Service              | Tier / Config                        |
|---------------------------|--------------------------|--------------------------------------|
| **DNS**                   | Route 53                 | Hosted zone for `noteg.app`          |
| **CDN**                   | CloudFront               | Distribution for S3 frontend         |
| **Static Hosting**        | S3                       | Frontend build artifacts             |
| **Load Balancer**         | Application Load Balancer| Path-based routing: `/api/*`, `/ws`  |
| **Container Orchestration**| ECS Fargate             | No EC2 management needed             |
| **Container Registry**    | ECR                      | Private Docker image repository      |
| **Database**              | RDS PostgreSQL           | db.t3.medium, Multi-AZ, automated backups |
| **Cache / Pub-Sub**       | ElastiCache (Redis)      | WebSocket state, rate limiting, caching |
| **Job Queue**             | SQS                      | Code execution job queue             |
| **Secrets**               | AWS Secrets Manager      | JWT_SECRET, DB creds, OpenAI key, SMTP creds |
| **Email**                 | Amazon SES               | Replace Nodemailer/Gmail for production email |
| **Monitoring**            | CloudWatch               | Logs, metrics, alarms                |
| **CI/CD**                 | GitHub Actions + ECR + ECS | Automated build & deploy            |
| **SSL/TLS**               | ACM (Certificate Manager)| Free SSL certificates                |
| **Object Storage**        | S3                       | Export files, bulk import/export CSVs |
| **WAF** (optional)        | AWS WAF                  | Protect ALB from attacks             |

---

## 5. Infrastructure Diagram

```
┌───────────────────────── AWS Region (eu-central-1) ─────────────────────────┐
│                                                                              │
│  ┌──── VPC (10.0.0.0/16) ──────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  ┌── Public Subnets (10.0.1.0/24, 10.0.2.0/24) ──────────────┐     │    │
│  │  │                                                              │     │    │
│  │  │  ┌─────────────┐    ┌──────────────────────────────────┐    │     │    │
│  │  │  │   NAT GW    │    │  Application Load Balancer       │    │     │    │
│  │  │  │  (x2 AZs)   │    │  ┌───────────┬────────────────┐  │    │     │    │
│  │  │  └─────────────┘    │  │ /api/*    │ /ws            │  │    │     │    │
│  │  │                      │  │→ API TG   │→ WS TG         │  │    │     │    │
│  │  │                      │  └───────────┴────────────────┘  │    │     │    │
│  │  │                      └──────────────────────────────────┘    │     │    │
│  │  └──────────────────────────────────────────────────────────────┘     │    │
│  │                                                                      │    │
│  │  ┌── Private Subnets (10.0.3.0/24, 10.0.4.0/24) ─────────────┐     │    │
│  │  │                                                              │     │    │
│  │  │  ┌── ECS Fargate Cluster ─────────────────────────────┐    │     │    │
│  │  │  │                                                     │    │     │    │
│  │  │  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐  │    │     │    │
│  │  │  │  │ API Service│ │ WS Service │ │ Code Runner    │  │    │     │    │
│  │  │  │  │  (x2-4)    │ │  (x2)      │ │  (auto-scale)  │  │    │     │    │
│  │  │  │  └────────────┘ └────────────┘ └────────────────┘  │    │     │    │
│  │  │  │                                                     │    │     │    │
│  │  │  │  ┌────────────────┐                                 │    │     │    │
│  │  │  │  │ Dashboard Svc  │                                 │    │     │    │
│  │  │  │  │ (Streamlit x1) │                                 │    │     │    │
│  │  │  │  └────────────────┘                                 │    │     │    │
│  │  │  └─────────────────────────────────────────────────────┘    │     │    │
│  │  │                                                              │     │    │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │     │    │
│  │  │  │ RDS Postgres │  │ ElastiCache  │  │ SQS Queue    │      │     │    │
│  │  │  │ (Multi-AZ)   │  │ (Redis)      │  │ (code-exec)  │      │     │    │
│  │  │  │ Primary + RR │  │ (2 nodes)    │  │              │      │     │    │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘      │     │    │
│  │  └──────────────────────────────────────────────────────────────┘     │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌── Global / Regional Services ─────────────────────────────────────┐      │
│  │  Route 53 │ CloudFront │ S3 │ ACM │ ECR │ Secrets Manager │ SES  │      │
│  └───────────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Networking & Security

### VPC Design
- **VPC CIDR**: `10.0.0.0/16`
- **2 Availability Zones** (AZ-a, AZ-b) for high availability
- **Public subnets**: ALB, NAT Gateway
- **Private subnets**: ECS tasks, RDS, ElastiCache (no direct internet access)

### Security Groups

| Resource            | Inbound                          | Outbound         |
|--------------------|----------------------------------|------------------|
| ALB                | 80/443 from `0.0.0.0/0`         | All              |
| API Service        | 5001 from ALB SG only            | All (via NAT)    |
| WS Service         | 5001 from ALB SG only            | All (via NAT)    |
| Code Runner        | None (pulls from SQS)            | All (via NAT)    |
| RDS                | 5432 from ECS SG only            | None             |
| ElastiCache        | 6379 from ECS SG only            | None             |

### Secrets Management
Move all environment variables to **AWS Secrets Manager**:
```
noteg/production/database    → DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
noteg/production/jwt         → JWT_SECRET
noteg/production/openai      → OPENAI_API_KEY
noteg/production/email       → EMAIL_USER, EMAIL_PASS (or switch to SES)
```
ECS tasks reference secrets directly — no `.env` files in containers.

### SSL/TLS
- **ACM** certificate for `noteg.app` and `*.noteg.app`
- CloudFront → HTTPS termination for frontend
- ALB → HTTPS termination for API/WebSocket
- Internal traffic (ECS ↔ RDS/Redis) stays in VPC, no TLS needed internally

---

## 7. Containerization Strategy

### 7.1 Dockerfiles to Create

**Backend API** (`backend/Dockerfile`):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5001
HEALTHCHECK CMD curl -f http://localhost:5001/api/health || exit 1
CMD ["node", "server.js"]
```

**Code Runner** (`backend/Dockerfile.runner`):
```dockerfile
FROM node:20-slim
# Install Python, Java, GCC, .NET SDK for multi-language support
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    default-jdk \
    gcc g++ \
    dotnet-sdk-8.0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY utils/codeExecutor.js ./utils/
COPY config/ ./config/
# Run as non-root for additional security
RUN useradd -m runner
USER runner
CMD ["node", "worker.js"]
```

**Dashboard** (`dashboard/Dockerfile`):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8501
HEALTHCHECK CMD curl -f http://localhost:8501/_stcore/health || exit 1
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

### 7.2 Docker Compose (Local Development)
Create `docker-compose.yml` for local development that mirrors the distributed architecture:
```yaml
services:
  postgres:    (PostgreSQL 15)
  redis:       (Redis 7)
  api:         (Backend API)
  websocket:   (WebSocket service — same image, different entrypoint)
  code-runner: (Code execution worker)
  dashboard:   (Streamlit)
  frontend:    (nginx serving React build)
```

### 7.3 ECR Repositories
- `noteg/api`
- `noteg/code-runner`
- `noteg/dashboard`

---

## 8. Database Layer

### RDS PostgreSQL Configuration
- **Engine**: PostgreSQL 15
- **Instance**: `db.t3.medium` (2 vCPU, 4 GB RAM) — can scale up
- **Multi-AZ**: Yes (automatic failover)
- **Storage**: 20 GB gp3, auto-scaling to 100 GB
- **Backups**: Automated daily, 7-day retention
- **Read Replica**: 1 replica for dashboard queries (zero impact on prod)

### Migration Strategy
1. Export current PostgreSQL database with `pg_dump`
2. Import into RDS using `psql` or AWS DMS
3. Run all migration files (`001_` through `010_`) in order
4. Update connection strings in Secrets Manager to point to RDS endpoint

### Connection Pooling
- Use **RDS Proxy** or **PgBouncer** sidecar to handle connection pooling
- ECS tasks scale independently; without pooling, too many connections can exhaust DB limits
- RDS Proxy config: `max_connections_percent = 80`, `idle_client_timeout = 1800`

---

## 9. Code Execution Service (Sandbox)

This is the most critical component for security and scalability.

### Architecture
```
API Service ──► SQS Queue ──► Code Runner (Fargate) ──► Results to DB/Redis
     │                              │
     │                              ├─ JS:    VM2 sandbox
     │                              ├─ Python: subprocess with timeout
     │                              ├─ Java:   subprocess with timeout
     │                              ├─ C++:    subprocess with timeout
     │                              └─ C#:     subprocess with timeout
     │
     └──► Poll result from Redis/DB (with timeout)
```

### Flow
1. Student submits code → API validates & sends message to **SQS queue**
2. Code Runner worker picks up message, executes code in isolated container
3. Results written to **Redis** (fast) with TTL, and persisted to **RDS**
4. API polls Redis for result (or uses long-polling/callback)
5. Response returned to student

### Security Measures
- Code runs in **dedicated Fargate tasks** — isolated from API
- Each task has **limited CPU/memory** (0.5 vCPU, 1 GB)
- **No network access** from code runner (remove NAT for this service, or use restrictive security groups)
- **Execution timeout**: 10 seconds max per test case
- **Resource limits**: cgroups via Fargate task definition
- Future enhancement: spin up ephemeral **Lambda functions** per execution for true per-execution isolation

### Auto-Scaling
- Scale based on **SQS ApproximateNumberOfMessagesVisible**
- Min: 1, Max: 10, Scale up when queue > 5 messages

---

## 10. Real-Time Notifications (WebSocket)

### Challenge
WebSocket connections are stateful and long-lived. When scaling horizontally, a notification might be published from API instance A, but the user is connected to WebSocket instance B.

### Solution: Redis Pub/Sub
```
API Service ──publish──► Redis Channel ("notifications") ──subscribe──► All WS instances
                                                                            │
                                                                            ▼
                                                                    Deliver to connected
                                                                    WebSocket clients
```

### Implementation Changes
1. Add `ioredis` to dependencies
2. When a notification is created (e.g., new grade), publish to Redis channel
3. Every WebSocket service instance subscribes to the Redis channel
4. On receiving a Redis message, each instance checks if the target user is connected and delivers

### ALB Configuration
- **Target Group** with `stickiness.enabled = true`
- **Protocol**: WebSocket (ALB natively supports WebSocket upgrade)
- Health check: HTTP GET `/api/health` on port 5001

---

## 11. CI/CD Pipeline

### GitHub Actions Workflow

```
┌──────┐    ┌────────┐    ┌───────┐    ┌──────────┐    ┌───────────┐
│ Push │───►│ Build  │───►│ Test  │───►│ Push to  │───►│ Deploy to │
│ main │    │ Docker │    │       │    │ ECR      │    │ ECS       │
└──────┘    └────────┘    └───────┘    └──────────┘    └───────────┘
```

### Pipeline Steps

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    # 1. npm run build
    # 2. aws s3 sync build/ s3://noteg-frontend
    # 3. aws cloudfront create-invalidation

  deploy-api:
    # 1. docker build -t noteg/api .
    # 2. docker push to ECR
    # 3. aws ecs update-service --force-new-deployment

  deploy-code-runner:
    # 1. docker build -f Dockerfile.runner -t noteg/code-runner .
    # 2. docker push to ECR
    # 3. aws ecs update-service --force-new-deployment

  deploy-dashboard:
    # 1. docker build -t noteg/dashboard .
    # 2. docker push to ECR
    # 3. aws ecs update-service --force-new-deployment
```

### Branch Strategy
- `main` → production
- `staging` → staging environment (optional)
- Feature branches → PR reviews, no auto-deploy

---

## 12. Monitoring & Observability

### CloudWatch
- **Container logs**: All ECS task logs shipped to CloudWatch Logs
- **Metrics**: CPU/Memory utilization per service, request count, error rate
- **Alarms**:
  - API response time > 2s → alert
  - Error rate > 5% → alert
  - RDS CPU > 80% → alert
  - SQS queue depth > 50 → alert (code runner scaling issue)

### Health Checks
| Service       | Endpoint                  | Interval |
|--------------|---------------------------|----------|
| API          | `GET /api/health`         | 30s      |
| WebSocket    | `GET /api/health`         | 30s      |
| Dashboard    | `GET /_stcore/health`     | 30s      |
| Code Runner  | SQS heartbeat             | —        |

### Dashboards
- **CloudWatch Dashboard**: Pre-built dashboard showing all service metrics
- **RDS Performance Insights**: Query performance monitoring
- The existing **Streamlit dashboard** continues to serve professor-facing analytics

---

## 13. Cost Estimation

### Monthly Costs (Estimated for Low-Medium Traffic)

| Service                     | Config                           | Est. Cost/Month |
|-----------------------------|----------------------------------|-----------------|
| **ECS Fargate — API**       | 2 tasks × 0.5 vCPU, 1 GB        | ~$30            |
| **ECS Fargate — WebSocket** | 2 tasks × 0.25 vCPU, 0.5 GB     | ~$15            |
| **ECS Fargate — Code Runner**| 1-3 tasks × 0.5 vCPU, 1 GB     | ~$15-45         |
| **ECS Fargate — Dashboard** | 1 task × 0.5 vCPU, 1 GB         | ~$15            |
| **RDS PostgreSQL**          | db.t3.medium, Multi-AZ, 20 GB   | ~$70            |
| **ElastiCache Redis**       | cache.t3.micro, 1 node           | ~$15            |
| **ALB**                     | 1 ALB + LCU charges              | ~$20            |
| **S3**                      | Frontend hosting (<1 GB)          | ~$1             |
| **CloudFront**              | Low traffic (<100 GB)             | ~$5             |
| **Route 53**                | 1 hosted zone                     | ~$1             |
| **ECR**                     | Image storage                     | ~$1             |
| **NAT Gateway**             | 2× (one per AZ)                  | ~$65            |
| **SQS**                     | Standard queue                    | ~$0.50          |
| **Secrets Manager**         | 4 secrets                         | ~$2             |
| **CloudWatch**              | Logs + metrics                    | ~$10            |
| **ACM**                     | SSL certificate                   | Free            |
| **SES**                     | Email sending (<1000/mo)          | ~$1             |
| **TOTAL**                   |                                   | **~$265-295/mo**|

### Cost Optimization Options
- Use **Fargate Spot** for code runner tasks (70% savings, acceptable for non-critical async jobs)
- Start with a **single NAT Gateway** (~$32/mo saving) and add second for HA later
- Use `db.t3.micro` for development/staging (~$15/mo vs $70/mo)
- Skip read replica initially — add when dashboard traffic justifies it
- **AWS Free Tier** covers some costs for the first 12 months

**Optimized Starting Cost: ~$150-180/mo**

---

## 14. Implementation Phases

### Phase 1 — Containerization & Local Distributed Setup (Week 1-2)
- [ ] Create Dockerfiles for all services (API, Code Runner, Dashboard)
- [ ] Create `docker-compose.yml` for local development
- [ ] Extract code execution into a standalone worker service with SQS interface
- [ ] Add Redis for WebSocket pub/sub across instances
- [ ] Test full stack locally with Docker Compose

### Phase 2 — AWS Foundation (Week 3)
- [ ] Register domain (Route 53) or configure existing domain
- [ ] Create VPC with public/private subnets across 2 AZs
- [ ] Set up RDS PostgreSQL (Multi-AZ)
- [ ] Set up ElastiCache Redis
- [ ] Set up SQS queue for code execution
- [ ] Configure Secrets Manager with all credentials
- [ ] Create ECR repositories and push initial images

### Phase 3 — Service Deployment (Week 4)
- [ ] Deploy frontend to S3 + CloudFront
- [ ] Set up ALB with HTTPS (ACM certificate)
- [ ] Create ECS Fargate cluster
- [ ] Deploy API service with ALB target group (`/api/*`)
- [ ] Deploy WebSocket service with ALB target group (`/ws`)
- [ ] Deploy Code Runner service with SQS trigger
- [ ] Deploy Dashboard service

### Phase 4 — Production Hardening (Week 5)
- [ ] Set up GitHub Actions CI/CD pipeline
- [ ] Configure CloudWatch alarms and dashboards
- [ ] Set up auto-scaling policies for ECS services
- [ ] Switch email from SMTP/Gmail to Amazon SES
- [ ] Security audit: penetration test code execution service
- [ ] Load testing with realistic traffic patterns
- [ ] Configure WAF rules on ALB

### Phase 5 — Optimization (Week 6+)
- [ ] Add RDS read replica for dashboard
- [ ] Implement Fargate Spot for code runner
- [ ] Set up staging environment
- [ ] Add database connection pooling (RDS Proxy)
- [ ] Evaluate Lambda for code execution (per-invocation isolation)
- [ ] Implement blue/green deployments in ECS

---

## 15. Migration Checklist

### Pre-Migration
- [ ] Full database backup (`pg_dump`)
- [ ] Document all environment variables
- [ ] Test Docker images locally
- [ ] Verify all migrations run successfully on fresh DB

### Database Migration
- [ ] Create RDS instance
- [ ] Import schema and data via `pg_dump` / `pg_restore`
- [ ] Verify row counts match
- [ ] Update application connection strings

### Frontend Migration
- [ ] Update `api.js` base URL to point to ALB domain
- [ ] Remove proxy config from `package.json`
- [ ] Build production bundle
- [ ] Upload to S3, configure CloudFront
- [ ] Verify WebSocket URL points to `wss://api.noteg.app/ws`

### Backend Migration
- [ ] Verify all ECS tasks are healthy
- [ ] Test all API endpoints through ALB
- [ ] Verify WebSocket connections work through ALB
- [ ] Test code execution flow (API → SQS → Runner → Result)
- [ ] Verify email sending via SES
- [ ] Verify OpenAI integration works from Fargate (NAT Gateway)

### DNS Cutover
- [ ] Point domain to CloudFront (frontend) and ALB (API)
- [ ] Monitor error rates for 24 hours
- [ ] Keep old infrastructure running as fallback for 1 week

---

## Key Architecture Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Container orchestration | ECS Fargate | Serverless containers — no EC2 to manage |
| Code execution isolation | Separate Fargate service + SQS | Security boundary, independent scaling |
| WebSocket scaling | Redis Pub/Sub | Cross-instance notification delivery |
| Database | RDS Multi-AZ | Automatic failover, managed backups |
| Frontend hosting | S3 + CloudFront | Global CDN, no compute cost |
| CI/CD | GitHub Actions | Already using GitHub, seamless integration |
| Secrets | AWS Secrets Manager | Native ECS integration, rotation support |
| Email | Amazon SES | Reliable, cheap, no SMTP server to manage |

---

## Files to Create

The following files need to be created as part of this plan:

```
backend/Dockerfile                    # API service container
backend/Dockerfile.runner             # Code execution container  
backend/worker.js                     # SQS code execution worker entry point
backend/utils/redisClient.js          # Redis connection utility
backend/utils/sqsClient.js            # SQS send/receive utility
dashboard/Dockerfile                  # Streamlit container
docker-compose.yml                    # Local development setup
.github/workflows/deploy.yml          # CI/CD pipeline
infrastructure/                       # Terraform or CloudFormation IaC
  ├── main.tf                         # VPC, subnets, security groups
  ├── ecs.tf                          # ECS cluster, services, tasks
  ├── rds.tf                          # Database
  ├── redis.tf                        # ElastiCache
  ├── alb.tf                          # Load balancer
  ├── s3-cloudfront.tf                # Frontend hosting
  └── variables.tf                    # Configuration variables
```
