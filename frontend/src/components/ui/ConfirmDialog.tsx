import React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  icon?: React.ReactNode;
  onCancel?: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  onConfirm,
  icon,
  onCancel,
}: ConfirmDialogProps) {
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen && onCancel) {
      onCancel();
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <AlertDialog.Content
          aria-modal="true"
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg p-6 z-50 w-full max-w-md"
        >
          <div className="flex items-start">
            {icon && <div className="flex-shrink-0 mr-3 mt-0.5">{icon}</div>}
            <div className="flex-1">
              <AlertDialog.Title className="text-lg font-semibold mb-2">
                {title}
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-gray-600 mb-6">
                {message}
              </AlertDialog.Description>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={variant} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
