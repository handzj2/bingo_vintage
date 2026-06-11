# Environment Variables

## Required Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | `super-secret-key-change-this` |
| `JWT_EXPIRES_IN` | JWT token expiry duration | `7d` |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | HTTP server port | `5000` |
| `CORS_ORIGINS` | Comma-separated allowed CORS origins | `https://your-app.vercel.app` |
| `FRONTEND_URL` | Frontend base URL (used in email links) | `https://your-app.vercel.app` |
| `SYNCHRONIZE` | TypeORM auto-sync (must be `false` in prod) | `false` |

## Optional Variables

| Variable | Description | Required When |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Using Supabase auth/storage |
| `SUPABASE_KEY` | Supabase anon/service key | Using Supabase auth/storage |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | SMS notifications enabled |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | SMS notifications enabled |
| `TWILIO_PHONE_NUMBER` | Twilio sender phone number | SMS notifications enabled |

## Platform Setup

### Railway (Backend)

1. Go to your Railway project → **Variables** tab.
2. Add each required variable from the table above.
3. Set `DATABASE_URL` to the Railway PostgreSQL plugin's connection string (available via the plugin's **Connect** tab).
4. Set `NODE_ENV=production` and `SYNCHRONIZE=false`.
5. Deploy — Railway will inject variables at runtime.

### Vercel (Frontend)

1. Go to your Vercel project → **Settings → Environment Variables**.
2. Add `NEXT_PUBLIC_API_URL` pointing to your Railway backend URL (e.g. `https://your-backend.railway.app`).
3. Redeploy after saving variables.

## Example .env (local development)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bingo_dev
JWT_SECRET=local-dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=5000
CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
SYNCHRONIZE=false
```

> **Warning:** Never commit a `.env` file containing real secrets to version control.
