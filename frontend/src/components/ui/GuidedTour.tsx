'use client';

/**
 * Lightweight guided tour — no extra npm dependency.
 * Shows sequential tips for first-time users; role-aware steps.
 * Persists dismissal in localStorage: bingo_tour_done_v1
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { X, ChevronRight, ChevronLeft, Compass } from 'lucide-react';

const STORAGE_KEY = 'bingo_tour_done_v1';

type TourStep = {
  id: string;
  title: string;
  body: string;
  href?: string;
  roles?: string[];
};

const ALL_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Bingo Vintage',
    body: 'This short guide shows where owners and staff find portfolio health, collections, and reports. You can skip anytime and reopen Help → Guided tour.',
  },
  {
    id: 'dashboard',
    title: 'Home — your picture of the book',
    body: 'Dashboard shows outstanding principal, NPL risk, and items that need attention. Figures come from live loans and payments — not sample data.',
    href: '/dashboard',
  },
  {
    id: 'reports',
    title: 'Reports — full detail and Excel',
    body: 'Open Finance → Reports for Overview, Arrears, Aging, NPL, Daily collection sheet, and Weekly MD sign-off. Each tab can export labelled Excel.',
    href: '/dashboard/reports',
    roles: ['admin', 'manager', 'superadmin'],
  },
  {
    id: 'payments',
    title: 'Payments — record collections',
    body: 'Cashiers and managers record repayments under Payments. Cashiers cannot backdate; use an open cash drawer when required.',
    href: '/dashboard/payments',
    roles: ['admin', 'manager', 'cashier', 'superadmin'],
  },
  {
    id: 'clients-loans',
    title: 'Clients and loans',
    body: 'Register clients under Clients, then create loans under Lending. Schedules drive who is due each day on the collection sheet.',
    href: '/dashboard/clients',
  },
  {
    id: 'drawer',
    title: 'Cash drawer',
    body: 'My Drawer tracks opening balance, collections, and close. Weekly MD compares system collections to declared drawer closes.',
    href: '/dashboard/my-drawer',
    roles: ['admin', 'manager', 'cashier', 'superadmin'],
  },
  {
    id: 'done',
    title: 'You are ready',
    body: 'Use the sidebar groups: Lending, Operations, Finance (Reports), System. Reopen this tour anytime from the Help button on the dashboard.',
  },
];

function filterSteps(role: string): TourStep[] {
  const r = (role || '').toLowerCase();
  return ALL_STEPS.filter((s) => {
    if (!s.roles || s.roles.length === 0) return true;
    if (r === 'admin' || r === 'superadmin') return true;
    return s.roles.map((x) => x.toLowerCase()).includes(r);
  });
}

export function startGuidedTour() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('bingo-tour-restart'));
}

export default function GuidedTour() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const steps = useMemo(() => filterSteps(user?.role || ''), [user?.role]);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
    setIdx(0);
  }, []);

  useEffect(() => {
    if (!user) return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [user]);

  useEffect(() => {
    const onRestart = () => {
      setIdx(0);
      setOpen(true);
    };
    window.addEventListener('bingo-tour-restart', onRestart);
    return () => window.removeEventListener('bingo-tour-restart', onRestart);
  }, []);

  if (!open || !user || steps.length === 0) return null;

  const step = steps[Math.min(idx, steps.length - 1)];
  const isLast = idx >= steps.length - 1;

  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    const next = steps[idx + 1];
    if (next?.href && next.href !== pathname) {
      router.push(next.href);
    }
    setIdx((i) => i + 1);
  };

  const goBack = () => {
    if (idx <= 0) return;
    const prev = steps[idx - 1];
    if (prev?.href && prev.href !== pathname) {
      router.push(prev.href);
    }
    setIdx((i) => i - 1);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-lg rounded-lg p-5 text-left">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-gray-800">
            <Compass className="w-5 h-5 text-blue-800 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-500">
              Step {idx + 1} of {steps.length}
            </span>
          </div>
          <button
            type="button"
            onClick={finish}
            className="text-gray-400 hover:text-gray-700 p-1"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 id="tour-title" className="text-base font-semibold text-gray-900 mb-2">
          {step.title}
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{step.body}</p>
        {step.href && (
          <p className="text-xs text-gray-500 mb-4 font-mono">{step.href}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={finish}
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={idx === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-800 rounded hover:bg-blue-900"
            >
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
