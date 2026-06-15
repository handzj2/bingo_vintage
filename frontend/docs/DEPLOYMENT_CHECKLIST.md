# BINGO VINTAGE — DEPLOYMENT CHECKLIST

## Railway (Backend)

### Required Environment Variables
| Variable | Example | Status |
|----------|---------|--------|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Required |
| `JWT_SECRET` | min 32 random chars | Required |
| `NODE_ENV` | `production` | Required |
| `PORT` | `3001` | Optional (Railway auto-sets) |
| `CORS_ORIGINS` | `https://your-app.vercel.app` | Required |

### Pre-deployment
- [ ] Run `npm run migration:show` — confirm all migrations pending
- [ ] Verify `synchronize: false` in production config (enforced in code)
- [ ] Confirm `JWT_SECRET` is at least 32 characters
- [ ] Confirm `DATABASE_URL` points to production DB

### Post-deployment
- [ ] `GET /api/health` returns `{"status":"healthy"}`
- [ ] Login returns valid JWT
- [ ] Loan creation creates repayment schedule
- [ ] Cash drawer open/close/reconcile flow passes

## Vercel (Frontend)

### Required Environment Variables
| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://your-api.railway.app/api` |

### Checklist
- [ ] `NEXT_PUBLIC_API_URL` set to Railway backend URL
- [ ] Login page works end-to-end
- [ ] Loan form submits successfully
- [ ] Payment recording works

## Final Certification Criteria
- [ ] Zero schema drift (migrations authoritative)
- [ ] Zero FK violations
- [ ] Loan creation generates repayment schedule
- [ ] Cash drawer balance formula verified
- [ ] Reconciliation locks drawer after completion
- [ ] Rate limiting active on /auth/login
- [ ] Health endpoint returns healthy
- [ ] CORS restricted to production origins only
