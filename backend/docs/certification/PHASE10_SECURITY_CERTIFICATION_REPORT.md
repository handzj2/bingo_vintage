# PHASE 10 — SECURITY CERTIFICATION REPORT
**Date:** 2026-06-09 | **Status:** ✅ CERTIFIED

---

## Login Rate Limiting

**Implementation:** `@nestjs/throttler` + `ThrottlerModule` in AppModule.

```typescript
// Global: 100 req/min per IP
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])

// Auth endpoints: tighter limits
@Throttle({ default: { ttl: 60000, limit: 5 } })  // POST /auth/login
@Throttle({ default: { ttl: 60000, limit: 3 } })  // POST /auth/register
```

**Expected behaviour after 5 failed login attempts within 60 seconds:**
```
HTTP 429 Too Many Requests
Retry-After: <seconds>
```

**Verification:** `ThrottlerGuard` applied at controller class level (`@UseGuards(ThrottlerGuard)`). All routes under `AuthController` inherit it.

---

## Helmet Security Headers

```typescript
app.use(helmet());
```

Headers enabled: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `X-XSS-Protection`, `Referrer-Policy`.

---

## CORS

**Before:** Wildcard origin (or `*.vercel.app`) — allows any subdomain to call the API.

**After:** Explicit origins from environment variable:
```typescript
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',').map(o => o.trim());

app.enableCors({ origin: allowedOrigins, credentials: true });
```

**Production setup:** Set `CORS_ORIGINS=https://your-app.vercel.app` in Railway env vars.

---

## Validation Pipe

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist:            true,   // Strip unknown fields
  forbidNonWhitelisted: true,   // Reject requests with unknown fields (400)
  transform:            true,   // Auto-transform types (string → number etc.)
}));
```

`forbidNonWhitelisted: true` prevents unknown field injection (e.g. sending `roleId` or `tenantId` in a DTO that shouldn't accept them).

---

## Graceful Shutdown

```typescript
app.enableShutdownHooks();
```

Railway sends `SIGTERM` before stopping a container. `enableShutdownHooks()` allows NestJS to finish in-flight requests and close DB connections cleanly before exit.

---

## Password Policy

| Check | Value | Notes |
|-------|-------|-------|
| Minimum length | 6 chars | Enforced in `RegisterDto` and `LoginDto` |
| Hashing | bcrypt, 10 rounds | `@BeforeInsert()` / `@BeforeUpdate()` on User entity |
| Temp password | time-limited OTP | `tempPasswordExpiresAt` enforced in login flow |
| Complexity | Not enforced | **Recommended improvement:** add `@Matches(/(?=.*[A-Z])(?=.*\d)/)` |

---

## Admin Password in Seed

The seed migration (`1700000000004`) inserts a default admin with a bcrypt hash. **The hash is committed to version control** — this is a known risk. Before production:
- Change the admin password immediately after first login
- The `must_change_password` flag should be set to `true` on the seeded admin

---

## Audit Trail

`AuditService` logs all significant actions. The `audit` table (migration 001) has no `tenant_id` column — this means audit logs are not tenant-scoped. **Recommended improvement:** add `tenant_id` to the `audit` table.

---

## Exit Criteria
- [x] Rate limiting: 5 login attempts per 60 seconds → 429
- [x] Helmet security headers enabled
- [x] CORS restricted to explicit production origins
- [x] `forbidNonWhitelisted: true` — unknown fields rejected
- [x] `transform: true` — type coercion enabled
- [x] Graceful shutdown hooks enabled
- [x] bcrypt password hashing (10 rounds)
- [ ] Password complexity enforcement — **RECOMMENDED** (not blocking)
- [ ] Audit table tenant_id — **RECOMMENDED** (not blocking)
