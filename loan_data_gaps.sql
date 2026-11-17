-- loan_data_gaps.sql  — READ ONLY. Lists loans whose recorded data looks incomplete or inconsistent.
-- Run on a copy or on production; it changes nothing. Send the result back to review the rows.
--
-- loan_number, client_id, principal_amount and start_date are NOT NULL in the schema, so a loan
-- page that shows them blank is a display problem, not missing data. The real gaps are below.

SELECT l.id,
       l.loan_number,
       l.loan_type,
       c.first_name || ' ' || c.last_name           AS client,
       l.principal_amount, l.total_amount, l.balance,
       l.term_weeks, l.term_months,
       l.start_date, l.end_date,
       ARRAY_REMOVE(ARRAY[
         CASE WHEN l.end_date IS NULL                                   THEN 'no end date' END,
         CASE WHEN l.loan_type ILIKE 'cash' AND COALESCE(l.term_weeks,0) > 0
                                                                         THEN 'recorded as CASH but has a weekly term (looks like a bike loan)' END,
         CASE WHEN l.loan_type ILIKE 'cash' AND l.bike_id IS NOT NULL    THEN 'recorded as CASH but linked to a bike' END,
         CASE WHEN l.loan_type ILIKE 'bike' AND COALESCE(l.term_weeks,0) = 0
                                                                         THEN 'bike loan with no term in weeks' END,
         CASE WHEN l.loan_type ILIKE 'cash' AND COALESCE(l.term_months,0) = 0
                                                                         THEN 'cash loan with no term in months' END,
         CASE WHEN l.principal_amount <= 0                               THEN 'principal is zero' END,
         CASE WHEN l.balance > l.total_amount                            THEN 'balance is higher than total' END,
         CASE WHEN c.id IS NULL                                          THEN 'client record missing' END,
         CASE WHEN NOT EXISTS (SELECT 1 FROM loan_schedules s
                                WHERE s.loan_id = l.id AND COALESCE(s.is_active, true))
                                                                         THEN 'no live schedule' END
       ], NULL)                                      AS problems
  FROM loans l
  LEFT JOIN clients c ON c.id = l.client_id
 WHERE l.deleted_at IS NULL
   AND l.status NOT IN ('CANCELLED', 'REJECTED')
 ORDER BY l.id;
-- Keep only the rows that have a problem by wrapping the above:  SELECT * FROM (...) t WHERE problems <> '{}';

-- ─────────────────────────────────────────────────────────────────────────────
-- Payments already saved with a date in the future (the rule now blocks new ones; this finds old ones).
-- Read only. Anything listed here should be reviewed and reversed or corrected through the Payments screen.
SELECT p.id, p.loan_id, l.loan_number, p.amount, p.payment_date, p.status, p.receipt_number, p.created_at
  FROM payments p
  JOIN loans l ON l.id = p.loan_id
 WHERE p.payment_date > NOW() + INTERVAL '10 minutes'
   AND p.status <> 'REVERSED'
 ORDER BY p.payment_date DESC;
