# PostgreSQL Database Skill

## Overview

Schema design, migration management, query optimization, and operational patterns for PostgreSQL as the primary data store.

---

## Version & Extensions

- **PostgreSQL**: 16+
- **Required Extensions**: `uuid-ossp` or `gen_random_uuid()`, `pg_trgm` (fuzzy search), `pgvector` (if local embeddings needed)
- **Migration Tool**: Alembic (Python) or Prisma Migrate (if TypeScript backend)
- **Connection Pool**: pgbouncer (production) or async driver pool (SQLAlchemy asyncpg / Prisma)

---

## Schema Design Principles

### Naming

- Tables: **plural, snake_case** (`users`, `projects`, `audit_logs`)
- Columns: **snake_case** (`created_at`, `first_name`, `is_active`)
- Primary keys: `id` (UUID type, generated with `gen_random_uuid()`)
- Foreign keys: `{referenced_table}_id` (`user_id`, `project_id`)
- Timestamps: `created_at`, `updated_at` on every table
- Soft deletes: `deleted_at` nullable timestamp

### Data Types

| Use Case | Type |
|----------|------|
| Primary/Foreign keys | `UUID` |
| Short text (< 256 chars) | `VARCHAR(n)` or `TEXT` |
| Long text | `TEXT` |
| Boolean flags | `BOOLEAN` (default `false`) |
| Money/precise decimals | `NUMERIC(precision, scale)` |
| Timestamps | `TIMESTAMPTZ` (always with timezone) |
| JSON data | `JSONB` (indexed, not `JSON`) |
| Arrays | `TYPE[]` (use sparingly, normalize preferentially) |
| Enums | Custom `CREATE TYPE` or app-level validation |

### Base Model Pattern

Every table includes these columns:

```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    -- domain columns below
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        TEXT NOT NULL
);
```

### Auto-Update Trigger

Apply to every table:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

---

## Indexing Strategy

- **B-tree** (default): equality, range, sort queries
- **GIN**: JSONB containment, array operations, full-text search
- **GiST**: geometric, range types, exclusion constraints
- **Partial indexes**: for filtered queries (`WHERE deleted_at IS NULL`)
- **Covering indexes** (`INCLUDE`): to enable index-only scans

```sql
-- Composite index for common query pattern
CREATE INDEX idx_users_email_active 
    ON users (email) 
    WHERE deleted_at IS NULL;

-- JSONB index
CREATE INDEX idx_events_payload 
    ON events USING GIN (payload jsonb_path_ops);

-- Covering index
CREATE INDEX idx_orders_user_date 
    ON orders (user_id, created_at DESC) 
    INCLUDE (total_amount);
```

### Rules

- Index foreign keys used in JOINs.
- Add indexes for columns in WHERE, ORDER BY, GROUP BY.
- Monitor with `pg_stat_user_indexes` for unused indexes.
- Never index every column blindly; each index has write cost.

---

## Migrations (Alembic)

### Principles

- Every schema change goes through a migration.
- Migrations are immutable once deployed.
- Use `op.batch_alter_table` for SQLite compatibility if needed.
- Separate data migrations from schema migrations.
- Review autogenerate output before committing.

### Patterns

```python
# alembic migration
def upgrade():
    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_projects_user_id", "projects", ["user_id"])

def downgrade():
    op.drop_index("idx_projects_user_id")
    op.drop_table("projects")
```

### Safe Migration Checklist

- [ ] No `NOT NULL` without `DEFAULT` on existing tables
- [ ] Large table alters use concurrent index creation (`CREATE INDEX CONCURRENTLY`)
- [ ] Data backfills run in batches (not one giant transaction)
- [ ] Migration tested on staging before production

---

## Query Patterns

### Pagination (Cursor-based preferred)

```sql
-- Cursor-based (stable, performant)
SELECT * FROM users
WHERE created_at < $cursor
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Offset-based (simpler, but degrades on large offsets)
SELECT * FROM users
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;
```

### Soft Delete Filtering

- Apply `WHERE deleted_at IS NULL` via SQLAlchemy query scope or view.
- Never expose soft-deleted records to clients.

### JSONB Queries

```sql
-- Extract value
SELECT payload->>'event_type' FROM events;

-- Containment
SELECT * FROM events WHERE payload @> '{"status": "completed"}';

-- Path query
SELECT * FROM events WHERE payload @? '$.tags[*] ? (@ == "urgent")';
```

---

## Connection Management

- **Production**: pgbouncer in transaction mode in front of PostgreSQL.
- **Pool size**: `(2 * CPU cores) + effective_spinning_disks` as starting point.
- **Async driver**: `asyncpg` (fastest) for Python, `pg` (node-postgres) for Node.
- **Connection timeout**: 10s acquire, 30s query statement timeout.
- **Health check**: `SELECT 1` on borrow.

---

## Backup & Recovery

- **Continuous archiving**: WAL-G or pgBackRest to S3.
- **Point-in-time recovery** (PITR) enabled.
- **Logical backups**: `pg_dump` for small databases, schema-only exports.
- **Schedule**: Continuous WAL shipping + daily full base backup.
- **Test restores**: Monthly restore drill to verify backup integrity.

---

## Monitoring & Observability

### Key Metrics

- Connection pool utilization
- Query latency (p50, p95, p99)
- Slow query log (queries > 100ms)
- Table/index bloat
- Replication lag (if replicas)
- Lock contention

### Tools

- `pg_stat_statements`: query performance tracking
- `pg_stat_user_tables`: sequential scan counts, dead tuples
- `auto_explain`: auto-log slow query plans
- Prometheus + Grafana with `postgres_exporter`

### Maintenance

- `VACUUM ANALYZE` schedule (autovacuum tuned)
- `REINDEX` bloated indexes periodically
- Partition large tables (>100M rows) by time range

---

## Security

- Row-level security (RLS) for multi-tenant data isolation.
- Least-privilege roles: app user (no DDL), migration user (DDL), read-only (reporting).
- SSL/TLS enforced for all connections.
- `pg_hba.conf`: reject non-SSL, non-authenticated connections.
- Audit logging via `pgaudit` extension for compliance.
