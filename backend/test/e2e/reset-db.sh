#!/usr/bin/env bash
# Recreates a DISPOSABLE database (name must contain "test"), applies ALL migrations through the
# production command (npm run migration:run:prod), and pre-marks the superseded 1670000000000
# migration exactly like an already-bootstrapped production database would have it.
set -euo pipefail
DB="${1:-bingo_test_e2e}"; [[ "$DB" == *test* ]] || { echo "refusing: db name must contain 'test'"; exit 1; }
cd "$(dirname "$0")/../.."
su postgres -c "psql -q -c 'DROP DATABASE IF EXISTS $DB' -c 'CREATE DATABASE $DB OWNER bingo'"
export DATABASE_URL="postgres://bingo:bingo@localhost:5432/$DB"
su postgres -c "psql -q $DB -c 'CREATE TABLE migrations (id SERIAL PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL)' -c \"INSERT INTO migrations (timestamp,name) VALUES (1670000000000,'AddExpenseAndReconciliationTables1670000000000')\""
npm run migration:run:prod 2>&1 | grep -E "has been executed|failed|rror" | tail -40

# ── PRODUCTION-PARITY SHIM (scratch DB only) ────────────────────────────────────────────────
# Migrations alone create ledger_entries.balance, but LedgerService writes ledger_entries.balance_after.
# Production must already have balance_after (expense approval / payment reversal work there), so the
# scratch DB gets it too; otherwise those flows 500 here for a reason unrelated to the work queue.
su postgres -c "psql -q $DB -c 'ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS balance_after numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS created_by integer, ADD COLUMN IF NOT EXISTS branch_id integer DEFAULT 1'"
su postgres -c "psql -q $DB -c 'ALTER TABLE ledger_entries ALTER COLUMN transaction_type TYPE varchar USING transaction_type::text'"
su postgres -c "psql -q $DB -c 'ALTER TABLE ledger_entries ALTER COLUMN loan_id DROP NOT NULL, ALTER COLUMN client_id DROP NOT NULL'"
echo "applied parity shim: ledger_entries.balance_after/created_by/branch_id + transaction_type as text"
