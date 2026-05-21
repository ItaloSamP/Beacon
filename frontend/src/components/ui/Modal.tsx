import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  open,
  onOpenChange,
  onClose,
  children,
  size = 'md',
}: ModalProps) {
  const prevOpenRef = React.useRef(open);

  React.useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;
    if (wasOpen && !open && onClose) {
      onClose();
    }
  }, [open, onClose]);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen);
      if (!newOpen && onClose) {
        onClose();
      }
    },
    [onOpenChange, onClose],
  );

  const sizes: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content
          role="dialog"
          aria-modal="true"
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg p-6 z-50 w-full ${sizes[size]} max-h-[85vh] overflow-auto`}
        >
          <Dialog.Title className="sr-only">Dialog</Dialog.Title>
          <Dialog.Description className="sr-only">
            Dialog content
          </Dialog.Description>

          <button
            onClick={() => handleOpenChange(false)}
            className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

Modal.Header = function ModalHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4 pr-8">
      {children}
    </div>
  );
};

Modal.Title = function ModalTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Dialog.Title className="text-lg font-semibold">{children}</Dialog.Title>
  );
};

Modal.Body = function ModalBody({
  children,
}: {
  children?: React.ReactNode;
}) {
  return <div className="mb-4">{children}</div>;
};

Modal.Footer = function ModalFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex justify-end gap-3">{children}</div>;
};
