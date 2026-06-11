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
  ACTIVE:           { label: 'Active',           className: 'bg-green-100 text-green-700 border-green-200'   },
  PENDING:          { label: 'Pending',           className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  PENDING_APPROVAL: { label: 'Pending Approval',  className: 'bg-orange-100 text-orange-700 border-orange-200' },
  COMPLETED:        { label: 'Completed',         className: 'bg-blue-100 text-blue-700 border-blue-200'     },
  DEFAULTED:        { label: 'Defaulted',         className: 'bg-red-100 text-red-700 border-red-200'        },
  DELINQUENT:       { label: 'Delinquent',        className: 'bg-rose-100 text-rose-700 border-rose-200'     },
  CANCELLED:        { label: 'Cancelled',         className: 'bg-gray-100 text-gray-600 border-gray-200'     },
  // Payment statuses
  REVERSED:         { label: 'Reversed',          className: 'bg-purple-100 text-purple-700 border-purple-200' },
  FAILED:           { label: 'Failed',            className: 'bg-red-100 text-red-700 border-red-200'        },
  // Expense statuses
  approved:         { label: 'Approved',          className: 'bg-green-100 text-green-700 border-green-200'  },
  pending:          { label: 'Pending',           className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  rejected:         { label: 'Rejected',          className: 'bg-red-100 text-red-700 border-red-200'        },
  // Bike statuses
  AVAILABLE:        { label: 'Available',         className: 'bg-green-100 text-green-700 border-green-200'  },
  LOANED:           { label: 'Loaned',            className: 'bg-blue-100 text-blue-700 border-blue-200'     },
  MAINTENANCE:      { label: 'Maintenance',       className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  SOLD:             { label: 'Sold',              className: 'bg-gray-100 text-gray-600 border-gray-200'     },
};

interface StatusBadgeProps {
  status:    Status;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? {
    label:     status ?? '—',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
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
