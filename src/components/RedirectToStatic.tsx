import { useEffect } from 'react';

/**
 * Forces a full page reload at the given target path. Used for `/` and
 * `/delirio`, which are served as a static HTML page by Express (see
 * server.ts). If a user lands on these paths via client-side React Router
 * navigation, this component immediately requests the path from the server,
 * so the Express handler returns the Delirio mockup instead of the SPA shell.
 */
export default function RedirectToStatic({ target = '/' }: { target?: string }) {
  useEffect(() => {
    // Use assign (not replace) so Back still works.
    window.location.assign(target);
  }, [target]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"
        aria-label="Cargando"
      />
    </div>
  );
}
