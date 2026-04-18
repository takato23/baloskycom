import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Optional eyebrow label (e.g. "MEDIA · VIDEO_IA") above the title. */
  eyebrow?: string;
  /** Max width of the modal card. Defaults to "2xl". */
  size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  children: React.ReactNode;
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  md:  'max-w-lg',
  lg:  'max-w-xl',
  xl:  'max-w-2xl',
  '2xl': 'max-w-3xl',
  '3xl': 'max-w-4xl',
};

/**
 * Refined modal. Soft backdrop, subtle bordered card, quiet header with
 * optional eyebrow. No yellow, no brutal borders — just a clean surface
 * that matches the public site's Artefakt-inspired palette.
 *
 * Esc closes, the outer backdrop click closes, and body scroll is locked
 * while the modal is mounted.
 */
export function Modal({ isOpen, onClose, title, eyebrow, size = '2xl', children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full overflow-hidden bg-white text-zinc-900',
          'border border-zinc-200 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.35)]',
          'rounded-t-2xl sm:rounded-2xl',
          SIZE[size],
        )}
      >
        {/* Header */}
        <div className="relative flex items-start justify-between gap-4 px-7 pt-7 pb-5 border-b border-zinc-100">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[11px] font-medium tracking-[0.2em] uppercase text-[var(--accent,#FA5D29)] mb-1.5">
                {eyebrow}
              </div>
            )}
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 truncate">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 -mr-2 -mt-1 p-2 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
