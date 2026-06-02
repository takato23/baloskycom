import { useLayoutEffect } from 'react';

export function useAdminNativeCursor(enabled = true) {
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('admin-route', enabled);
    document.body.classList.toggle('admin-route', enabled);

    if (!enabled) {
      document.body.style.cursor = '';
      return;
    }

    document.body.style.cursor = 'auto';
    return () => {
      document.documentElement.classList.remove('admin-route');
      document.body.classList.remove('admin-route');
      document.body.style.cursor = '';
    };
  }, [enabled]);
}
