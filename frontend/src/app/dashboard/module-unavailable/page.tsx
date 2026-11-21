'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useModuleEntitlements } from '@/hooks/useModuleEntitlements';

function Notice() {
  const key = useSearchParams().get('key') || '';
  const { modules } = useModuleEntitlements();
  const name = modules[key]?.name || key.replace(/_/g, ' ') || 'This module';

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-xl font-semibold text-bv-text">{name} is not available</h1>
      <p className="mt-3 text-sm text-bv-muted">
        This module is not currently enabled for your organisation. If you believe you should have
        access, please contact your system administrator.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block rounded-lg bg-bv-action px-4 py-2 text-sm font-medium text-white hover:bg-bv-action-hover"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

export default function ModuleUnavailablePage() {
  return (
    <Suspense fallback={null}>
      <Notice />
    </Suspense>
  );
}
