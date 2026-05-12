---
name: db-migrator
description: Manages database migrations safely, including creation, validation, rollback planning, and execution guidance.
---
## Database Migrator Skill

Safely manage database schema changes with proper migration practices.

### When to Use
- When backend changes require schema modifications
- During planner-backend phase
- Before executor implements database changes
- For rollback planning

### Prerequisites
**CRITICAL**: Read `PROJECT_CONTEXT.md` for:
- Migration naming conventions
- Environment handling (dev, staging, prod)

Inspect the current schema using docker exec from PROJECT_CONTEXT.md → Dev Commands → DB Access.

### Migration Workflow

```
┌─────────────────────────────────────────────────────┐
│  1. Analyze Required Changes                         │
│     - Review spec for data model changes            │
│     - Compare with current schema                    │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│  2. Generate Migration                               │
│     - Create up migration                            │
│     - Create down migration (rollback)              │
│     - Add data migration if needed                   │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│  3. Validate Migration                               │
│     - Check syntax                                   │
│     - Verify rollback works                          │
│     - Test with sample data                          │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│  4. Document Migration                               │
│     - Add to migration plan                          │
│     - Document rollback procedure                    │
│     - Note data backup requirements                  │
└─────────────────────────────────────────────────────┘
```

### Step 1: Analyze Schema Changes

Run the following commands (substituting values from PROJECT_CONTEXT.md → Dev Commands → DB Access):

```bash
# List all tables and columns
docker exec -i ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c "
  SELECT table_name, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position;
"

# List indexes
docker exec -i ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c "
  SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';
"

# List constraints
docker exec -i ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c "
  SELECT conname, contype, conrelid::regclass FROM pg_constraint;
"
```

### Step 2: Generate Migration

#### golang-migrate
```bash
# Criar nova migration
migrate create -ext sql -dir db/migrations -seq add_user_refresh_token

# Aplicar migrations
migrate -path db/migrations -database $DATABASE_URL up

# Rollback
migrate -path db/migrations -database $DATABASE_URL down 1

# Status
migrate -path db/migrations -database $DATABASE_URL version
```

Exemplo de arquivos SQL gerados:
```sql
-- 000001_add_user_refresh_token.up.sql
ALTER TABLE users ADD COLUMN refresh_token VARCHAR(512);
ALTER TABLE users ADD COLUMN token_expires_at TIMESTAMPTZ;
CREATE INDEX idx_users_refresh_token ON users(refresh_token);

-- 000001_add_user_refresh_token.down.sql
DROP INDEX IF EXISTS idx_users_refresh_token;
ALTER TABLE users DROP COLUMN IF EXISTS token_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS refresh_token;
```

### Step 3: Migration Safety Rules

#### MUST DO
- Always write rollback (down) migration
- Test migration on copy of production data
- Back up database before production migration
- Use transactions for multi-step migrations
- Add indexes for new foreign keys

#### MUST NOT DO
- Drop columns without data backup
- Rename columns without application coordination
- Add NOT NULL without default value
- Run migrations during peak traffic
- Skip staging environment testing

### Step 4: Data Migration Patterns

#### Adding Required Column
```sql
-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN status VARCHAR(20);

-- Step 2: Backfill data
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Step 3: Make NOT NULL
ALTER TABLE users ALTER COLUMN status SET NOT NULL;
```

#### Renaming Column (Zero Downtime)
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- Step 2: Backfill
UPDATE users SET full_name = name;

-- Step 3: Update application to use both columns

-- Step 4: (Later migration) Drop old column
ALTER TABLE users DROP COLUMN name;
```

### Step 5: Migration Plan Document

Create in `.opencode/work/tasks/migration-plan-<issue-num>.md`:

```markdown
# Migration Plan: Issue #<num>

## Overview
<what schema changes are needed and why>

## Changes

### Table: users
| Action | Column | Type | Notes |
|--------|--------|------|-------|
| ADD | refresh_token | VARCHAR(512) | Nullable, indexed |
| ADD | token_expires_at | TIMESTAMP | Nullable |

### Indexes
| Action | Name | Columns |
|--------|------|---------|
| CREATE | ix_users_refresh_token | refresh_token |

## Migration Files
- `migrations/20240315_add_user_refresh_token.js`

## Execution Plan

### Pre-Migration
- [ ] Backup database
- [ ] Verify disk space
- [ ] Schedule maintenance window (if needed)

### Migration
```bash
# Development
migrate -path db/migrations -database $DATABASE_URL up

# Staging
DATABASE_URL=$STAGING_DATABASE_URL migrate -path db/migrations -database $DATABASE_URL up

# Production
DATABASE_URL=$PROD_DATABASE_URL migrate -path db/migrations -database $DATABASE_URL up
```

### Rollback Plan
```bash
# If issues occur
migrate -path db/migrations -database $DATABASE_URL down 1

# Verify status
migrate -path db/migrations -database $DATABASE_URL version
```

### Post-Migration
- [ ] Verify schema matches expected
- [ ] Run smoke tests
- [ ] Monitor for errors

## Estimated Duration
- Migration: ~2 minutes
- Rollback: ~1 minute

## Risk Assessment
- **Risk:** Low
- **Data Loss Potential:** None (additive only)
- **Downtime Required:** No
```

### Step 6: Validation

```bash
# Check current migration version
migrate -path db/migrations -database $DATABASE_URL version

# Test rollback
migrate -path db/migrations -database $DATABASE_URL up && \
migrate -path db/migrations -database $DATABASE_URL down 1 && \
migrate -path db/migrations -database $DATABASE_URL up
```

### Output Format

```
## Migration Plan Ready

**Issue:** #42
**Migration:** add_user_refresh_token

### Schema Changes
- users.refresh_token (ADD, VARCHAR(512))
- users.token_expires_at (ADD, TIMESTAMP)
- ix_users_refresh_token (CREATE INDEX)

### Files Created
- migrations/20240315_add_user_refresh_token.js

### Risk Level: Low
- Additive changes only
- No data modification
- Rollback tested

### Plan Document
- .opencode/work/tasks/migration-plan-42.md

Ready for: @executor to implement application changes
```

### Integration
- Used by: `executor` (when tasks involve database schema changes)
- Reports to: `todo-manager` — migration plan document linked in `.opencode/work/tasks/<id>.md`
- Uses: docker exec psql (commands from PROJECT_CONTEXT.md → Dev Commands → DB Access)
