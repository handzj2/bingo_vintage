// components/ui/LoadingSpinner.tsx - WITH MORE OPTIONS
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"; // Optional: using lucide icon

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "default" | "secondary" | "primary" | "success" | "danger" | "warning";
  type?: "spinner" | "dots" | "pulse";
  fullScreen?: boolean;
  text?: string;
}

export default function LoadingSpinner({
  size = "md",
  className,
  variant = "default",
  type = "spinner",
  fullScreen = false,
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const variantClasses = {
    default: "text-gray-600",
    primary: "text-blue-600",
    secondary: "text-gray-400",
    success: "text-green-600",
    danger: "text-red-600",
    warning: "text-yellow-600",
  };

  const SpinnerIcon = () => (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  );

  const DotsIcon = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-2 animate-bounce rounded-full bg-current",
            variantClasses[variant],
            className
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );

  const PulseIcon = () => (
    <div
      className={cn(
        "h-full w-full animate-pulse rounded-full bg-current",
        variantClasses[variant],
        className
      )}
    />
  );

  const renderSpinner = () => {
    switch (type) {
      case "dots":
        return <DotsIcon />;
      case "pulse":
        return <PulseIcon />;
      case "spinner":
      default:
        return <SpinnerIcon />;
    }
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          {renderSpinner()}
          {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      {renderSpinner()}
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
}

// Optional: Also create a LoadingOverlay component
export function LoadingOverlay({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-700">{text}</p>
      </div>
    </div>
  );
}

// Optional: Button loading state spinner
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("mr-2", className)}>
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
    </div>
  );
}