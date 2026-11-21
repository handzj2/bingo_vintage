/**
 * Executable specification for resolveEffectiveAccess.
 * Run: npx ts-node resolve-effective-access.spec.ts
 *   or: node --experimental-strip-types resolve-effective-access.spec.ts
 *
 * These tests were written to be runnable without Nest/DB.
 */

import {
  resolveEffectiveAccess,
  normalizeCommercialForStorage,
  ResolutionInput,
} from './resolve-effective-access';

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function base(over: Partial<ResolutionInput> = {}): ResolutionInput {
  return {
    isIndependentlyControllable: true,
    registryDefaultAccess: 'ENABLED',
    registryDefaultVisibility: 'VISIBLE',
    commercialStatus: 'ACTIVE',
    ...over,
  };
}

console.log('\n=== Existing tenant continuity (registry/product ENABLED) ===');
{
  const r = resolveEffectiveAccess(base());
  assert('default enabled', r.accessState === 'ENABLED' && r.visibilityState === 'VISIBLE');
}

console.log('\n=== Product-wide DISABLED always wins ===');
{
  const r = resolveEffectiveAccess(base({
    productAccess: 'DISABLED',
    productVisibility: 'HIDDEN',
    tenantAccess: 'ENABLED', // tenant tries to widen — must fail
    tenantVisibility: 'VISIBLE',
  }));
  assert('product DISABLED beats tenant ENABLED', r.accessState === 'DISABLED');
  assert('source is product', r.source === 'product');
}

console.log('\n=== Tenant may further restrict ===');
{
  const r = resolveEffectiveAccess(base({
    productAccess: 'ENABLED',
    tenantAccess: 'DISABLED',
    tenantVisibility: 'VISIBLE',
  }));
  assert('tenant DISABLED while product ENABLED', r.accessState === 'DISABLED');
  assert('visible while disabled', r.visibilityState === 'VISIBLE');
}

console.log('\n=== Commercial status restrictions ===');
for (const status of ['PAYMENT_PENDING', 'NOT_ENTITLED', 'EXPIRED', 'SUSPENDED', 'DEVELOPMENT'] as const) {
  const r = resolveEffectiveAccess(base({
    productAccess: 'ENABLED',
    tenantAccess: 'ENABLED',
    commercialStatus: status,
  }));
  assert(`${status} forces DISABLED`, r.accessState === 'DISABLED', r.accessDeniedReason);
}
{
  const r = resolveEffectiveAccess(base({ commercialStatus: 'TRIAL' }));
  assert('TRIAL allows access', r.accessState === 'ENABLED');
}
{
  const r = resolveEffectiveAccess(base({
    commercialStatus: 'TRIAL',
    trialEndsAt: new Date('2020-01-01'),
  }));
  assert('expired TRIAL forces DISABLED', r.accessState === 'DISABLED' && r.commercialStatus === 'EXPIRED');
}

console.log('\n=== RESTORED normalizes ===');
{
  const stored = normalizeCommercialForStorage('RESTORED');
  assert('RESTORED stores as ACTIVE', stored === 'ACTIVE');
  const r = resolveEffectiveAccess(base({ commercialStatus: 'RESTORED' }));
  assert('effective commercial is ACTIVE not RESTORED', r.commercialStatus === 'ACTIVE');
  assert('RESTORED effective still allows access', r.accessState === 'ENABLED');
}

console.log('\n=== Core modules cannot be gated ===');
{
  const r = resolveEffectiveAccess(base({
    isIndependentlyControllable: false,
    productAccess: 'DISABLED',
    commercialStatus: 'SUSPENDED',
  }));
  assert('core always ENABLED', r.accessState === 'ENABLED');
}

console.log('\n=== Visibility independent of access ===');
{
  const r = resolveEffectiveAccess(base({
    tenantAccess: 'DISABLED',
    tenantVisibility: 'VISIBLE',
  }));
  assert('DISABLED + VISIBLE supported', r.accessState === 'DISABLED' && r.visibilityState === 'VISIBLE');
}
{
  const r = resolveEffectiveAccess(base({
    tenantAccess: 'DISABLED',
    tenantVisibility: 'HIDDEN',
  }));
  assert('DISABLED + HIDDEN supported', r.accessState === 'DISABLED' && r.visibilityState === 'HIDDEN');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
