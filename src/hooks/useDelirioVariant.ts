/**
 * useDelirioVariant
 * Sistema de modos y easter eggs para la página Delirio.
 *
 * Modos:
 *   - "calle" (default)
 *   - "delirio"   → Konami: ↑↑↓↓←→←→BA
 *   - "luto"      → tipear "paz"
 *   - "secreto"   → tipear "dev" o Ctrl+;
 *
 * Drops (rotan paleta cada 14s):
 *   - humor | musica | duelo | fiesta
 *
 * Overrides URL: ?variant=xxx&drop=xxx
 * Persistencia: localStorage "dlr-variant" / "dlr-drop"
 * Reset: 7 clicks rápidos en un target marcado → localStorage.clear()
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type DelirioVariant = 'calle' | 'delirio' | 'luto' | 'secreto';
export type DelirioDrop = 'humor' | 'musica' | 'duelo' | 'fiesta';

const VARIANTS: DelirioVariant[] = ['calle', 'delirio', 'luto', 'secreto'];
const DROPS: DelirioDrop[] = ['humor', 'musica', 'duelo', 'fiesta'];

const LS_VARIANT = 'dlr-variant';
const LS_DROP = 'dlr-drop';

function readInitialVariant(): DelirioVariant {
  if (typeof window === 'undefined') return 'calle';
  const urlParam = new URLSearchParams(window.location.search).get('variant') as DelirioVariant | null;
  if (urlParam && VARIANTS.includes(urlParam)) return urlParam;
  const stored = localStorage.getItem(LS_VARIANT) as DelirioVariant | null;
  if (stored && VARIANTS.includes(stored)) return stored;
  return 'calle';
}

function readInitialDrop(): DelirioDrop {
  if (typeof window === 'undefined') return 'humor';
  const urlParam = new URLSearchParams(window.location.search).get('drop') as DelirioDrop | null;
  if (urlParam && DROPS.includes(urlParam)) return urlParam;
  const stored = localStorage.getItem(LS_DROP) as DelirioDrop | null;
  if (stored && DROPS.includes(stored)) return stored;
  return 'humor';
}

export interface UseDelirioVariantResult {
  variant: DelirioVariant;
  drop: DelirioDrop;
  setVariant: (v: DelirioVariant) => void;
  setDrop: (d: DelirioDrop) => void;
  toastMessage: string | null;
  dismissToast: () => void;
  reset: () => void;
}

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

export function useDelirioVariant(): UseDelirioVariantResult {
  const [variant, setVariantState] = useState<DelirioVariant>(readInitialVariant);
  const [drop, setDropState] = useState<DelirioDrop>(readInitialDrop);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const konamiPos = useRef(0);
  const textBuffer = useRef('');
  const dropRotationTimer = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3200);
  }, []);

  const setVariant = useCallback(
    (v: DelirioVariant) => {
      setVariantState(v);
      try { localStorage.setItem(LS_VARIANT, v); } catch { /* ignore */ }
      showToast(
        v === 'delirio' ? 'modo delirio desbloqueado · bienvenido al laboratorio'
          : v === 'luto' ? 'modo luto · silencio por un rato'
          : v === 'secreto' ? 'modo secreto · panel técnico activado'
          : 'modo calle · default'
      );
    },
    [showToast]
  );

  const setDrop = useCallback(
    (d: DelirioDrop) => {
      setDropState(d);
      try { localStorage.setItem(LS_DROP, d); } catch { /* ignore */ }
    },
    []
  );

  const dismissToast = useCallback(() => setToastMessage(null), []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(LS_VARIANT);
      localStorage.removeItem(LS_DROP);
    } catch { /* ignore */ }
    setVariantState('calle');
    setDropState('humor');
    showToast('reset · todo vuelve al default');
  }, [showToast]);

  // Apply data-variant + data-drop to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-variant', variant);
    root.setAttribute('data-drop', drop);
    return () => {
      root.removeAttribute('data-variant');
      root.removeAttribute('data-drop');
    };
  }, [variant, drop]);

  // Drop auto-rotation (every 14s unless URL override is present)
  useEffect(() => {
    const hasUrlOverride =
      new URLSearchParams(window.location.search).get('drop') !== null;
    if (hasUrlOverride) return;

    dropRotationTimer.current = window.setInterval(() => {
      setDropState((current) => {
        const idx = DROPS.indexOf(current);
        const next = DROPS[(idx + 1) % DROPS.length];
        try { localStorage.setItem(LS_DROP, next); } catch { /* ignore */ }
        return next;
      });
    }, 14000);

    return () => {
      if (dropRotationTimer.current) window.clearInterval(dropRotationTimer.current);
    };
  }, []);

  // Keyboard triggers
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Konami
      if (e.key === KONAMI[konamiPos.current]) {
        konamiPos.current += 1;
        if (konamiPos.current === KONAMI.length) {
          konamiPos.current = 0;
          setVariant('delirio');
        }
      } else {
        konamiPos.current = 0;
      }

      // Ctrl+; → secreto
      if ((e.ctrlKey || e.metaKey) && e.key === ';') {
        e.preventDefault();
        setVariant('secreto');
      }

      // Word triggers (ignore when in inputs)
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key.length === 1) {
        textBuffer.current = (textBuffer.current + e.key).slice(-8).toLowerCase();
        if (textBuffer.current.endsWith('paz')) setVariant('luto');
        if (textBuffer.current.endsWith('dev')) setVariant('secreto');
        if (textBuffer.current.endsWith('calle')) setVariant('calle');
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setVariant]);

  return { variant, drop, setVariant, setDrop, toastMessage, dismissToast, reset };
}
