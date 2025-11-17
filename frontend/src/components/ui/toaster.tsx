'use client';

import React from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
  ToastAction,
} from '@/components/ui/toast';
import { useToast } from '@/contexts/ToastContext';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const getToastIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case 'info':
      return <Info className="h-5 w-5 text-blue-600" />;
    default:
      return null;
  }
};

const getToastVariant = (type: string) => {
  switch (type) {
    case 'success':
      return 'success';
    case 'error':
      return 'destructive';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'default';
  }
};

export function Toaster() {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {toasts.map((toast) => {
        const { id, title, message, type, action } = toast;
        const variant = getToastVariant(type) as any;
        const icon = getToastIcon(type);

        return (
          <Toast key={id} variant={variant}>
            <div className="flex items-start space-x-3">
              {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
              <div className="flex-1 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                <ToastDescription>{message}</ToastDescription>
              </div>
            </div>
            {action && (
              <ToastAction
                altText={action.label}
                onClick={action.onClick}
              >
                {action.label}
              </ToastAction>
            )}
            <ToastClose onClick={() => removeToast(id)} />
          </Toast>
        );
      })}
      <ToastViewport />
    </>
  );
}