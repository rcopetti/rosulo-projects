# Project Management AI Platform — Technical Design Document

> AI-powered project management platform combining PMI/PMBOK methodology with intelligent automation, prediction, and natural language interaction.
>
> **Source documents:**
> - `docs/project-management-scope.md` — PM domain scope definition
> - `docs/project-management-ai-solution.md` — AI feature specifications
> - `.opencode/skills/` — Tech stack conventions and patterns
>
> **Date:** 2026-03-29
> **Status:** Draft

---

## 1. Tech Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React + TypeScript | 18+ / 5.x | SPA, dashboards, chat copilot UI |
| **UI Components** | shadcn/ui + Tailwind | latest | Design system, styling |
| **State** | Zustand + TanStack Query | v5 | Client state + server state |
| **Backend** | FastAPI (Python) | 0.110+ | REST API, WebSocket, business logic |
| **ORM** | SQLAlchemy (async) | 2.0 | Database access layer |
| **Database** | PostgreSQL | 16+ | Primary data store |
| **Migrations** | Alembic | latest | Schema versioning |
| **Vector Store** | Amazon S3 Vectors | — | RAG embeddings storage |
| **LLM Integration** | LiteLLM | latest | Unified LLM proxy/SDK |
| **LLM Providers** | AWS Bedrock | — | Claude 3.5 Sonnet, Haiku, Titan Embeddings |
| **Agent Framework** | Custom multi-agent | — | Orchestration, routing, tools |
| **Task Queue** | Celery + Redis | — | Background jobs, async tasks |
| **Auth** | JWT + OAuth2 | — | Authentication and authorization |
| **Infra** | AWS (App Runner, RDS, S3, CloudFront) | — | Hosting, managed DB, CDN, object storage |

---

## 2. System Architecture

### 2.1 Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND                                │
│  Chat Copilot · Dashboards · Gantt · WBS Editor · Risk Register     │
│  Smart Forms · Notifications · Portfolio Overview · Reports          │
├─────────────────────────────────────────────────────────────────────┤
│                        API GATEWAY (FastAPI)                         │
│  REST Endpoints · WebSocket (real-time) · SSE (streaming)           │
│  Auth Middleware · Rate Limiting · Request Validation                │
├─────────────────────────────────────────────────────────────────────┤
│                        SERVICE LAYER                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ PM Services  │ │ AI Services  │ │ Integration  │ │ Reporting  │ │
│  │ Scope, Cost, │ │ Copilot,     │ │ Services     │ │ Services   │ │
│  │ Schedule,    │ │ Estimation,  │ │ Git, Slack,  │ │ Dashboards,│ │
│  │ Risk, Res.   │ │ Risk, Pred.  │ │ Calendar     │ │ EVM, KPIs  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                        AI ORCHESTRATION LAYER                        │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ Multi-Agent │ │ LiteLLM      │ │ RAG Pipeline │ │ Monte Carlo│ │
│  │ System      │ │ Router       │ │ Bedrock +    │ │ Simulator  │ │
│  │ Orchestrator│ │ Fallback +   │ │ S3 Vectors   │ │            │ │
│  │ + Specialists│ │ Cost Track   │ │              │ │            │ │
│  └─────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                    │
│  PostgreSQL (core data) · S3 Vectors (embeddings)                   │
│  Redis (cache, queues) · S3 (documents, reports)                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Request Flow

```
User Action (Browser)
  │
  ├── REST request ──> FastAPI router ──> Service layer ──> PostgreSQL
  │                                                            │
  ├── Chat message ──> WebSocket ──> AI Orchestrator ──> Agent system
  │                       │                  │
  │                       │                  ├── LiteLLM ──> Bedrock (Claude)
  │                       │                  ├── RAG search ──> S3 Vectors
  │                       │                  └── Tool execution ──> PM Services
  │                       │
  │                       └── SSE stream ──> Browser (token by token)
  │
  └── Background job ──> Celery worker ──> (ingestion, simulation, report gen)
```

### 2.3 Project Structure

```
rosulo-projects/
├── apps/
│   ├── web/                          # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui primitives
│   │   │   │   ├── layout/           # App shell, sidebar, header
│   │   │   │   ├── features/
│   │   │   │   │   ├── copilot/      # AI chat interface
│   │   │   │   │   ├── projects/     # Project CRUD, charter
│   │   │   │   │   ├── wbs/          # WBS tree editor
│   │   │   │   │   ├── schedule/     # Gantt chart, calendar
│   │   │   │   │   ├── cost/         # Budget, EVM dashboard
│   │   │   │   │   ├── risk/         # Risk register, heatmap
│   │   │   │   │   ├── resources/    # Team, RACI, workload
│   │   │   │   │   ├── portfolio/    # Portfolio overview
│   │   │   │   │   └── reports/      # Report builder, exports
│   │   │   │   └── charts/           # Recharts/visx chart wrappers
│   │   │   ├── hooks/                # useProject, useEVM, useCopilot...
│   │   │   ├── stores/               # Zustand stores
│   │   │   ├── lib/api/              # API client, axios config
│   │   │   └── types/                # Shared TypeScript types
│   │   └── package.json
│   │
│   └── api/                          # FastAPI backend
│       ├── app/
│       │   ├── main.py               # App factory, middleware
│       │   ├── core/
│       │   │   ├── config.py          # pydantic-settings
│       │   │   ├── security.py        # JWT, RBAC
│       │   │   └── exceptions.py      # Error handlers
│       │   ├── api/
│       │   │   ├── v1/
│       │   │   │   ├── endpoints/
│       │   │   │   │   ├── projects.py
│       │   │   │   │   ├── wbs.py
│       │   │   │   │   ├── schedule.py
│       │   │   │   │   ├── cost.py
│       │   │   │   │   ├── risks.py
│       │   │   │   │   ├── resources.py
│       │   │   │   │   ├── stakeholders.py
│       │   │   │   │   ├── portfolio.py
│       │   │   │   │   ├── copilot.py      # AI chat endpoint
│       │   │   │   │   ├── reports.py
│       │   │   │   │   └── health.py
│       │   │   │   └── router.py
│       │   │   ├── deps.py             # DI: db session, current user
│       │   │   └── ws.py              # WebSocket routes
│       │   ├── models/                # SQLAlchemy ORM
│       │   ├── schemas/               # Pydantic request/response
│       │   ├── services/              # Business logic
│       │   │   ├── project_service.py
│       │   │   ├── wbs_service.py
│       │   │   ├── schedule_service.py
│       │   │   ├── cost_service.py
│       │   │   ├── risk_service.py
│       │   │   ├── resource_service.py
│       │   │   ├── portfolio_service.py
│       │   │   ├── report_service.py
│       │   │   ├── evm_service.py
│       │   │   ├── cpm_service.py
│       │   │   └── ai/                # AI services
│       │   │       ├── llm_client.py      # LiteLLM wrapper
│       │   │       ├── embedding_service.py
│       │   │       ├── rag_service.py
│       │   │       ├── copilot_service.py
│       │   │       ├── estimation_service.py
│       │   │       ├── risk_analyzer.py
│       │   │       └── agents/           # Multi-agent system
│       │   │           ├── base.py
│       │   │           ├── orchestrator.py
│       │   │           ├── charter_agent.py
│       │   │           ├── wbs_agent.py
│       │   │           ├── estimation_agent.py
│       │   │           ├── risk_agent.py
│       │   │           ├── report_agent.py
│       │   │           ├── resource_agent.py
│       │   │           ├── tools/
│       │   │           │   ├── db_query_tool.py
│       │   │           │   ├── evm_tool.py
│       │   │           │   ├── cpm_tool.py
│       │   │           │   ├── risk_simulation_tool.py
│       │   │           │   └── document_tool.py
│       │   │           └── memory/
│       │   │               ├── short_term.py
│       │   │               └── shared_state.py
│       │   ├── workers/               # Celery tasks
│       │   │   ├── ingestion_worker.py
│       │   │   ├── simulation_worker.py
│       │   │   ├── report_worker.py
│       │   │   └── notification_worker.py
│       │   └── db/
│       │       ├── base.py
│       │       ├── session.py
│       │       └── migrations/        # Alembic
│       ├── tests/
│       ├── alembic.ini
│       └── requirements.txt
│
├── docs/
│   ├── project-management-scope.md
│   ├── project-management-ai-solution.md
│   └── design.md                      # This document
│
└── .opencode/skills/                   # Local skill definitions
```

---

## 3. Data Model Design

### 3.1 Entity Relationship Overview

```
Organization ─┬─> User ─┬─> ProjectMembership
              │         ├─> TaskAssignment
              │         └─> ResourceCalendar
              │
              └─> Portfolio ──> Program ──> Project ──┬─> WBSItem ──> Task
                                                     │
                                                     ├─> Risk
                                                     ├─> Stakeholder
                                                     ├─> Budget / CostItem
                                                     ├─> Milestone
                                                     ├─> ChangeRequest
                                                     ├─> Document
                                                     ├─> Meeting
                                                     └─> Benefit
```

### 3.2 Core Tables

#### Organizations (multi-tenancy root)

```sql
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
```

#### Users & Memberships

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    avatar_url      TEXT,
    role            VARCHAR(50) NOT NULL DEFAULT 'member',  -- admin, pm, member, viewer
    preferences     JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE org_memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    role            VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, user_id)
);
```

#### Portfolios & Programs

```sql
CREATE TABLE portfolios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    description     TEXT,
    strategy_pillars JSONB DEFAULT '[]',  -- ["Innovation", "Cost Efficiency", ...]
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE programs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id    UUID NOT NULL REFERENCES portfolios(id),
    name            TEXT NOT NULL,
    description     TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
```

#### Projects (central entity)

```sql
CREATE TYPE project_methodology AS ENUM (
    'waterfall', 'agile', 'hybrid', 'lean', 'ccpm', 'prince2'
);

CREATE TYPE project_status AS ENUM (
    'draft', 'initiating', 'planning', 'executing',
    'monitoring', 'closing', 'closed', 'archived'
);

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    program_id      UUID REFERENCES programs(id),
    name            TEXT NOT NULL,
    description     TEXT,
    methodology     project_methodology NOT NULL DEFAULT 'agile',
    status          project_status NOT NULL DEFAULT 'draft',
    priority        INTEGER DEFAULT 3,  -- 1=critical, 5=low

    -- Iron Triangle
    start_date      DATE,
    end_date        DATE,
    budget_baseline NUMERIC(15, 2),

    -- Complexity
    complexity_size         INTEGER,  -- 1-10
    complexity_uncertainty  INTEGER,
    complexity_interdep     INTEGER,
    complexity_ambiguity    INTEGER,
    complexity_regulatory   INTEGER,

    -- AI-generated fields
    ai_feasibility_score    FLOAT,
    ai_recommended_method   project_methodology,
    ai_complexity_score     FLOAT,

    -- Charter (structured from AI or manual)
    charter             JSONB,  -- objectives, success_criteria, constraints
    scope_baseline      JSONB,
    schedule_baseline   JSONB,
    cost_baseline       JSONB,

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE project_memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    role            VARCHAR(100) NOT NULL,  -- project_manager, team_lead, member, stakeholder
    allocation_pct  NUMERIC(5, 2) DEFAULT 100.0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);
```

### 3.3 Scope Management (WBS)

```sql
CREATE TYPE wbs_type AS ENUM (
    'project', 'phase', 'deliverable', 'work_package', 'activity', 'task'
);

CREATE TABLE wbs_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    parent_id       UUID REFERENCES wbs_items(id),
    code            VARCHAR(50) NOT NULL,  -- e.g., "1.2.3"
    name            TEXT NOT NULL,
    description     TEXT,
    type            wbs_type NOT NULL,
    level           INTEGER NOT NULL,  -- depth in tree
    sort_order      INTEGER DEFAULT 0,

    -- Effort estimation
    estimated_hours NUMERIC(10, 2),
    required_skills JSONB DEFAULT '[]',

    -- AI-generated
    ai_generated    BOOLEAN DEFAULT false,
    ai_risk_flags   JSONB DEFAULT '[]',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    UNIQUE(project_id, code)
);

CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    wbs_item_id     UUID REFERENCES wbs_items(id),
    name            TEXT NOT NULL,
    description     TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'todo',  -- todo, in_progress, blocked, done
    priority        INTEGER DEFAULT 3,

    -- Schedule
    planned_start   TIMESTAMPTZ,
    planned_end     TIMESTAMPTZ,
    actual_start    TIMESTAMPTZ,
    actual_end      TIMESTAMPTZ,
    duration_days   NUMERIC(6, 1),

    -- Cost
    estimated_cost  NUMERIC(12, 2),
    actual_cost     NUMERIC(12, 2),

    -- Progress
    percent_complete NUMERIC(5, 2) DEFAULT 0,
    earned_value    NUMERIC(12, 2),

    -- AI
    ai_suggested_assignee UUID REFERENCES users(id),
    ai_estimated_duration NUMERIC(6, 1),
    ai_estimated_confidence FLOAT,

    -- Dependencies
    dependencies    JSONB DEFAULT '[]',  -- [{task_id, type: finish_to_start}]

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_wbs ON tasks(wbs_item_id);
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
```

### 3.4 Schedule Management

```sql
CREATE TABLE milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    name            TEXT NOT NULL,
    description     TEXT,
    target_date     DATE NOT NULL,
    actual_date     DATE,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, achieved, missed
    deliverable_ids UUID[] DEFAULT '{}',  -- linked WBS items
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_dependencies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predecessor_id  UUID NOT NULL REFERENCES tasks(id),
    successor_id    UUID NOT NULL REFERENCES tasks(id),
    type            VARCHAR(30) NOT NULL DEFAULT 'finish_to_start',
    lag_days        INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(predecessor_id, successor_id)
);
```

### 3.5 Cost Management (EVM)

```sql
CREATE TABLE budget_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    wbs_item_id     UUID REFERENCES wbs_items(id),
    category        VARCHAR(100) NOT NULL,  -- labor, materials, licenses, overhead
    planned_amount  NUMERIC(15, 2) NOT NULL,
    actual_amount   NUMERIC(15, 2) DEFAULT 0,
    forecast_amount NUMERIC(15, 2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cost_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    budget_line_id  UUID REFERENCES budget_lines(id),
    task_id         UUID REFERENCES tasks(id),
    description     TEXT NOT NULL,
    amount          NUMERIC(12, 2) NOT NULL,
    incurred_date   DATE NOT NULL,
    vendor          TEXT,
    invoice_ref     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE evm_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    snapshot_date   DATE NOT NULL,
    pv              NUMERIC(15, 2),  -- Planned Value
    ev              NUMERIC(15, 2),  -- Earned Value
    ac              NUMERIC(15, 2),  -- Actual Cost
    spi             NUMERIC(8, 4),  -- Schedule Performance Index
    cpi             NUMERIC(8, 4),  -- Cost Performance Index
    eac             NUMERIC(15, 2),  -- Estimate at Completion
    etc             NUMERIC(15, 2),  -- Estimate to Complete
    vac             NUMERIC(15, 2),  -- Variance at Completion
    tcpi            NUMERIC(8, 4),  -- To-Complete Performance Index
    ai_forecast_eac NUMERIC(15, 2),  -- ML-predicted EAC
    ai_confidence   JSONB,           -- {"low": X, "high": Y, "p50": Z}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evm_project_date ON evm_snapshots(project_id, snapshot_date);
```

### 3.6 Risk Management

```sql
CREATE TYPE risk_category AS ENUM (
    'technical', 'schedule', 'cost', 'resource',
    'external', 'organizational', 'quality', 'compliance'
);

CREATE TABLE risks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    name            TEXT NOT NULL,
    description     TEXT,
    category        risk_category NOT NULL,
    probability     NUMERIC(3, 2) NOT NULL,  -- 0.00 - 1.00
    impact          INTEGER NOT NULL,         -- 1-5
    risk_score      NUMERIC(5, 2),            -- probability * impact
    status          VARCHAR(50) NOT NULL DEFAULT 'identified',  -- identified, analyzed, mitigated, closed

    -- Response
    response_strategy  VARCHAR(50),  -- avoid, mitigate, transfer, accept
    response_plan      TEXT,
    contingency_plan   TEXT,
    risk_owner_id      UUID REFERENCES users(id),

    -- AI-generated
    ai_generated        BOOLEAN DEFAULT false,
    ai_source           TEXT,  -- "historical_pattern", "wbs_scan", "external_feed"
    ai_suggested_response TEXT,
    ai_historical_frequency FLOAT,

    -- Tracking
    trigger_conditions TEXT,
    residual_probability NUMERIC(3, 2),
    residual_impact    INTEGER,
    occurred           BOOLEAN DEFAULT false,
    occurred_at        TIMESTAMPTZ,
    actual_impact      TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_risks_project ON risks(project_id);
CREATE INDEX idx_risks_category ON risks(category);
CREATE INDEX idx_risks_status ON risks(status) WHERE deleted_at IS NULL;

CREATE TABLE issues (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    risk_id         UUID REFERENCES risks(id),  -- if issue materialized from a risk
    name            TEXT NOT NULL,
    description     TEXT,
    severity        VARCHAR(20) NOT NULL,  -- critical, high, medium, low
    status          VARCHAR(50) NOT NULL DEFAULT 'open',
    assigned_to     UUID REFERENCES users(id),
    resolution      TEXT,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.7 Resource Management

```sql
CREATE TABLE resource_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    skills          JSONB DEFAULT '[]',  -- ["Python", "React", "AWS"]
    skill_levels    JSONB DEFAULT '{}',  -- {"Python": "expert", "React": "intermediate"}
    hourly_rate     NUMERIC(10, 2),
    availability    JSONB DEFAULT '{}',  -- {"mon": 8, "tue": 8, ...}
    timezone        VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resource_calendars (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    date            DATE NOT NULL,
    available_hours NUMERIC(4, 1) DEFAULT 8,
    pto             BOOLEAN DEFAULT false,
    notes           TEXT,
    UNIQUE(user_id, date)
);

CREATE TABLE raci_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    wbs_item_id     UUID REFERENCES wbs_items(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    role            VARCHAR(1) NOT NULL,  -- R, A, C, I
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, wbs_item_id, user_id)
);
```

### 3.8 Stakeholder Management

```sql
CREATE TABLE stakeholders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    name            TEXT NOT NULL,
    email           VARCHAR(255),
    organization    TEXT,
    role_title      TEXT,
    influence       INTEGER,  -- 1-5
    interest        INTEGER,  -- 1-5
    engagement_strategy VARCHAR(50),  -- manage, monitor, keep_satisfied, keep_informed
    ai_detected     BOOLEAN DEFAULT false,
    ai_notes        TEXT,  -- AI-generated engagement suggestions
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.9 Change Management

```sql
CREATE TABLE change_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    justification   TEXT,
    impact_scope    JSONB,    -- {added: [...], removed: [...]}
    impact_schedule JSONB,    -- {days_delta: +12, affected_tasks: [...]}
    impact_cost     JSONB,    -- {amount_delta: +18000, breakdown: {...}}
    impact_quality  TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft, submitted, approved, rejected, deferred
    priority        INTEGER DEFAULT 3,

    -- AI analysis
    ai_scope_creep_flag BOOLEAN DEFAULT false,
    ai_impact_summary   TEXT,
    ai_similar_changes  JSONB,  -- from historical data

    -- Approval workflow
    submitted_by    UUID REFERENCES users(id),
    submitted_at    TIMESTAMPTZ,
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    decision_notes  TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.10 Communications & Meetings

```sql
CREATE TABLE meetings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    title           TEXT NOT NULL,
    meeting_type    VARCHAR(50),  -- standup, review, retrospective, planning, stakeholder
    scheduled_at    TIMESTAMPTZ NOT NULL,
    duration_min    INTEGER,
    attendees       UUID[] DEFAULT '{}',
    status          VARCHAR(50) DEFAULT 'scheduled',

    -- AI meeting intelligence
    transcript      TEXT,
    ai_summary      TEXT,
    ai_action_items JSONB DEFAULT '[]',  -- [{description, assignee_id, due_date}]
    ai_decisions    JSONB DEFAULT '[]',
    ai_risks_raised JSONB DEFAULT '[]',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    project_id      UUID REFERENCES projects(id),
    type            VARCHAR(100) NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT,
    channel         VARCHAR(50) DEFAULT 'in_app',  -- in_app, email, slack, sms
    read            BOOLEAN DEFAULT false,
    ai_urgency      VARCHAR(20),  -- critical, high, medium, low
    ai_batch_id     UUID,         -- for grouped notifications
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read);
```

### 3.11 Benefits Realization

```sql
CREATE TABLE benefits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    name            TEXT NOT NULL,
    description     TEXT,
    metric          TEXT NOT NULL,         -- "Customer satisfaction score"
    baseline_value  NUMERIC(15, 2),
    target_value    NUMERIC(15, 2),
    actual_value    NUMERIC(15, 2),
    measurement_source TEXT,               -- "CRM analytics", "finance system"
    realization_date DATE,
    status          VARCHAR(50) DEFAULT 'planned',  -- planned, tracking, realized, not_realized
    ai_attribution  JSONB,                -- {"contribution_pct": 23, "confidence": 0.75}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.12 Procurement

```sql
CREATE TABLE vendors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(50),
    category        VARCHAR(100),
    performance_rating NUMERIC(3, 2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE procurements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    vendor_id       UUID REFERENCES vendors(id),
    name            TEXT NOT NULL,
    description     TEXT,
    contract_type   VARCHAR(50),  -- fixed_price, time_and_materials, cost_reimbursable
    status          VARCHAR(50) DEFAULT 'planning',  -- planning, bidding, awarded, active, closed
    planned_amount  NUMERIC(15, 2),
    actual_amount   NUMERIC(15, 2),
    start_date      DATE,
    end_date        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.13 AI-Specific Tables

```sql
CREATE TABLE ai_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    project_id      UUID REFERENCES projects(id),
    title           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
    role            VARCHAR(20) NOT NULL,  -- user, assistant, system, tool
    content         TEXT NOT NULL,
    tool_calls      JSONB,
    agent_name      VARCHAR(100),  -- which agent produced this
    tokens_used     INTEGER,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_agent_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id),
    agent_name      VARCHAR(100) NOT NULL,
    task            TEXT NOT NULL,
    input_context   JSONB,
    output          TEXT,
    confidence      NUMERIC(3, 2),
    tokens_used     INTEGER,
    duration_ms     INTEGER,
    tools_used      JSONB DEFAULT '[]',
    status          VARCHAR(50),  -- success, failed, escalated
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_logs_project ON ai_agent_logs(project_id, created_at);

CREATE TABLE ai_knowledge_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id),  -- NULL = org-wide knowledge
    source_type     VARCHAR(50) NOT NULL,  -- document, lesson_learned, best_practice, project_data
    source_id       UUID,
    chunk_text      TEXT NOT NULL,
    chunk_index     INTEGER,
    metadata        JSONB DEFAULT '{}',
    s3_vector_key   VARCHAR(255),  -- key in S3 Vectors index
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lessons_learned (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    project_id      UUID REFERENCES projects(id),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        VARCHAR(100),
    outcome         VARCHAR(50),  -- success, failure, neutral
    tags            JSONB DEFAULT '[]',
    ai_extracted    BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. API Layer Design

### 4.1 Endpoint Map

All endpoints prefixed with `/api/v1`. Auth required unless noted.

#### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (public) |

#### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Email + password login, returns JWT |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/oauth/{provider}` | OAuth2 callback (Google, GitHub) |
| GET | `/auth/me` | Current user profile |

#### Organizations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/orgs` | Create organization |
| GET | `/orgs/{org_id}` | Get organization |
| PATCH | `/orgs/{org_id}` | Update organization |
| GET | `/orgs/{org_id}/members` | List members |
| POST | `/orgs/{org_id}/members` | Invite member |
| DELETE | `/orgs/{org_id}/members/{user_id}` | Remove member |

#### Projects (Scope Management)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/orgs/{org_id}/projects` | Create project (AI charter optional) |
| GET | `/orgs/{org_id}/projects` | List projects (filter by status, methodology) |
| GET | `/projects/{project_id}` | Get project detail |
| PATCH | `/projects/{project_id}` | Update project |
| DELETE | `/projects/{project_id}` | Soft-delete project |
| POST | `/projects/{project_id}/members` | Add project member |
| GET | `/projects/{project_id}/members` | List project members |
| POST | `/projects/{project_id}/ai/charter` | AI-generate charter from description |
| POST | `/projects/{project_id}/ai/feasibility` | AI feasibility & complexity score |

#### WBS (Work Breakdown Structure)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{project_id}/wbs` | Create WBS item |
| GET | `/projects/{project_id}/wbs` | Get full WBS tree |
| PATCH | `/wbs/{item_id}` | Update WBS item |
| DELETE | `/wbs/{item_id}` | Delete WBS item |
| POST | `/projects/{project_id}/wbs/ai/generate` | AI-generate WBS from description |
| POST | `/wbs/{item_id}/ai/decompose` | AI further decompose a WBS item |

#### Tasks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{project_id}/tasks` | Create task |
| GET | `/projects/{project_id}/tasks` | List tasks (filter, sort, paginate) |
| GET | `/tasks/{task_id}` | Get task detail |
| PATCH | `/tasks/{task_id}` | Update task |
| DELETE | `/tasks/{task_id}` | Soft-delete task |
| POST | `/tasks/{task_id}/assign` | Assign task (AI suggestion included) |
| POST | `/tasks/{task_id}/dependencies` | Add dependency |
| GET | `/tasks/{task_id}/dependencies` | Get task dependencies |

#### Schedule

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/{project_id}/gantt` | Get Gantt data (tasks + dependencies) |
| POST | `/projects/{project_id}/milestones` | Create milestone |
| GET | `/projects/{project_id}/milestones` | List milestones |
| PATCH | `/milestones/{milestone_id}` | Update milestone |
| GET | `/projects/{project_id}/cpm` | Run CPM analysis (critical path) |
| POST | `/projects/{project_id}/ai/estimate` | AI duration estimates for tasks |
| POST | `/projects/{project_id}/ai/conflicts` | Detect resource/schedule conflicts |

#### Cost & Budget

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{project_id}/budget-lines` | Create budget line |
| GET | `/projects/{project_id}/budget-lines` | List budget lines |
| POST | `/projects/{project_id}/cost-items` | Record cost item |
| GET | `/projects/{project_id}/cost-items` | List cost items |
| GET | `/projects/{project_id}/evm` | Get current EVM metrics |
| GET | `/projects/{project_id}/evm/history` | Get EVM snapshots over time |
| POST | `/projects/{project_id}/ai/budget-estimate` | AI budget estimation |

#### Risks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{project_id}/risks` | Create risk |
| GET | `/projects/{project_id}/risks` | List risks (filter by category, status) |
| PATCH | `/risks/{risk_id}` | Update risk |
| DELETE | `/risks/{risk_id}` | Close risk |
| POST | `/projects/{project_id}/risks/ai/scan` | AI auto-identify risks |
| POST | `/projects/{project_id}/risks/ai/simulate` | Monte Carlo risk simulation |
| GET | `/projects/{project_id}/issues` | List issues |
| POST | `/projects/{project_id}/issues` | Create issue |

#### Resources

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/{project_id}/resources` | Get resource allocation view |
| PATCH | `/resources/{profile_id}` | Update resource profile |
| GET | `/projects/{project_id}/workload` | Workload heatmap data |
| GET | `/projects/{project_id}/raci` | Get RACI matrix |
| POST | `/projects/{project_id}/raci` | Set RACI entry |
| POST | `/projects/{project_id}/ai/optimize-resources` | AI resource optimization |
| GET | `/projects/{project_id}/ai/skill-gaps` | AI skill gap analysis |

#### Stakeholders

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{project_id}/stakeholders` | Create stakeholder |
| GET | `/projects/{project_id}/stakeholders` | List stakeholders |
| PATCH | `/stakeholders/{id}` | Update stakeholder |
| POST | `/projects/{project_id}/stakeholders/ai/detect` | AI detect from documents |

#### Change Requests

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{project_id}/changes` | Create change request |
| GET | `/projects/{project_id}/changes` | List change requests |
| PATCH | `/changes/{id}` | Update change request |
| POST | `/changes/{id}/submit` | Submit for approval |
| POST | `/changes/{id}/approve` | Approve change |
| POST | `/changes/{id}/reject` | Reject change |
| POST | `/changes/{id}/ai/analyze` | AI impact analysis |

#### Portfolio

| Method | Path | Description |
|--------|------|-------------|
| POST | `/orgs/{org_id}/portfolios` | Create portfolio |
| GET | `/orgs/{org_id}/portfolios` | List portfolios |
| GET | `/portfolios/{id}` | Portfolio detail with project summaries |
| POST | `/portfolios/{id}/programs` | Create program |
| GET | `/portfolios/{id}/health` | Portfolio health scores |
| POST | `/portfolios/{id}/ai/align` | Strategic alignment scoring |
| POST | `/portfolios/{id}/ai/capacity` | Capacity planning analysis |
| GET | `/portfolios/{id}/ai/risk-propagation` | Cross-project risk analysis |

#### Benefits

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{project_id}/benefits` | Define benefit |
| GET | `/projects/{project_id}/benefits` | List benefits |
| PATCH | `/benefits/{id}` | Update benefit actuals |

#### Procurement

| Method | Path | Description |
|--------|------|-------------|
| POST | `/orgs/{org_id}/vendors` | Create vendor |
| GET | `/orgs/{org_id}/vendors` | List vendors |
| POST | `/projects/{project_id}/procurements` | Create procurement |
| GET | `/projects/{project_id}/procurements` | List procurements |
| PATCH | `/procurements/{id}` | Update procurement |

#### Meetings

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{project_id}/meetings` | Schedule meeting |
| GET | `/projects/{project_id}/meetings` | List meetings |
| PATCH | `/meetings/{id}` | Update meeting |
| POST | `/meetings/{id}/transcript` | Upload transcript |
| POST | `/meetings/{id}/ai/process` | AI extract actions, decisions, risks |

#### Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/{project_id}/reports/status` | Project status report |
| GET | `/projects/{project_id}/reports/health` | RAG health indicators |
| GET | `/portfolios/{id}/reports/overview` | Portfolio overview report |
| POST | `/projects/{project_id}/reports/ai/generate` | AI natural language report |
| POST | `/projects/{project_id}/reports/ai/daily-brief` | AI daily briefing |

#### AI Copilot

| Method | Path | Description |
|--------|------|-------------|
| POST | `/copilot/chat` | Send message, get response (non-streaming) |
| WS | `/ws/copilot/{conversation_id}` | Real-time chat (streaming) |
| GET | `/copilot/conversations` | List conversations |
| GET | `/copilot/conversations/{id}/messages` | Get conversation history |
| POST | `/copilot/ai/proactive` | Trigger proactive insights |

### 4.2 Pagination & Filtering Pattern

```python
# Standard list endpoint pattern
@router.get("/projects/{project_id}/tasks")
async def list_tasks(
    project_id: UUID,
    status: Optional[str] = Query(None),
    assignee_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    service: TaskService = Depends(get_task_service),
    user: User = Depends(get_current_user),
):
    return await service.list(
        project_id=project_id,
        filters=TaskFilters(status=status, assignee_id=assignee_id, search=search),
        sort=SortParams(field=sort_by, order=sort_order),
        cursor=cursor,
        limit=limit,
    )
```

### 4.3 WebSocket Copilot Protocol

```python
# Client -> Server
{
    "type": "message",
    "content": "What's the health of my project?",
    "project_id": "uuid",
    "conversation_id": "uuid"
}

# Server -> Client (streamed tokens)
{"type": "token", "content": "Based"}
{"type": "token", "content": " on current"}
{"type": "token", "content": " EVM data..."}

# Server -> Client (final)
{
    "type": "complete",
    "content": "Full response text...",
    "agent": "orchestrator",
    "tools_used": ["evm_tool", "db_query_tool"],
    "tokens_used": 842
}

# Server -> Client (proactive insight)
{
    "type": "insight",
    "title": "Task at risk",
    "body": "Task 5.2 is at risk due to dependency delay",
    "severity": "high",
    "project_id": "uuid",
    "actions": [{"label": "View task", "href": "/tasks/uuid"}]
}
```

---

## 5. AI Integration Architecture

### 5.1 Layered AI Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     COPILOT INTERFACE                            │
│  WebSocket chat · SSE streaming · Proactive notifications       │
├─────────────────────────────────────────────────────────────────┤
│                     AGENT ORCHESTRATION                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │Charter    │  │WBS        │  │Risk       │  │Report     │    │
│  │Agent      │  │Agent      │  │Agent      │  │Agent      │    │
│  ├───────────┤  ├───────────┤  ├───────────┤  ├───────────┤    │
│  │Estimation │  │Resource   │  │Stakeholder│  │Compliance │    │
│  │Agent      │  │Agent      │  │Agent      │  │Agent      │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
│                     ┌───────────────┐                           │
│                     │  Orchestrator  │ (routes to correct agent) │
│                     └───────┬───────┘                           │
├─────────────────────────────┼───────────────────────────────────┤
│                     LLM INTEGRATION                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐  │
│  │    LiteLLM      │ │  Bedrock LLMs   │ │  Titan Embeddings│  │
│  │  (unified proxy)│ │  Claude Sonnet  │ │  v2              │  │
│  │  routing/fallback│ │  Claude Haiku   │ │                  │  │
│  └─────────────────┘ └─────────────────┘ └────────┬─────────┘  │
├────────────────────────────────────────────────────┼────────────┤
│                    RAG PIPELINE                     │            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┴──────┐    │
│  │ Document │  │ Chunking │  │ Embedding│  │ S3 Vectors  │    │
│  │ Ingestion│──│ Service  │──│ Service  │──│ Index       │    │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                    KNOWLEDGE BASE                                │
│  Historical projects · Risk patterns · PMBOK corpus             │
│  Lessons learned · Industry benchmarks · Team performance       │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Multi-Agent Decision Making

#### Agent Registry

Each agent specializes in a PM knowledge area or process group. The orchestrator selects agents based on task classification.

| Agent | Domain | Model | Tools | Trigger Patterns |
|-------|--------|-------|-------|-----------------|
| **CharterAgent** | Initiating | bedrock/claude-sonnet | db_query, rag_search | "create charter", "define project", "business case" |
| **WBSAgent** | Scope Mgmt | bedrock/claude-sonnet | db_query, rag_search | "break down work", "create WBS", "decompose" |
| **EstimationAgent** | Schedule/Cost | bedrock/claude-sonnet | db_query, evm_tool, cpm_tool | "estimate duration", "how long", "budget" |
| **RiskAgent** | Risk Mgmt | bedrock/claude-sonnet | db_query, rag_search, simulation | "identify risks", "risk analysis", "what could go wrong" |
| **ResourceAgent** | Resource Mgmt | bedrock/claude-sonnet | db_query | "assign task", "who's available", "workload" |
| **StakeholderAgent** | Stakeholder Mgmt | bedrock/claude-haiku | db_query | "stakeholder analysis", "engagement" |
| **ReportAgent** | Reporting | bedrock/claude-sonnet | db_query, evm_tool | "status report", "summary", "dashboard" |
| **ComplianceAgent** | Governance | bedrock/claude-haiku | db_query, rag_search | "audit", "compliance", "approval" |
| **LessonsAgent** | Closing | bedrock/claude-sonnet | db_query, rag_search | "lessons learned", "retrospective", "what went well" |

#### Orchestrator Implementation

```python
# app/services/ai/agents/orchestrator.py
from enum import Enum
from dataclasses import dataclass

class AgentType(Enum):
    CHARTER = "charter"
    WBS = "wbs"
    ESTIMATION = "estimation"
    RISK = "risk"
    RESOURCE = "resource"
    STAKEHOLDER = "stakeholder"
    REPORT = "report"
    COMPLIANCE = "compliance"
    LESSONS = "lessons"

@dataclass
class AgentDecision:
    agent_type: AgentType
    confidence: float
    reasoning: str
    requires_tools: list[str]
    fallback_agent: AgentType | None = None

class Orchestrator:
    """Routes user requests to the appropriate specialist agent."""

    def __init__(self, llm_client: LLMClient, agents: dict[AgentType, BaseAgent]):
        self.llm = llm_client
        self.agents = agents

    async def decide(self, query: str, context: dict) -> AgentDecision:
        """Use Haiku for fast classification, then route."""
        classification = await self.llm.complete(
            model="bedrock/anthropic.claude-3-haiku-20240307-v1:0",
            messages=[{
                "role": "user",
                "content": self._build_classification_prompt(query, context)
            }],
            temperature=0,
            max_tokens=300,
        )
        return self._parse_decision(classification)

    async def execute(self, query: str, context: dict) -> AgentResult:
        """Decide and execute the appropriate agent."""
        decision = await self.decide(query, context)
        agent = self.agents[decision.agent_type]

        try:
            return await agent.run(query, context, tools=decision.requires_tools)
        except AgentError:
            if decision.fallback_agent:
                fallback = self.agents[decision.fallback_agent]
                return await fallback.run(query, context)
            raise
```

#### Base Agent Pattern

```python
# app/services/ai/agents/base.py
from abc import ABC, abstractmethod

class BaseAgent(ABC):
    """All agents follow this contract."""

    def __init__(self, llm_client: LLMClient, rag_service: RAGService):
        self.llm = llm_client
        self.rag = rag_service

    @abstractmethod
    async def run(
        self,
        query: str,
        context: dict,
        tools: list[str] | None = None,
    ) -> AgentResult:
        """Execute agent logic. Returns structured result."""
        ...

    async def retrieve_context(
        self,
        query: str,
        project_id: str,
        top_k: int = 5,
    ) -> list[dict]:
        """Retrieve relevant knowledge via RAG."""
        results = await self.rag.search(
            query=query,
            project_id=project_id,
            top_k=top_k,
        )
        return [{"text": r.text, "source": r.source, "score": r.score} for r in results]

    def build_system_prompt(self, domain_instructions: str) -> str:
        return f"""You are a Project Management AI assistant specialized in {domain_instructions}.
        
Rules:
- Ground answers in actual project data when available
- Cite sources when using retrieved context
- Be specific: use task IDs, dates, amounts
- Flag uncertainty: state confidence levels
- Follow PMI/PMBOK methodology
- Suggest actions, don't just describe problems
"""
```

### 5.3 RAG Pipeline (Amazon S3 Vectors)

#### Knowledge Sources

| Source | Ingestion Trigger | Chunking | Update Frequency |
|--------|-------------------|----------|-----------------|
| PMBOK/PRINCE2 corpus | Initial load | 512 tokens, 64 overlap | Static |
| Historical project data | Project close | By WBS element + by task | On project close |
| Lessons learned | Lesson created | By lesson entry | Real-time |
| Risk register patterns | Risk created/closed | By risk + category | Real-time |
| Project documents | Document upload | 512 tokens, 64 overlap | On upload |
| Meeting transcripts | After transcription | By speaker turn | On meeting close |
| Industry benchmarks | Scheduled sync | 512 tokens, 64 overlap | Weekly |

#### Ingestion Pipeline

```python
# app/services/ai/rag/ingestion.py
from litellm import aembedding

class IngestionPipeline:
    def __init__(self, vector_store: S3VectorStore):
        self.vector_store = vector_store

    async def ingest_document(
        self,
        project_id: str,
        document_id: str,
        content: str,
        metadata: dict,
    ):
        # 1. Chunk
        chunks = self.chunk(content, chunk_size=512, overlap=64)

        # 2. Embed via Titan (through LiteLLM)
        embeddings = await self.embed_batch([c.text for c in chunks])

        # 3. Store in S3 Vectors
        vectors = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            vectors.append({
                "key": f"{project_id}/{document_id}/chunk-{i}",
                "data": {"float32": embedding},
                "metadata": {
                    "text": chunk.text,
                    "project_id": project_id,
                    "source_type": "document",
                    "source_id": document_id,
                    **metadata,
                },
            })

        await self.vector_store.put_vectors(
            vectorBucketName="pm-knowledge-vectors",
            indexName="pm-knowledge",
            vectors=vectors,
        )

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        response = await aembedding(
            model="bedrock/amazon.titan-embed-text-v2:0",
            input=texts,
            aws_region_name="us-east-1",
        )
        return [item["embedding"] for item in response.data]

    def chunk(self, text: str, chunk_size: int, overlap: int) -> list[Chunk]:
        words = text.split()
        chunks = []
        start = 0
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunks.append(Chunk(text=" ".join(words[start:end]), index=len(chunks)))
            start += chunk_size - overlap
        return chunks
```

#### Query Pipeline

```python
# app/services/ai/rag/query.py
class RAGQueryService:
    async def query(
        self,
        question: str,
        project_id: str | None = None,
        top_k: int = 5,
    ) -> RAGResult:
        # 1. Embed query
        query_embedding = await self.embedding_service.embed(question)

        # 2. Search S3 Vectors
        filter_expr = {"project_id": project_id} if project_id else None
        results = await self.vector_store.query(
            vectorBucketName="pm-knowledge-vectors",
            indexName="pm-knowledge",
            queryVector={"float32": query_embedding},
            topK=top_k,
            returnMetadata=True,
            filter=filter_expr,
        )

        # 3. Build context
        context_chunks = [
            f"[Source: {v['metadata']['source_type']}]\n{v['metadata']['text']}"
            for v in results["vectors"]
        ]

        return RAGResult(
            context="\n\n---\n\n".join(context_chunks),
            sources=[v["metadata"] for v in results["vectors"]],
            scores=[v["distance"] for v in results["vectors"]],
        )
```

### 5.4 LLM Client (LiteLLM Integration)

```python
# app/services/ai/llm_client.py
import litellm

class LLMClient:
    """Unified LLM interface via LiteLLM."""

    def __init__(self, config: Settings):
        litellm.num_retries = 3
        litellm.request_timeout = 120
        litellm.drop_params = True

    async def complete(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> str:
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs,
        )
        return response.choices[0].message.content

    async def complete_streaming(
        self,
        model: str,
        messages: list[dict],
        **kwargs,
    ):
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            stream=True,
            **kwargs,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def complete_with_tools(
        self,
        model: str,
        messages: list[dict],
        tools: list[dict],
        temperature: float = 0.3,
    ) -> dict:
        """For function-calling patterns (agent tool use)."""
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            temperature=temperature,
        )
        return {
            "content": response.choices[0].message.content,
            "tool_calls": response.choices[0].message.tool_calls or [],
        }

    def count_tokens(self, messages: list[dict], model: str) -> int:
        return litellm.token_counter(model=model, messages=messages)

    def get_cost(self, response) -> float:
        return litellm.completion_cost(completion_response=response)
```

### 5.5 Agent-to-Feature Mapping

| PM Feature | Agent | RAG Context | LLM Model | Output |
|------------|-------|-------------|-----------|--------|
| Generate charter | CharterAgent | PMBOK templates, past charters | claude-sonnet | Structured charter JSON |
| Feasibility scoring | EstimationAgent | Historical outcomes | claude-sonnet | Score + reasoning |
| WBS generation | WBSAgent | Past WBS structures, domain patterns | claude-sonnet | Hierarchical WBS tree |
| Duration estimation | EstimationAgent | Historical task durations | claude-sonnet | Probability distributions |
| Cost estimation | EstimationAgent | Historical costs, market rates | claude-sonnet | Budget breakdown |
| Risk identification | RiskAgent | Risk patterns, past risks | claude-sonnet | Risk register entries |
| Resource optimization | ResourceAgent | Skills DB, availability | claude-sonnet | Allocation recommendations |
| Status reports | ReportAgent | Current project metrics | claude-sonnet | NL report |
| Scope creep detection | ComplianceAgent | Original scope baseline | claude-haiku | Flags + impact estimate |
| Sentiment analysis | (batch worker) | Team communications | claude-haiku | Sentiment scores |
| Lessons extraction | LessonsAgent | Project retrospective data | claude-sonnet | Categorized lessons |
| Proactive insights | Orchestrator | All project data | claude-sonnet | Prioritized insight list |

---

## 6. Frontend Architecture

### 6.1 Route Map

| Route | Page | Components |
|-------|------|------------|
| `/` | Dashboard | PortfolioOverview, ProjectCards, ProactiveInsights |
| `/login` | Auth | LoginForm |
| `/projects` | Project List | ProjectTable, ProjectFilters, CreateProjectDialog |
| `/projects/:id` | Project Dashboard | ProjectHealth, EVMChart, MilestoneTimeline, RiskHeatmap |
| `/projects/:id/wbs` | WBS Editor | WBSTree, WBSItemForm, AIGenerateDialog |
| `/projects/:id/schedule` | Schedule | GanttChart, MilestoneList, CPMView, ConflictAlerts |
| `/projects/:id/cost` | Cost & Budget | BudgetTable, EVMCurve, CostForecast, VarianceReport |
| `/projects/:id/risks` | Risk Register | RiskTable, RiskMatrix (5x5), AIScanResults, IssueList |
| `/projects/:id/resources` | Resources | WorkloadHeatmap, RACIMatrix, SkillGapPanel |
| `/projects/:id/stakeholders` | Stakeholders | StakeholderGrid, InfluenceMatrix |
| `/projects/:id/changes` | Change Requests | ChangeTable, ImpactAnalysis, ApprovalWorkflow |
| `/projects/:id/meetings` | Meetings | MeetingCalendar, MeetingDetail, ActionItems |
| `/projects/:id/reports` | Reports | ReportBuilder, ReportPreview, ExportDialog |
| `/portfolios` | Portfolio List | PortfolioCards |
| `/portfolios/:id` | Portfolio Detail | HealthScoreCard, ProjectComparison, CapacityPlanner |
| `/copilot` | AI Copilot | ChatInterface, ConversationList, InsightFeed |
| `*` (floating) | AI Copilot Sidebar | MinimizedChatWidget (always accessible) |

### 6.2 Component Hierarchy

```
<App>
├── <AuthProvider>
│   ├── <BrowserRouter>
│   │   ├── <AppShell>                    -- sidebar + header + copilot widget
│   │   │   ├── <Sidebar>                 -- navigation
│   │   │   ├── <Header>                  -- breadcrumbs, user menu, notifications
│   │   │   ├── <MainContent>
│   │   │   │   └── <Outlet>              -- route-specific pages
│   │   │   └── <CopilotWidget>           -- floating minimized chat
│   │   │
│   │   └── Routes...
│   │       ├── DashboardPage
│   │       ├── ProjectLayout>
│   │       │   ├── ProjectDashboardPage
│   │       │   ├── WBSPage
│   │       │   ├── SchedulePage
│   │       │   ├── CostPage
│   │       │   ├── RiskPage
│   │       │   ├── ResourcesPage
│   │       │   └── ReportsPage
│   │       ├── PortfolioPage
│   │       └── CopilotPage
```

### 6.3 Key Feature Components

#### Copilot Chat (`components/features/copilot/`)

```typescript
// ChatInterface.tsx
// - Message list with streaming tokens (SSE)
// - Markdown rendering for AI responses
// - Source citations as clickable chips
// - Tool usage indicators ("Querying project data...")
// - Quick actions: "Generate report", "Check risks", "Estimate schedule"

// CopilotWidget.tsx (floating)
// - Minimized: AI icon with notification badge
// - Expanded: compact chat interface
// - Keyboard shortcut: Cmd+K to toggle
```

#### WBS Editor (`components/features/wbs/`)

```typescript
// WBSTree.tsx
// - Recursive tree view with drag-and-drop reorder
// - Expand/collapse nodes
// - Inline edit for name, estimated hours
// - AI badge on auto-generated items
// - Context menu: decompose, delete, link task

// AIGenerateDialog.tsx
// - Textarea: paste requirements or describe deliverables
// - "Generate WBS" button -> calls POST /wbs/ai/generate
// - Preview tree before accepting
// - "Refine" button for iterative improvement
```

#### Gantt Chart (`components/features/schedule/`)

```typescript
// GanttChart.tsx
// - Horizontal timeline with task bars
// - Dependency arrows (finish-to-start, etc.)
// - Critical path highlighting (red bars)
// - Milestone diamonds
// - Resource conflict indicators
// - Drag to reschedule (with conflict detection)
// - Zoom levels: day, week, month
```

#### EVM Dashboard (`components/features/cost/`)

```typescript
// EVMCurve.tsx
// - S-curve chart: PV, EV, AC over time
// - Forecast cone (confidence bands from AI)
// - CPI/SPI trend lines
// - Variance annotations

// BudgetTable.tsx
// - Breakdown by WBS element and category
// - Planned vs. actual vs. forecast columns
// - Variance highlighting (red/amber/green)
// - Drill-down to cost items
```

#### Risk Matrix (`components/features/risk/`)

```typescript
// RiskMatrix.tsx
// - 5x5 grid (probability x impact)
// - Risk dots positioned by scores
// - Color by category
// - Click to open risk detail
// - AI-generated risks have sparkle icon

// AIScanResults.tsx
// - Shows AI-identified risks before acceptance
// - Each risk: description, category, scores, suggested response
// - Bulk accept or individual review
```

### 6.4 State Management

```typescript
// stores/projectStore.ts (Zustand)
interface ProjectStore {
  currentProject: Project | null;
  setCurrentProject: (p: Project) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

// stores/copilotStore.ts (Zustand)
interface CopilotStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  addMessage: (msg: Message) => void;
  setStreaming: (v: boolean) => void;
}

// hooks/useProjects.ts (TanStack Query)
export function useProjects(orgId: string) {
  return useQuery({
    queryKey: ['projects', orgId],
    queryFn: () => api.get<Project[]>(`/orgs/${orgId}/projects`).then(r => r.data),
  });
}

export function useCreateProject(orgId: string) {
  return useMutation({
    mutationFn: (data: CreateProjectDTO) =>
      api.post(`/orgs/${orgId}/projects`, data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', orgId] }),
  });
}

// hooks/useEVM.ts
export function useEVM(projectId: string) {
  return useQuery({
    queryKey: ['evm', projectId],
    queryFn: () => api.get(`/projects/${projectId}/evm`).then(r => r.data),
    refetchInterval: 60_000, // refresh every minute
  });
}

// hooks/useCopilot.ts
export function useCopilot(conversationId: string) {
  const addMessage = useCopilotStore(s => s.addMessage);
  
  const sendMessage = useCallback(async (content: string, projectId?: string) => {
    // WebSocket for real-time streaming
    const ws = new WebSocket(`ws://api/ws/copilot/${conversationId}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'token') {
        // Append token to current message
      } else if (data.type === 'complete') {
        addMessage({ role: 'assistant', content: data.content });
      }
    };
    ws.send(JSON.stringify({ type: 'message', content, project_id: projectId }));
  }, [conversationId, addMessage]);

  return { sendMessage };
}
```

### 6.5 Chart Libraries

| Chart Type | Library | Component |
|------------|---------|-----------|
| Gantt | Custom (visx or d3) | `GanttChart.tsx` |
| EVM S-curve | Recharts | `EVMCurve.tsx` |
| Burndown/Burnup | Recharts | `BurndownChart.tsx` |
| Risk Matrix | Custom (grid) | `RiskMatrix.tsx` |
| Workload Heatmap | Custom (grid) | `WorkloadHeatmap.tsx` |
| KPI Scorecards | shadcn Card | `KPICard.tsx` |
| Stakeholder Matrix | Custom (quadrant) | `InfluenceMatrix.tsx` |

### 6.6 Real-Time Updates

```typescript
// hooks/useRealtime.ts
export function useRealtime(projectId: string) {
  useEffect(() => {
    const ws = new WebSocket(`ws://api/ws/projects/${projectId}/events`);
    
    ws.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);
      
      switch (type) {
        case 'task_updated':
          queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
          break;
        case 'risk_created':
          queryClient.invalidateQueries({ queryKey: ['risks', projectId] });
          toast.info(`New risk identified: ${payload.name}`);
          break;
        case 'evm_snapshot':
          queryClient.invalidateQueries({ queryKey: ['evm', projectId] });
          break;
        case 'insight':
          toast.warning(payload.title, { description: payload.body });
          break;
      }
    };
    
    return () => ws.close();
  }, [projectId]);
}
```

---

## 7. Security, Authentication & Governance

### 7.1 Authentication

```
User Login
  │
  ├── Email + Password ──> bcrypt verify ──> JWT access_token (15min)
  │                                        ──> JWT refresh_token (7d, httpOnly cookie)
  │
  └── OAuth2 (Google/GitHub) ──> Provider callback ──> JWT pair

Every API Request:
  Authorization: Bearer <access_token>
    │
    └── FastAPI dependency: get_current_user()
          │
          ├── Verify JWT signature (RS256 or HS256)
          ├── Check expiration
          ├── Load user + org membership
          └── Inject into request context
```

### 7.2 Role-Based Access Control (RBAC)

**Organization level:**

| Role | Permissions |
|------|-------------|
| `admin` | Full org management, billing, member management |
| `pm` | Create/manage projects, manage project members |
| `member` | View projects they're assigned to, update assigned tasks |
| `viewer` | Read-only access to projects and reports |

**Project level:**

| Role | Permissions |
|------|-------------|
| `project_manager` | Full project control, AI features, reports |
| `team_lead` | Manage tasks, resources, risks within their area |
| `member` | Update own tasks, add comments, upload documents |
| `stakeholder` | View dashboards, reports, approve changes |

**Enforcement:**

```python
# app/api/deps.py
async def require_project_role(*roles: str):
    async def checker(
        project_id: UUID = Path(...),
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        membership = await get_project_membership(session, project_id, user.id)
        if not membership or membership.role not in roles:
            raise ForbiddenError("Insufficient permissions")
        return user
    return checker

# Usage in endpoints
@router.post("/projects/{project_id}/ai/charter")
async def ai_charter(
    user: User = Depends(require_project_role("project_manager")),
):
    ...
```

### 7.3 Data Isolation

- **Multi-tenancy**: `org_id` on all root entities, filtered at query level via SQLAlchemy session scope.
- **Row-level security**: PostgreSQL RLS policies for sensitive tables (optional, for regulated industries).
- **Project isolation**: Users can only access projects they're members of.

```python
# app/db/session.py
class TenantSession:
    """Automatically filters queries by org_id."""
    
    def __init__(self, session: AsyncSession, org_id: UUID):
        self.session = session
        self.org_id = org_id
    
    async def execute(self, stmt, **kwargs):
        # Auto-add org_id filter to all queries on tenant-scoped models
        ...
```

### 7.4 AI-Specific Security

| Concern | Mitigation |
|---------|------------|
| Prompt injection | Input sanitization, system prompt hardening, output validation |
| Data leakage between orgs | RAG queries scoped by org_id + project_id, never cross-tenant |
| PII in AI logs | Redact PII before logging agent interactions |
| Excessive AI actions | Human-in-the-loop: AI suggests, human confirms for destructive actions |
| Token/cost runaway | Per-user daily token budget, per-org monthly spend cap |
| Model hallucination | Ground responses in RAG context, cite sources, confidence scores |

```python
# app/core/ai_guardrails.py
class AIGuardrails:
    MAX_TOKENS_PER_REQUEST = 8192
    MAX_TOKENS_PER_USER_DAILY = 100_000
    MAX_COST_PER_ORG_MONTHLY = 500.00  # USD

    async def check_budget(self, user: User, estimated_tokens: int):
        daily_usage = await get_daily_token_usage(user.id)
        if daily_usage + estimated_tokens > self.MAX_TOKENS_PER_USER_DAILY:
            raise AIBudgetExceededError("Daily token limit reached")

    async def check_org_spend(self, org_id: UUID):
        monthly_cost = await get_monthly_ai_cost(org_id)
        if monthly_cost >= self.MAX_COST_PER_ORG_MONTHLY:
            raise AIBudgetExceededError("Monthly AI spend limit reached")
```

### 7.5 Audit Trail

All state-changing operations are logged.

```sql
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    user_id         UUID,
    action          VARCHAR(100) NOT NULL,  -- project.create, task.update, risk.ai_scan
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID,
    changes         JSONB,  -- {field: {old: X, new: Y}}
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at);
CREATE INDEX idx_audit_org ON audit_log(org_id, created_at);
```

AI actions get additional logging:

```python
# Every AI suggestion/action logged with:
# - Agent name, input prompt, output, confidence
# - User decision (accepted/rejected/modified)
# - Tokens used, cost, latency
```

### 7.6 Approval Workflows (Change Control)

```
Change Request Submitted
  │
  ├── AI Impact Analysis (auto)
  │     ├── Scope impact estimate
  │     ├── Schedule impact estimate
  │     ├── Cost impact estimate
  │     └── Scope creep flag
  │
  └── Approval Routing
        ├── AI determines approval path based on:
        │     ├── Change magnitude (hours, cost delta)
        │     ├── Risk level
        │     └── Stakeholder impact
        │
        ├── Small change (< 8h, < $2K): PM approves
        ├── Medium change (8-40h, $2K-$10K): PM + Sponsor
        └── Large change (> 40h, > $10K): CCB (Change Control Board)
              └── Multi-level: PM → Sponsor → Steering Committee
```

---

## 8. Deployment & Infrastructure

### 8.1 AWS Architecture

```
Internet
  │
  ├── CloudFront CDN
  │     ├── Origin 1: S3 (React SPA static build)
  │     ├── Origin 2: App Runner (FastAPI — API calls, /api/*)
  │     ├── Origin 3: App Runner (WebSocket — /ws/*)
  │     ├── SPA routing: custom error response → index.html
  │     ├── Edge caching: static assets (JS, CSS, images)
  │     └── WAF attached for DDoS / bot protection
  │
  ├── AWS App Runner
  │     ├── FastAPI Service (REST API)
  │     │     └── Auto-scaling: 1–10 instances (concurrency-based)
  │     ├── WebSocket Service (Copilot streaming)
  │     │     └── Auto-scaling: 1–5 instances (connection-based)
  │     └── Celery Workers Service (background jobs)
  │           └── Min 1 / Max 3 instances
  │
  ├── RDS PostgreSQL 16 (Multi-AZ)
  │     └── Read replica for reporting queries
  │
  ├── ElastiCache Redis
  │     ├── Celery broker
  │     ├── Session cache
  │     └── Real-time pub/sub
  │
  ├── S3 Buckets
  │     ├── pm-frontend-build (React static assets — CloudFront origin)
  │     ├── pm-documents (project documents, uploads)
  │     ├── pm-reports (generated PDFs, exports)
  │     └── pm-knowledge-vectors (S3 Vectors index for RAG)
  │
  ├── Bedrock (managed LLM access)
  │     ├── Claude 3.5 Sonnet
  │     ├── Claude 3 Haiku
  │     └── Titan Embeddings v2
  │
  └── Secrets Manager
        ├── DB credentials
        ├── JWT signing key
        └── OAuth client secrets
```

#### Why App Runner over ECS

| Concern | ECS Fargate | App Runner |
|---------|-------------|------------|
| **Setup complexity** | VPC, subnets, ALB, target groups, task defs, services | Source or container → service. Done. |
| **Auto-scaling** | Configure scaling policies, cooldown periods | Built-in concurrency-based scaling |
| **Load balancing** | Separate ALB + listener rules | Built-in, zero config |
| **SSL / TLS** | ACM cert on ALB, DNS alias | Auto-managed HTTPS endpoint |
| **CI/CD** | Push to ECR + update service | Connect to ECR or GitHub — auto-deploy on push |
| **WebSocket** | Sticky sessions on ALB, custom config | Native support |
| **Cost model** | Per vCPU-hour + per GB-hour (always running) | Per vCPU-second + per GB-second (scale to zero possible) |
| **Ops overhead** | Medium (cluster management, service updates) | Low (fully managed) |

**Trade-off:** App Runner has a per-service limit of 200 concurrent requests. For very high throughput, ECS remains an option. App Runner is the default; ECS is a fallback if scaling limits are hit.

#### CloudFront Distribution Config

```
CloudFront Distribution
  │
  ├── Behavior: /api/*
  │     Origin: App Runner (FastAPI)
  │     Cache: Disabled (dynamic)
  │     Allowed: GET, POST, PUT, PATCH, DELETE, OPTIONS
  │     Headers: Authorization, Content-Type, X-Request-ID
  │
  ├── Behavior: /ws/*
  │     Origin: App Runner (WebSocket)
  │     Cache: Disabled
  │     WebSocket: Enabled
  │     Allowed: GET, POST
  │
  ├── Behavior: /* (default)
  │     Origin: S3 (pm-frontend-build)
  │     Cache: Optimized (CachingOptimized policy)
  │     Error responses: 403 → /index.html (SPA routing)
  │                    404 → /index.html (SPA routing)
  │
  └── Settings:
        Price class: All edge locations
        TLS: TLSv1.2_2021 minimum
        HTTP/2 + HTTP/3 enabled
        WAF: Attached
```

### 8.2 App Runner Service Configuration

| Service | Instance | vCPU | Memory | Min Instances | Max Instances | Scaling Trigger |
|---------|----------|------|--------|---------------|---------------|-----------------|
| FastAPI (REST) | App Runner | 1 vCPU | 2 GB | 1 | 10 | Concurrency (requests/instance) |
| WebSocket (Copilot) | App Runner | 0.5 vCPU | 1 GB | 1 | 5 | Active connections |
| Celery Workers | App Runner | 1 vCPU | 2 GB | 1 | 3 | Queue depth (custom metric) |
| RDS | db.r6g.large | — | — | — | — | Storage auto-scale |
| Redis | cache.r6g.large | — | — | — | — | — |

**App Runner auto-scaling config:**

```yaml
# FastAPI service
auto_scaling:
  min_instances: 1
  max_instances: 10
  concurrency: 100  # requests per instance before scaling

# WebSocket service
auto_scaling:
  min_instances: 1
  max_instances: 5
  concurrency: 50  # active connections per instance

# Celery workers
auto_scaling:
  min_instances: 1
  max_instances: 3
  # Custom metric: Redis queue depth via CloudWatch
```

**App Runner deployment config (FastAPI example):**

```yaml
# apprunner.yaml (in repo root)
version: 1.0
runtime: python3
build:
  commands:
    build:
      - pip install -r requirements.txt
run:
  runtime-version: 3.12
  command: uvicorn app.main:app --host 0.0.0.0 --port 8000
  network:
    port: 8000
    env: PORT
  env:
    - name: DATABASE_URL
      value: $DATABASE_URL
    - name: REDIS_URL
      value: $REDIS_URL
    - name: AWS_REGION
      value: us-east-1
```

### 8.3 Environment Configuration

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    app_name: str = "PM AI Platform"
    environment: str = "development"  # development, staging, production
    debug: bool = False

    # Database
    database_url: str
    db_pool_size: int = 20
    db_max_overflow: int = 10

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Auth
    jwt_secret_key: str
    jwt_algorithm: str = "RS256"
    jwt_access_token_expire_min: int = 15
    jwt_refresh_token_expire_days: int = 7

    # OAuth
    google_client_id: str | None = None
    google_client_secret: str | None = None
    github_client_id: str | None = None
    github_client_secret: str | None = None

    # AWS
    aws_region: str = "us-east-1"
    aws_access_key_id: str | None = None  # None = use IAM role
    aws_secret_access_key: str | None = None

    # Bedrock
    bedrock_model_sonnet: str = "bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0"
    bedrock_model_haiku: str = "bedrock/anthropic.claude-3-haiku-20240307-v1:0"
    bedrock_embedding_model: str = "bedrock/amazon.titan-embed-text-v2:0"

    # S3 Vectors
    vector_bucket_name: str = "pm-knowledge-vectors"
    vector_index_name: str = "pm-knowledge"

    # S3 Documents
    s3_documents_bucket: str = "pm-platform-documents"
    s3_reports_bucket: str = "pm-platform-reports"

    # AI Guardrails
    max_tokens_per_request: int = 8192
    max_tokens_per_user_daily: int = 100_000
    max_cost_per_org_monthly: float = 500.00

    # LiteLLM
    litellm_request_timeout: int = 120
    litellm_num_retries: int = 3

    model_config = {"env_file": ".env", "case_sensitive": False}
```

### 8.4 CI/CD Pipeline

```
Push to main
  │
  ├── GitHub Actions
  │     ├── Lint (ruff, mypy)
  │     ├── Test (pytest + coverage)
  │     ├── Frontend lint + test (eslint, vitest)
  │     ├── Build React → push to S3 (pm-frontend-build)
  │     │     └── Invalidate CloudFront cache
  │     └── Build Docker images → push to ECR
  │           ├── pm-fastapi:latest
  │           └── pm-celery:latest
  │
  └── Deploy
        ├── Staging (auto on main):
        │     ├── App Runner: auto-deploy from ECR (image tag: staging-latest)
        │     ├── CloudFront: invalidation completes → staging is live
        │     └── Run E2E tests (Playwright) against staging
        │
        └── Production (manual approval):
              ├── App Runner: promote staging image to production
              │     └── Rolling deploy (zero-downtime)
              ├── CloudFront: invalidation completes → production is live
              └── Smoke tests against production
```

**App Runner deployment flow:**

```
GitHub Push
  │
  ▼
GitHub Actions
  │
  ├── Build & Test
  ├── Docker build → ECR
  └── App Runner auto-deploy (configured in App Runner console)
        │
        ├── Source: ECR image URI
        ├── Trigger: New image pushed to ECR (EventBridge rule)
        └── Deploy: Rolling (new instances receive traffic gradually)
```

**CloudFront cache invalidation:**

```bash
# After frontend build
aws cloudfront create-invalidation \
  --distribution-id $CF_DISTRIBUTION_ID \
  --paths "/*"
```

---

## 9. Observability

### 9.1 Logging

- **Structured logging**: `structlog` with JSON output
- **Log levels**: DEBUG (dev), INFO (staging), WARNING (prod)
- **Correlation IDs**: Request ID propagated through all layers
- **AI-specific logging**: Every agent invocation logged with tokens, latency, confidence

```python
# app/core/logging.py
import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
)
```

### 9.2 Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `http_request_duration_seconds` | Histogram | method, path, status |
| `http_requests_total` | Counter | method, path, status |
| `llm_tokens_used_total` | Counter | model, agent, user |
| `llm_cost_dollars_total` | Counter | model, org |
| `llm_request_duration_seconds` | Histogram | model, agent |
| `vector_search_duration_seconds` | Histogram | index |
| `celery_task_duration_seconds` | Histogram | task_name |
| `active_websocket_connections` | Gauge | — |
| `db_query_duration_seconds` | Histogram | operation, table |
| `evm_calculation_duration_seconds` | Histogram | project |

### 9.3 Alerting

| Alert | Condition | Severity |
|-------|-----------|----------|
| API error rate | > 5% in 5 min | Critical |
| API latency p99 | > 2s for 5 min | Warning |
| LLM latency | > 30s for any request | Warning |
| LLM cost spike | > 2x daily average | Warning |
| DB connections | > 80% pool | Warning |
| Celery queue depth | > 100 pending | Warning |
| Vector store errors | Any query failure | Critical |
| WebSocket disconnects | > 10% in 1 min | Critical |

### 9.4 Dashboards

| Dashboard | Contents |
|-----------|----------|
| System Health | API latency, error rate, DB connections, CPU/memory |
| AI Performance | LLM latency by model, token usage, cost over time, agent success rate |
| User Activity | Active users, projects created, tasks completed, copilot usage |
| RAG Pipeline | Ingestion rate, vector store size, search latency, embedding time |

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Months 1-4)

**Goal:** Core PM engine + basic AI copilot

| Deliverable | Backend | Frontend | AI |
|-------------|---------|----------|-----|
| Auth + Orgs | JWT auth, org CRUD, RBAC | Login, org settings | — |
| Projects | CRUD, members | Project list, dashboard | — |
| WBS | Tree CRUD, codes | WBS tree editor | — |
| Tasks | CRUD, status, assignment | Task list, Kanban board | — |
| Basic Schedule | Milestones, dependencies | Gantt chart (basic) | — |
| Copilot Chat | WebSocket endpoint | Chat interface | LiteLLM + Bedrock Sonnet, basic RAG |
| Status Reports | Report service | Report view | ReportAgent |

**Milestones:**
- M1.1: Auth + project CRUD working end-to-end
- M1.2: WBS + tasks functional with basic Gantt
- M1.3: Copilot chat operational with project data awareness
- M1.4: Auto-generated status reports

### Phase 2: Prediction (Months 5-8)

**Goal:** AI-powered estimation, risk management, resource optimization

| Deliverable | Backend | Frontend | AI |
|-------------|---------|----------|-----|
| Cost Management | Budget lines, cost items, EVM | Budget table, EVM curve | EstimationAgent |
| Risk Management | Risk register, issues | Risk matrix, risk table | RiskAgent + RAG |
| Resource Mgmt | Skills, workload, RACI | Workload heatmap, RACI | ResourceAgent |
| Smart Estimation | Duration/cost calculation | Estimate dialogs | EstimationAgent + Monte Carlo |
| Scope Creep Detection | Change request workflow | Change table, approval UI | ComplianceAgent |
| RAG Pipeline | S3 Vectors setup, ingestion | Document upload | IngestionPipeline |

**Milestones:**
- M2.1: EVM dashboard with CPI/SPI/S-curve
- M2.2: AI risk auto-identification from project data
- M2.3: Resource optimization suggestions
- M2.4: RAG pipeline ingesting project documents

### Phase 3: Optimization (Months 9-12)

**Goal:** Portfolio management, advanced AI, cross-project intelligence

| Deliverable | Backend | Frontend | AI |
|-------------|---------|----------|-----|
| Portfolio Management | Portfolio/program CRUD | Portfolio dashboard | — |
| Strategic Alignment | Scoring service | Alignment view | AlignmentAgent |
| Cross-Project Risk | Dependency graph | Risk propagation view | RiskAgent |
| Meeting Intelligence | Transcript processing | Meeting detail | CopilotAgent |
| Proactive Insights | Insight worker | Notification feed | Orchestrator |
| Stakeholder Management | Stakeholder CRUD | Influence matrix | StakeholderAgent |
| Benefits Tracking | Benefits CRUD | Benefits dashboard | — |

**Milestones:**
- M3.1: Portfolio dashboard with health scores
- M3.2: Cross-project risk propagation detection
- M3.3: Meeting transcript → action items pipeline
- M3.4: Daily proactive insight delivery

### Phase 4: Autonomous (Months 13-18)

**Goal:** Self-healing, continuous learning, advanced simulation

| Deliverable | Backend | Frontend | AI |
|-------------|---------|----------|-----|
| Self-Healing Schedules | Auto-resolve conflicts | Conflict resolution UI | EstimationAgent |
| Lessons Learned Mining | NLP extraction | Lessons library | LessonsAgent |
| Sentiment Analysis | Batch sentiment worker | Team health dashboard | Haiku batch |
| Capacity Planning | Forecast service | Capacity planner | EstimationAgent |
| Advanced Simulations | Monte Carlo engine | Simulation UI | RiskSimTool |
| Learning Loop | Feedback ingestion | — | All agents (retraining) |

**Milestones:**
- M4.1: Auto-resolved minor schedule conflicts
- M4.2: Organizational lessons learned knowledge base
- M4.3: Team sentiment monitoring dashboard
- M4.4: Portfolio-level capacity planning optimizer

---

## 11. Success Metrics

### Product Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Estimation accuracy | +30% over manual | AI estimate vs. actual vs. manual |
| PM time on reporting | -60% | Time tracking comparison |
| Risk identification | 85% material risks caught | Post-project audit |
| Schedule forecast accuracy | ±10% at midpoint | Predicted vs. actual |
| Scope creep detection | 90% flagged | Change log analysis |
| Meeting overhead | -40% status meetings | Calendar analysis |
| First-year project success | +20% | On-time, on-budget, on-scope |
| Team satisfaction | > 4.2/5.0 | Quarterly survey |

### Technical Metrics

| Metric | Target |
|--------|--------|
| API latency p95 | < 500ms |
| Copilot first token | < 2s |
| Copilot full response | < 15s |
| System uptime | 99.9% |
| EVM calculation | < 1s |
| RAG search latency | < 500ms |
| Document ingestion | < 30s per document |

### AI Cost Targets

| Component | Monthly Budget |
|-----------|---------------|
| Bedrock Sonnet | $800 |
| Bedrock Haiku | $200 |
| Titan Embeddings | $100 |
| S3 Vectors storage | $50 |
| **Total AI** | **$1,150** |

---

## 12. Open Questions & Future Considerations

| Item | Status | Decision Needed By |
|------|--------|--------------------|
| Self-hosted vs. managed LiteLLM proxy | Open | Phase 1 design review |
| PRINCE2 methodology support depth | Deferred | Phase 2 planning |
| Mobile app (React Native) | Deferred | Phase 3 planning |
| On-premise deployment option | Deferred | Customer demand |
| Integration with Jira/Azure DevOps | Deferred | Phase 3 planning |
| Voice interface for copilot | Deferred | Phase 4 planning |
| Knowledge graph (Neo4j) for relationships | Deferred | Phase 4, if RAG insufficient |
| Custom fine-tuned models | Deferred | After learning loop data collected |

---

## Appendix: Document References

| Document | Path |
|----------|------|
| PM Scope Definition | `docs/project-management-scope.md` |
| AI Solution Design | `docs/project-management-ai-solution.md` |
| This Design Document | `docs/design.md` |
| React UI Skill | `.opencode/skills/react-ui.md` |
| Python Backend Skill | `.opencode/skills/python-backend.md` |
| PostgreSQL Skill | `.opencode/skills/postgres-database.md` |
| LiteLLM Skill | `.opencode/skills/litellm-ai.md` |
| Multi-Agent Skill | `.opencode/skills/multi-agent.md` |
| AWS Bedrock + RAG Skill | `.opencode/skills/aws-bedrock-rag.md` |

