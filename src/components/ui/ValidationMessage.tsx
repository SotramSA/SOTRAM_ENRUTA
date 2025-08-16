'use client';

import { AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ValidationMessageProps {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string[];
  className?: string;
}

export function ValidationMessage({
  type,
  title,
  message,
  details,
  className
}: ValidationMessageProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700',
          details: 'text-red-600'
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          details: 'text-yellow-600'
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          message: 'text-blue-700',
          details: 'text-blue-600'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-600',
          title: 'text-gray-800',
          message: 'text-gray-700',
          details: 'text-gray-600'
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={cn(
      "border rounded-lg p-4",
      styles.container,
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 mt-0.5", styles.icon)}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn("text-sm font-medium", styles.title)}>
            {title}
          </h3>
          <p className={cn("mt-1 text-sm", styles.message)}>
            {message}
          </p>
          {details && details.length > 0 && (
            <div className="mt-3">
              <ul className={cn("text-sm space-y-1", styles.details)}>
                {details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="flex-shrink-0 mt-1">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 