import React from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={cn(
        "w-full max-w-lg overflow-hidden",
        "bg-white border-4 border-black brutal-shadow"
      )}>
        <div className={cn(
          "flex items-center justify-between p-6 border-b",
          "border-black bg-yellow-300 border-b-4"
        )}>
          <h2 className={cn("text-xl font-bold", "text-black font-brutal uppercase")}>{title}</h2>
          <button 
            onClick={onClose}
            className={cn(
              "p-2 transition-colors",
              "text-black hover:bg-black hover:text-white border-2 border-transparent hover:border-black"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={cn("p-6 max-h-[80vh] overflow-y-auto", "text-black")}>
          {children}
        </div>
      </div>
    </div>
  );
}
