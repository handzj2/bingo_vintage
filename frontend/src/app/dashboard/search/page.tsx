'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

function SearchInner() {
  const q = (useSearchParams().get('q') ?? '').trim();
  const { can } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setErr('');
      const needle = q.toLowerCase();
      const unwrap = (r: any) => (Array.isArray(r.data) ? r.data : r.data?.data ?? r.data?.items ?? []);
      const [c, l] = await Promise.all([
        can('client.view') ? api.get<any>('/clients') : Promise.resolve(null),
        can('loan.view') ? api.get<any>('/loans') : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if ((c && !c.success) || (l && !l.success)) setErr((c && !c.success && c.message) || (l && !l.success && l.message) || 'Search failed');
      const has = (o: any, keys: string[]) => keys.some((k) => String(o?.[k] ?? '').toLowerCase().includes(needle));
      setClients(c?.success ? unwrap(c).filter((x: any) => has(x, ['fullName', 'full_name', 'name', 'phone', 'phoneNumber', 'nationalId', 'national_id'])).slice(0, 25) : []);
      setLoans(l?.success ? unwrap(l).filter((x: any) => has(x, ['loanNumber', 'loan_number', 'clientName', 'client_name', 'id'])).slice(0, 25) : []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [q, can]);

  return (
    <div className="p-4 sm:p-6 max-w-bv mx-auto space-y-6">
      <h1 className="text-lg font-semibold text-bv-text">Search results{q ? ` for “${q}”` : ''}</h1>
      {!q && <p className="text-sm text-bv-muted">Type a client name, phone number or loan number in the search box.</p>}
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {err && <p className="text-sm text-bv-danger">{err}</p>}
      {q && !loading && (
        <>
          <section>
            <h2 className="text-sm font-semibold mb-2">Clients ({clients.length})</h2>
            {clients.length === 0 ? <p className="text-sm text-bv-meta">No clients found.</p> : (
              <ul className="border border-bv-border rounded-bv divide-y divide-bv-border">
                {clients.map((c) => (
                  <li key={c.id}><Link className="block px-4 py-3 hover:bg-bv-hover text-sm" href={`/dashboard/clients/${c.id}`}>
                    {c.fullName ?? c.full_name ?? c.name} <span className="text-bv-meta">· {c.phone ?? c.phoneNumber ?? ''}</span></Link></li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="text-sm font-semibold mb-2">Loans ({loans.length})</h2>
            {loans.length === 0 ? <p className="text-sm text-bv-meta">No loans found.</p> : (
              <ul className="border border-bv-border rounded-bv divide-y divide-bv-border">
                {loans.map((l) => (
                  <li key={l.id}><Link className="block px-4 py-3 hover:bg-bv-hover text-sm" href={`/dashboard/loans/${l.id}`}>
                    {l.loanNumber ?? l.loan_number ?? `Loan #${l.id}`} <span className="text-bv-meta">· {l.status}</span></Link></li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={null}><SearchInner /></Suspense>;
}
