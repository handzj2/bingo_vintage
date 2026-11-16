import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { Client } from 'pg';
import * as jwt from 'jsonwebtoken';
import { assertDisposableDb } from './seed';

export const JWT_SECRET = 'e2e-secret-e2e-secret';
export const API_PORT = Number(process.env.E2E_API_PORT || 5000);
export const API = `http://localhost:${API_PORT}/api`;

export interface Server { proc: ChildProcess; logs: string[]; stop: () => Promise<void> }

export async function startServer(databaseUrl: string): Promise<Server> {
  assertDisposableDb(databaseUrl);
  const logs: string[] = [];
  const proc = spawn('node', ['dist/src/main'], {
    cwd: path.resolve(__dirname, '../..'),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl, JWT_SECRET, PORT: String(API_PORT), NODE_ENV: 'production',
      CORS_ORIGINS: 'http://localhost:3000',
    },
  });
  const onData = (d: Buffer) => d.toString().split('\n').forEach((l) => l && logs.push(l));
  proc.stdout!.on('data', onData); proc.stderr!.on('data', onData);
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (logs.some((l) => l.includes('successfully started'))) break;
  }
  if (!logs.some((l) => l.includes('successfully started'))) throw new Error('server did not start:\n' + logs.slice(-20).join('\n'));
  return {
    proc, logs,
    stop: () => new Promise((res) => { proc.once('exit', () => res()); proc.kill('SIGTERM'); setTimeout(() => proc.kill('SIGKILL'), 3000); }),
  };
}

export const tokenFor = (userId: number, username: string) => jwt.sign({ sub: userId, username }, JWT_SECRET, { expiresIn: '2h' });

export async function call(method: string, p: string, token?: string, body?: any) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = {}; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

export async function connect(url: string) { assertDisposableDb(url); const c = new Client({ connectionString: url }); await c.connect(); return c; }

// ── mini test runner ────────────────────────────────────────────────────────
export type Result = { section: string; name: string; ok: boolean; error?: string };
export const results: Result[] = [];
let section = '';
export const setSection = (s: string) => { section = s; console.log(`\n## ${s}`); };
export async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); results.push({ section, name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e: any) { results.push({ section, name, ok: false, error: String(e?.message ?? e) }); console.log(`  FAIL  ${name}\n        ${String(e?.message ?? e).split('\n').join('\n        ')}`); }
}
export function summary(file: string) {
  const fs = require('fs');
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  fs.writeFileSync(file, JSON.stringify(results, null, 2));
  return failed.length;
}
