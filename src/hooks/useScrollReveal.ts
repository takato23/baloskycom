import { useEffect, useRef } from 'react';

export function useScrollReveal<T extends HTMLElement>(
  options: IntersectionObserverInit = { threshold: 0.1, rootMargin: '-40px' },
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, options);

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return ref;
}
