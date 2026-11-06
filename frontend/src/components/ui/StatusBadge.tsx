import React from 'react';
import { cn } from '@/lib/utils';

type Status =
  | 'ACTIVE' | 'PENDING' | 'PENDING_APPROVAL' | 'COMPLETED' | 'DEFAULTED'
  | 'DELINQUENT' | 'CANCELLED' | 'REVERSED' | 'FAILED'
  | 'approved' | 'pending' | 'rejected'
  | 'AVAILABLE' | 'LOANED' | 'MAINTENANCE' | 'SOLD'
  | string;

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  // Loan statuses
  ACTIVE:           { label: 'Active',           className: 'bg-bv-success-bg text-bv-success border-green-200'   },
  PENDING:          { label: 'Pending',           className: 'bg-bv-warning-bg text-bv-warning border-yellow-200' },
  PENDING_APPROVAL: { label: 'Pending Approval',  className: 'bg-orange-100 text-orange-700 border-orange-200' },
  COMPLETED:        { label: 'Completed',         className: 'bg-bv-info-bg text-bv-accent border-blue-200'     },
  DEFAULTED:        { label: 'Defaulted',         className: 'bg-bv-danger-bg text-bv-danger border-bv-danger/30'        },
  DELINQUENT:       { label: 'Delinquent',        className: 'bg-rose-100 text-rose-700 border-rose-200'     },
  CANCELLED:        { label: 'Cancelled',         className: 'bg-bv-hover text-bv-muted border-bv-border'     },
  // Payment statuses
  REVERSED:         { label: 'Reversed',          className: 'bg-purple-100 text-purple-700 border-purple-200' },
  FAILED:           { label: 'Failed',            className: 'bg-bv-danger-bg text-bv-danger border-bv-danger/30'        },
  // Expense statuses
  approved:         { label: 'Approved',          className: 'bg-bv-success-bg text-bv-success border-green-200'  },
  pending:          { label: 'Pending',           className: 'bg-bv-warning-bg text-bv-warning border-yellow-200' },
  rejected:         { label: 'Rejected',          className: 'bg-bv-danger-bg text-bv-danger border-bv-danger/30'        },
  // Bike statuses
  AVAILABLE:        { label: 'Available',         className: 'bg-bv-success-bg text-bv-success border-green-200'  },
  LOANED:           { label: 'Loaned',            className: 'bg-bv-info-bg text-bv-accent border-blue-200'     },
  MAINTENANCE:      { label: 'Maintenance',       className: 'bg-bv-warning-bg text-bv-warning border-yellow-200' },
  SOLD:             { label: 'Sold',              className: 'bg-bv-hover text-bv-muted border-bv-border'     },
};

interface StatusBadgeProps {
  status:    Status;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? {
    label:     status ?? '—',
    className: 'bg-bv-hover text-bv-muted border-bv-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
