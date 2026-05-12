import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Modal({ open, onOpenChange, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content
          role="dialog"
          aria-modal="true"
          aria-label="Dialog"
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg p-6 z-50 w-full max-w-lg max-h-[85vh] overflow-auto"
        >
          <Dialog.Title className="sr-only">Dialog</Dialog.Title>
          <Dialog.Description className="sr-only">Dialog content</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

Modal.Header = function ModalHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between mb-4">{children}</div>;
};

Modal.Title = function ModalTitle({ children }: { children: React.ReactNode }) {
  return <Dialog.Title className="text-lg font-semibold">{children}</Dialog.Title>;
};

Modal.Body = function ModalBody({ children }: { children?: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
};

Modal.Footer = function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-3">{children}</div>;
};
