// src/components/ui/StatusBadge.tsx
import { cn } from "@/lib/utils";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  CreditCard,
  TrendingUp,
  AlertTriangle,  // ← From lucide-react (keep)
  XCircle,
  Ban,            // ← From lucide-react (keep)
  FileText,
} from "lucide-react";

interface StatusBadgeProps {
  status:
    | "active"
    | "inactive"
    | "pending"
    | "overdue"
    | "closed"
    | "available"
    | "assigned"
    | "draft"
    | "under_review"
    | "approved"
    | "disbursed"
    | "completed"
    | "defaulted"
    | "rejected"
    | "cancelled"
    | "complete"
    | "partial"
    | "incomplete"
    | "eligible"
    | "not_eligible"
    | "blacklisted"
    | "maintenance"
    | "sold"
    | "lost"
    | "viewer"
    | "manager"
    | "agent"
    | "admin";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showProgress?: boolean;
  progress?: number;
  className?: string;
}

const statusConfig: Record<string, {
  color: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}> = {
  // Loan Statuses
  draft: {
    color: "bg-gray-100 text-gray-800 border-gray-300",
    label: "Draft",
    icon: FileText,
  },
  pending: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    label: "Pending",
    icon: Clock,
  },
  under_review: {
    color: "bg-blue-100 text-blue-800 border-blue-300",
    label: "Under Review",
    icon: AlertCircle,
  },
  approved: {
    color: "bg-green-100 text-green-800 border-green-300",
    label: "Approved",
    icon: CheckCircle,
  },
  disbursed: {
    color: "bg-indigo-100 text-indigo-800 border-indigo-300",
    label: "Disbursed",
    icon: CreditCard,
  },
  active: {
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    label: "Active",
    icon: TrendingUp,
  },
  overdue: {
    color: "bg-red-100 text-red-800 border-red-300",
    label: "Overdue",
    icon: AlertTriangle,
  },
  completed: {
    color: "bg-purple-100 text-purple-800 border-purple-300",
    label: "Completed",
    icon: CheckCircle,
  },
  defaulted: {
    color: "bg-red-100 text-red-800 border-red-300",
    label: "Defaulted",
    icon: XCircle,
  },
  cancelled: {
    color: "bg-gray-100 text-gray-800 border-gray-300",
    label: "Cancelled",
    icon: Ban,
  },
  rejected: {
    color: "bg-gray-100 text-gray-800 border-gray-300",
    label: "Rejected",
    icon: XCircle,
  },
  // Add more statuses as needed (available, assigned, etc.)
  available: {
    color: "bg-green-100 text-green-800 border-green-300",
    label: "Available",
    icon: CheckCircle,
  },
  assigned: {
    color: "bg-purple-100 text-purple-800 border-purple-300",
    label: "Assigned",
    icon: CreditCard,
  },
  maintenance: {
    color: "bg-orange-100 text-orange-800 border-orange-300",
    label: "Maintenance",
    icon: AlertTriangle,
  },
  // User roles (optional)
  admin: { color: "bg-red-100 text-red-800", label: "Admin", icon: AlertTriangle },
  manager: { color: "bg-blue-100 text-blue-800", label: "Manager" },
  agent: { color: "bg-green-100 text-green-800", label: "Agent" },
  viewer: { color: "bg-gray-100 text-gray-800", label: "Viewer" },
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-3 py-1 text-sm gap-1.5",
  lg: "px-4 py-2 text-base gap-2",
};

const iconSizeClasses = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4",
};

export default function StatusBadge({
  status,
  size = "md",
  showIcon = true,
  showProgress = false,
  progress = 0,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800", label: status };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium capitalize border",
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && Icon && <Icon className={iconSizeClasses[size]} />}
      <span>{config.label}</span>
      {showProgress && (
        <span className="ml-2 text-xs">({progress}%)</span>
      )}
    </span>
  );
}