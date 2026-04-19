import { useEffect, useRef, useState } from 'react';
import { useAppContext, type ThemeMode } from '@/context/AppContext';

/**
 * Bottom-right floating theme picker — ports the `#themeFab` + `#themePop`
 * pair from delirio.html.
 *
 * Writes to `localStorage.balosky_theme` via AppContext.setTheme so the
 * static home and every React page stay in sync.
 */

type ThemeOption = {
  value: ThemeMode;
  label: string;
  swatch: React.CSSProperties;
  cursorLabel: string;
};

const OPTIONS: ThemeOption[] = [
  { value: 'dark', label: 'Dark', cursorLabel: 'DARK', swatch: { background: '#0a0908', border: '1px solid #555' } },
  { value: 'light', label: 'Light', cursorLabel: 'LIGHT', swatch: { background: '#f3efe6', border: '1px solid #ccc' } },
  { value: '90s', label: '90s flúo', cursorLabel: '90s', swatch: { background: 'linear-gradient(135deg,#FF0080,#FFEE00,#00E1FF)' } },
  { value: 'soft', label: 'Soft', cursorLabel: 'SOFT', swatch: { background: 'linear-gradient(135deg,#F2A27F,#E6A1B6,#B7A9E0)' } },
  { value: 'a11y', label: 'Alto contraste', cursorLabel: 'A11Y', swatch: { background: '#000', border: '2px solid #FFD400' } },
];

export default function ThemeFab() {
  const { theme, setTheme } = useAppContext();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside click — mirrors the static home's document listener.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target)) return;
      if (fabRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  // Close on ESC for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const pick = (t: ThemeMode) => {
    setTheme(t);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={fabRef}
        className="theme-fab"
        type="button"
        data-cursor="TEMA"
        data-mascot-ignore
        aria-label="Cambiar tema"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ✦
      </button>
      <div
        ref={popRef}
        className={`theme-pop${open ? ' open' : ''}`}
        role="menu"
        data-mascot-ignore
        aria-label="Temas"
      >
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="menuitemradio"
            aria-checked={theme === o.value}
            data-theme={o.value}
            data-cursor={o.cursorLabel}
            onClick={() => pick(o.value)}
            style={theme === o.value ? { background: 'rgba(255,255,255,0.08)' } : undefined}
          >
            <span className="swatch" style={o.swatch} aria-hidden="true" />
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}
