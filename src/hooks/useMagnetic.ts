import { useEffect, useRef } from 'react';

export function useMagnetic<T extends HTMLElement>(radius = 100, strength = 0.3) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        el.style.transition = 'transform 0.15s ease-out';
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      }
    };

    const onLeave = () => {
      el.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      el.style.transform = 'translate(0, 0)';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [radius, strength]);

  return ref;
}
