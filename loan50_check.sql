-- loan50_check.sql
-- Read-only diagnostic for loan 50 schedule versioning issues.
-- Run on production. Does not modify any data.
-- Send the full output back for review.

\echo '=== 1. Loan 50 header ==='
SELECT id, loan_number, principal, balance, total_amount, status,
       loan_type, term_weeks, interest_rate, created_at, updated_at
  FROM loans
 WHERE id = 50 OR loan_number ILIKE '%50%';

\echo ''
\echo '=== 2. Schedule versions summary for loan 50 ==='
SELECT version,
       COALESCE(is_active, true) AS is_active,
       COUNT(*)                  AS instalments,
       MIN(installment_number)   AS first_inst,
       MAX(installment_number)   AS last_inst,
       ROUND(SUM(amount_due)::numeric, 0)   AS total_due,
       ROUND(SUM(amount_paid)::numeric, 0)  AS total_paid,
       ROUND(SUM(amount_due - amount_paid)::numeric, 0) AS outstanding,
       MIN(due_date) AS first_due,
       MAX(due_date) AS last_due,
       MIN(created_at) AS version_created
  FROM loan_schedules
 WHERE loan_id = 50
 GROUP BY version, COALESCE(is_active, true)
 ORDER BY version, is_active DESC;

\echo ''
\echo '=== 3. Live (active) schedule detail — first 15 and last 5 ==='
SELECT id, version, installment_number, due_date, amount_due, amount_paid,
       status, penalty_amount, is_active
  FROM loan_schedules
 WHERE loan_id = 50
   AND COALESCE(is_active, true) = true
 ORDER BY installment_number
 LIMIT 15;

\echo '... (middle rows omitted) ...'

SELECT id, version, installment_number, due_date, amount_due, amount_paid,
       status, penalty_amount, is_active
  FROM loan_schedules
 WHERE loan_id = 50
   AND COALESCE(is_active, true) = true
 ORDER BY installment_number DESC
 LIMIT 5;

\echo ''
\echo '=== 4. Inactive / superseded schedule rows (sample) ==='
SELECT id, version, installment_number, due_date, amount_due, amount_paid,
       status, is_active, superseded_at, superseded_by_version
  FROM loan_schedules
 WHERE loan_id = 50
   AND COALESCE(is_active, true) = false
 ORDER BY version, installment_number
 LIMIT 20;

\echo ''
\echo '=== 5. Payments allocated to inactive schedule rows (potential problem) ==='
SELECT p.id AS payment_id, p.amount, p.payment_date, p.status AS payment_status,
       pa.schedule_id, pa.amount_applied, pa.previous_status, pa.new_status,
       ls.version AS sched_version, ls.is_active, ls.installment_number, ls.amount_due
  FROM payment_allocations pa
  JOIN payments p ON p.id = pa.payment_id
  JOIN loan_schedules ls ON ls.id = pa.schedule_id
 WHERE ls.loan_id = 50
   AND COALESCE(ls.is_active, true) = false
   AND (pa.reversed_at IS NULL)
 ORDER BY p.payment_date, pa.id;

\echo ''
\echo '=== 6. Total completed payments vs active schedule paid ==='
SELECT
  (SELECT COALESCE(SUM(amount),0) FROM payments
    WHERE loan_id = 50 AND status = 'COMPLETED' AND reversed_at IS NULL) AS total_completed_payments,
  (SELECT COALESCE(SUM(amount_paid),0) FROM loan_schedules
    WHERE loan_id = 50 AND COALESCE(is_active,true) = true) AS active_schedule_amount_paid,
  (SELECT COALESCE(SUM(amount_due),0) FROM loan_schedules
    WHERE loan_id = 50 AND COALESCE(is_active,true) = true) AS active_schedule_total_due,
  (SELECT balance FROM loans WHERE id = 50) AS stored_loan_balance;

\echo ''
\echo '=== 7. loan_corrections history for loan 50 ==='
SELECT id, correction_type, status, reason, schedule_version,
       requested_by_id, approved_by_id, applied_at, created_at
  FROM loan_corrections
 WHERE loan_id = 50
 ORDER BY created_at;

\echo ''
\echo '=== Done. Please send the full output. ==='
