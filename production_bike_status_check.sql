-- READ-ONLY. Run each block separately on production and send the rows.
-- 1) Bikes that belong to a live loan but are not marked LOANED/SOLD
SELECT b.id AS bike_id, b.model, b.frame_number, b.status AS bike_status,
       l.id AS loan_id, l.loan_number, l.status AS loan_status, l.client_id
FROM bikes b JOIN loans l ON l.bike_id = b.id
WHERE l.status NOT IN ('CANCELLED','COMPLETED') AND b.status NOT IN ('LOANED','SOLD')
ORDER BY b.id;

-- 2) Bikes assigned to a client (assigned_client_id) but showing AVAILABLE
SELECT id, model, frame_number, status, assigned_client_id FROM bikes
WHERE assigned_client_id IS NOT NULL AND status = 'AVAILABLE';

-- 3) Bike loans with NO bike linked (bike given out but never recorded against a bike)
SELECT l.id, l.loan_number, l.client_id, l.status, l.created_at FROM loans l
WHERE l.loan_type = 'bike' AND l.bike_id IS NULL ORDER BY l.id;

-- 4) One bike on more than one live loan
SELECT bike_id, COUNT(*) AS live_loans, array_agg(id) AS loan_ids FROM loans
WHERE bike_id IS NOT NULL AND status NOT IN ('CANCELLED','COMPLETED') GROUP BY bike_id HAVING COUNT(*) > 1;

-- 5) Bikes marked LOANED with no live loan (stuck after a rejection)
SELECT b.id, b.model, b.frame_number, b.assigned_client_id FROM bikes b
WHERE b.status = 'LOANED' AND NOT EXISTS (
  SELECT 1 FROM loans l WHERE l.bike_id = b.id AND l.status NOT IN ('CANCELLED','COMPLETED'));

-- 6) Password reset requests that cross tenants (requests visible to an admin of another tenant)
SELECT r.id, r.status, u.email, u.tenant_id AS user_tenant, r.approved_by,
       (SELECT tenant_id FROM users a WHERE a.id = r.approved_by) AS approver_tenant
FROM password_reset_requests_v2 r JOIN users u ON u.id = r.user_id
WHERE r.approved_by IS NOT NULL
  AND (SELECT tenant_id FROM users a WHERE a.id = r.approved_by) IS DISTINCT FROM u.tenant_id;

-- 7) Loans approved/rejected by an admin of a different tenant (check audit trail)
SELECT l.id, l.tenant_id AS loan_tenant, u.tenant_id AS approver_tenant, l.approved_by
FROM loans l JOIN users u ON u.id = l.approved_by
WHERE l.approved_by IS NOT NULL AND u.tenant_id IS DISTINCT FROM l.tenant_id;
