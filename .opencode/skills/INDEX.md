# Rosulo Projects - Local Skills Registry

This directory contains local skill definitions for the Rosulo Projects tech stack. Each skill file defines conventions, patterns, and guidelines for generating implementation code.

---

## Skills Index

| Skill | File | Scope |
|-------|------|-------|
| **React UI** | `react-ui.md` | Frontend: React 18+, TypeScript, Tailwind, shadcn/ui, TanStack Query |
| **Python Backend** | `python-backend.md` | Backend: FastAPI, SQLAlchemy, Pydantic v2, async patterns |
| **PostgreSQL** | `postgres-database.md` | Database: Schema design, migrations (Alembic), indexing, queries |
| **LiteLLM AI** | `litellm-ai.md` | AI Layer: Unified LLM integration via LiteLLM SDK/proxy |
| **Multi-Agent** | `multi-agent.md` | AI Architecture: Agent orchestration, routing, consensus, tools |
| **AWS Bedrock + RAG** | `aws-bedrock-rag.md` | Cloud AI: Bedrock LLMs, Titan Embeddings, S3 Vectors RAG pipeline |

---

## Architecture Overview

```
React (Frontend)
  |
  | REST / SSE
  |
FastAPI (Backend)
  |
  +-- PostgreSQL (Primary Data Store)
  |
  +-- LiteLLM (LLM Integration Layer)
  |     |
  |     +-- AWS Bedrock (Claude, Titan, Llama)
  |     +-- OpenAI (fallback/alternative)
  |
  +-- Multi-Agent Layer (Orchestrator + Specialists)
  |     |
  |     +-- Research Agent
  |     +-- Code Agent
  |     +-- Validation Agent
  |
  +-- RAG Pipeline
        |
        +-- Titan Embeddings (Bedrock)
        +-- S3 Vectors (Vector Store)
        +-- Augmented Prompt -> Claude
```

---

## How to Use

When generating code, load the relevant skill(s) for the task:

- Building a UI component? Load **react-ui.md**
- Creating an API endpoint? Load **python-backend.md** + **postgres-database.md**
- Adding an LLM feature? Load **litellm-ai.md** + **aws-bedrock-rag.md**
- Building agent workflows? Load **multi-agent.md** + **litellm-ai.md**

Skills are **stackable**. A full-stack AI feature may require 3-4 skills simultaneously.

---

## Quick Reference: Tech Decisions

| Concern | Choice |
|---------|--------|
| Frontend framework | React 18 + TypeScript |
| UI components | shadcn/ui + Tailwind CSS |
| State management | Zustand + TanStack Query |
| Backend framework | FastAPI (Python 3.12+) |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Database | PostgreSQL 16+ |
| LLM integration | LiteLLM (unified SDK/proxy) |
| LLM hosting | AWS Bedrock |
| Embeddings | Amazon Titan Embeddings v2 |
| Vector store | Amazon S3 Vectors |
| Agent orchestration | Custom multi-agent layer |

---

## Dependencies

### Python (Backend + AI)
```
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
alembic
pydantic-settings
litellm
boto3
httpx
ruff
mypy
pytest
pytest-asyncio
```

### JavaScript/TypeScript (Frontend)
```
react
react-dom
typescript
vite
tailwindcss
@tanstack/react-query
zustand
react-hook-form
zod
axios
vitest
@testing-library/react
playwright
```
