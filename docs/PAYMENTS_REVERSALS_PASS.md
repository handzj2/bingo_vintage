# Payments & Reversals pass

Apply by copying the files over the repo (same relative paths), then run migration 034.
Order matters: deploy the migration before (or with) the backend, because the entity now maps new columns.

## Defects found by tracing the flow (all fixed here)
| # | Where | Problem |
|---|-------|---------|
| 1 | reversals page | Read `receipt_number`; API returns `receiptNumber`. Receipt column was blank and receipt search never matched. |
| 2 | reversals page | Read `reversalRequestedBy` / `reversalRequestReason`, which did not exist. The requester and reason always showed "—". |
| 3 | requestReversal | Wrote the requester into `reversed_by` (the "who reversed it" column). Now has its own columns. |
| 4 | rejectReversalRequest | No check that a request was pending: rejecting an already REVERSED payment set it back to COMPLETED without restoring the loan. Also overwrote the requester's reason with the rejection text. |
| 5 | approveReversalRequest | Did not require a pending request. |
| 6 | reversePayment | No tenant check; accepted FAILED/PENDING payments (would inflate loan balance); success message printed `${POLICY_REF}` literally (single-quoted string). |
| 7 | request/approve/reject | No tenant scoping. |
| 8 | findByReceiptNumber, findByLoanId | Not tenant scoped (any tenant's receipt readable). |
| 9 | reversals page | Pending list = filter of the first page of `/payments`; older requests were invisible. Now uses `/payments/reversal-requests`, plus "Load older payments". |
| 10 | reversals page | Managers saw Review buttons; API returned 403. UI now uses the same rule as the API (`payment.reverse`; admin/superadmin always). |
| 11 | POST /payments/:id/reverse | `RolesGuard(['admin'])` locked out superadmin and ignored `payment.reverse`; no ParseIntPipe. |
| 12 | request-reversal | Backend had no 10-char minimum although approve needs one, so a short request could never be approved. |
| 13 | date range | `new Date('YYYY-MM-DD')` is UTC midnight = 03:00 Kampala, dropping 3 hours of the first day; invalid dates were not rejected. |

## Added (the three missing frontend items)
- Payments page: **Search all payments in date range** (server, up to 1,000), **Find receipt** (exact number), and a **pending-reversals banner** for reviewers.

## Not done / needs your decision
- Cash drawer: reversal does not post anything to the drawer. Open drawers are fine (sums exclude REVERSED). A reversal after the drawer is closed leaves the closed drawer's recorded figures stale. Needs a policy decision.
- Self-approval: an admin can still approve a request they raised (they can also reverse directly, so this adds no new power). Say if you want dual control enforced.
- Verified only by syntax check. Nothing was compiled against the full project and the new spec was not executed.
- `features/admin/components/ReversalModal.tsx` is a *loan* reversal, outside this module; `LoanTab.tsx` is not imported anywhere I could find.
