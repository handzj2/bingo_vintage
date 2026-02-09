import React from 'react';
import { AlertCircle, CheckCircle, Info, ShieldAlert } from 'lucide-react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  className?: string;
}

const Alert = ({ children, variant = 'info', title, className = '' }: AlertProps) => {
  const variants = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-500" />,
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    },
  };

  const style = variants[variant];

  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${style.bg} ${style.border} ${className}`}>
      <div className="flex-shrink-0 mt-0.5">
        {style.icon}
      </div>
      <div className="flex-1">
        {title && <h3 className={`text-sm font-bold ${style.text} mb-1`}>{title}</h3>}
        <div className={`text-sm ${style.text} opacity-90`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Alert;