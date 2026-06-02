import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { classifyTrackedClick, ensurePlausibleLoaded, shouldTrackPublicPath, trackEvent, trackPageView } from '@/lib/analytics';

const labelFromElement = (element: Element) => {
  const aria = element.getAttribute('aria-label');
  if (aria) return aria;
  const text = element.textContent || '';
  return text.trim().replace(/\s+/g, ' ').slice(0, 80);
};

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!shouldTrackPublicPath(location.pathname)) return;
    ensurePlausibleLoaded();
    trackPageView(`${location.pathname}${location.hash || ''}`);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!shouldTrackPublicPath(location.pathname)) return;
      const target = event.target instanceof Element ? event.target : null;
      const element = target?.closest('a[href], button[data-analytics-href], [data-checkout-type]');
      if (!element) return;

      const rawHref =
        element.getAttribute('data-analytics-href') ||
        element.getAttribute('href') ||
        (element.hasAttribute('data-checkout-type') ? '/checkout' : '');
      const classified = classifyTrackedClick(rawHref);
      if (!classified) return;

      trackEvent(
        classified.eventName,
        {
          href: classified.href,
          kind: classified.kind,
          host: classified.host,
          label: labelFromElement(element),
        },
        { target: classified.href },
      );
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [location.pathname]);

  return null;
}
