# Work-queue end-to-end tests

Real HTTP + real PostgreSQL + real browser. **Disposable databases only** — every script refuses a database whose name does not contain `test`.

```bash
cd backend
export PGUSER=bingo            # a superuser role that can create databases
./test/e2e/reset-db.sh bingo_test_e2e                 # recreate DB, run ALL migrations via `npm run migration:run:prod`, parity shim
npm run build                                         # tests run the built backend (dist/)
DATABASE_URL=postgres://bingo:bingo@localhost:5432/bingo_test_e2e \
  npx ts-node -T test/e2e/work-queue.api.e2e.ts       # 49 API tests

# UI tests need the frontend built with the API base INCLUDING /api:
(cd ../frontend && NEXT_PUBLIC_API_URL=http://localhost:5000/api npx next build)
./test/e2e/reset-db.sh bingo_test_e2e
DATABASE_URL=postgres://bingo:bingo@localhost:5432/bingo_test_e2e \
  npx ts-node -T test/e2e/work-queue.ui.e2e.ts        # 17 Playwright tests (screenshots -> $E2E_SHOTS)
```

`reset-db.sh` pre-marks migration `1670000000000` as applied (it breaks a from-scratch run) and applies a
**scratch-only parity shim** to `ledger_entries` (entity columns/enum that no migration creates). See the report.
