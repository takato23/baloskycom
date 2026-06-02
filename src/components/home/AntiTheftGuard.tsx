import { useEffect, useRef, useState } from 'react';

/**
 * Anti-theft layer — port of the IIFE in `public/delirio.html` (~line 4005).
 *
 * Soft deterrent for the protected zones (`#ojo`, `#pixel`, `.media-modal`,
 * any opt-in `.no-steal`). Blocks right-click, drag, copy, text selection,
 * and Ctrl/Cmd+S/P/U inside those zones. PrintScreen can't be blocked, so
 * we just flash the toast on keyup. Not anti-forensic — purely social
 * friction to nudge people toward the cafecito CTA.
 *
 * Renders the toast itself so we don't depend on extra DOM in HomePreview.
 */

type ZoneRef = HTMLElement | null;

function isInZone(node: EventTarget | null): boolean {
  if (!(node instanceof Element)) return false;
  return !!(
    node.closest('#ojo') ||
    node.closest('#pixel') ||
    node.closest('.media-modal') ||
    node.closest('.no-steal')
  );
}

function isViewportZone(el: ZoneRef): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight && r.bottom > 0;
}

export default function AntiTheftGuard() {
  const [shown, setShown] = useState(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const showToast = () => {
      setShown(true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setShown(false), 4200);
    };

    const onContextMenu = (e: MouseEvent) => {
      if (isInZone(e.target)) {
        e.preventDefault();
        showToast();
      }
    };
    const onDragStart = (e: DragEvent) => {
      if (isInZone(e.target)) {
        e.preventDefault();
        showToast();
      }
    };
    const onSelectStart = (e: Event) => {
      if (isInZone(e.target)) e.preventDefault();
    };
    const onCopy = (e: ClipboardEvent) => {
      if (isInZone(e.target)) {
        e.preventDefault();
        showToast();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = (e.key || '').toLowerCase();
      if (k !== 's' && k !== 'p' && k !== 'u') return;
      const modal = document.getElementById('mediaModal');
      const modalOpen = modal?.classList.contains('open');
      const ojo = document.getElementById('ojo');
      const pixel = document.getElementById('pixel');
      const inZone = isViewportZone(ojo) || isViewportZone(pixel);
      if (modalOpen || inZone) {
        e.preventDefault();
        showToast();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') showToast();
    };

    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('dragstart', onDragStart, true);
    document.addEventListener('selectstart', onSelectStart, true);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('dragstart', onDragStart, true);
      document.removeEventListener('selectstart', onSelectStart, true);
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div
      className={`steal-toast${shown ? ' shown' : ''}`}
      id="stealToast"
      role="status"
      aria-live="polite"
      aria-hidden={shown ? 'false' : 'true'}
    >
      <div className="steal-toast__icon" aria-hidden="true">
        🧡
      </div>
      <div className="steal-toast__body">
        psst. las fotos son <strong>de balosky</strong>.
        <br />
        si te re-gustó una, <strong>cafecito</strong> y seguimos haciendo archivo.
      </div>
      <a className="steal-toast__cta" href="/cafecito" data-cursor="CAFECITO">
        cafecito →
      </a>
    </div>
  );
}
