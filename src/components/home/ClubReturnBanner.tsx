import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

/**
 * Banner que aparece cuando el usuario vuelve de Mercado Pago después de
 * autorizar (o cancelar) una suscripción del Club. MP redirige a
 * `/club?sub={subscriptionId}`. El backend también usa `/club?auth={x}`
 * para los magic-links de verificación de miembros.
 *
 * Comportamiento:
 *   - Si hay `?sub=X`: pollea `GET /api/subscriptions/:id/status` cada 2s
 *     por hasta ~30s, mostrando el estado real (pending → "esperando
 *     confirmación", authorized → "ya estás dentro", failed → error).
 *   - Si hay `?auth=ok|invalid|expired|gone|error`: muestra mensaje
 *     estático correspondiente (sin polling).
 *   - Limpia los query params del URL una vez que el banner aparece para
 *     que un refresh no lo re-dispare.
 *   - Hace scroll a #club al montarse (la subscription ES sobre el club).
 *
 * Mounted dentro de HomePreview (la home renderiza esto y el resto de
 * secciones del Delirio).
 */

type Tone = 'success' | 'pending' | 'error';
type View = {
  tone: Tone;
  title: string;
  body: string;
  spinning?: boolean;
} | null;

const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = 15; // ~30 segundos antes de rendirnos

const AUTH_MESSAGES: Record<string, View> = {
  ok: {
    tone: 'success',
    title: 'Acceso confirmado',
    body: 'Tu sesión está activa. Bienvenido, Baloskier.',
  },
  invalid: {
    tone: 'error',
    title: 'Link inválido',
    body: 'El link de acceso no es válido. Pedí uno nuevo desde tu email.',
  },
  expired: {
    tone: 'error',
    title: 'Link vencido',
    body: 'Este link de acceso ya venció. Pedí uno nuevo y revisá tu email.',
  },
  gone: {
    tone: 'error',
    title: 'Cuenta no encontrada',
    body: 'No encontramos tu cuenta de miembro. Escribinos y lo revisamos.',
  },
  error: {
    tone: 'error',
    title: 'Algo falló',
    body: 'Tuvimos un problema confirmando tu acceso. Probá de nuevo.',
  },
};

export default function ClubReturnBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState<View>(null);
  const [dismissed, setDismissed] = useState(false);
  const pollCountRef = useRef(0);

  // Construye el view inicial según los params, y arranca polling si hay sub.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const subId = params.get('sub')?.trim();
    const authResult = params.get('auth')?.trim();
    const isStub = params.get('dev') === 'stub';

    // Reset state cuando cambian los params (navegación dentro de la SPA).
    setDismissed(false);
    pollCountRef.current = 0;

    if (!subId && !authResult) {
      setView(null);
      return;
    }

    // Scroll suave a #club así el banner queda en contexto.
    requestAnimationFrame(() => {
      const club = document.getElementById('club');
      if (club) {
        const navEl = document.querySelector('nav.nav');
        const navH = navEl instanceof HTMLElement ? navEl.offsetHeight + 24 : 96;
        const top = window.scrollY + club.getBoundingClientRect().top - navH;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    });

    if (authResult) {
      setView(AUTH_MESSAGES[authResult] || AUTH_MESSAGES.error);
      return;
    }

    if (!subId) return;

    // Estado inicial mientras esperamos la primera respuesta.
    if (isStub) {
      setView({
        tone: 'pending',
        title: 'Modo dev (stub)',
        body: 'No hay MP_ACCESS_TOKEN configurado. La suscripción se creó como pending pero no hay flujo real con MP.',
      });
    } else {
      setView({
        tone: 'pending',
        title: 'Confirmando con Mercado Pago…',
        body: 'Esperando que MP nos avise que la suscripción quedó autorizada.',
        spinning: true,
      });
    }

    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      if (cancelled) return;
      pollCountRef.current += 1;
      try {
        const status = await api.getSubscriptionStatus(subId);
        if (cancelled) return;
        if (status.status === 'authorized') {
          setView({
            tone: 'success',
            title: '¡Listo, ya estás dentro!',
            body: 'Tu suscripción quedó autorizada. Te llega un email con el acceso — ya sos Baloskier.',
          });
          return;
        }
        if (status.status === 'cancelled' || status.status === 'failed') {
          setView({
            tone: 'error',
            title:
              status.status === 'cancelled' ? 'Suscripción cancelada' : 'No se pudo confirmar',
            body:
              status.status === 'cancelled'
                ? 'Cancelaste el flujo en Mercado Pago. Si fue sin querer, probá de nuevo.'
                : 'MP no pudo confirmar la suscripción. Revisá el estado en MP o probá de nuevo.',
          });
          return;
        }
        // Sigue pending → reintentar mientras no se nos acabe el budget.
        if (pollCountRef.current >= MAX_POLLS) {
          setView({
            tone: 'pending',
            title: 'Sigue pendiente',
            body: 'MP todavía no nos avisó. Te llega un email cuando se confirme; podés cerrar esto.',
          });
          return;
        }
        timer = window.setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        // Error de red — reintentamos hasta el límite.
        if (pollCountRef.current >= MAX_POLLS) {
          setView({
            tone: 'error',
            title: 'No pudimos consultar el estado',
            body: 'Probá refrescar en un rato. Si MP confirmó, te llega el email igual.',
          });
          return;
        }
        timer = window.setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [location.search]);

  // Limpiar query params del URL apenas mostramos el banner — así un
  // refresh no re-dispara el polling y el URL queda limpio.
  const cleanQueryParams = useCallback(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('sub') && !params.has('auth') && !params.has('dev')) return;
    params.delete('sub');
    params.delete('auth');
    params.delete('dev');
    const newSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: newSearch ? `?${newSearch}` : '',
        hash: location.hash,
      },
      { replace: true }
    );
  }, [location.search, location.pathname, location.hash, navigate]);

  useEffect(() => {
    if (view) cleanQueryParams();
  }, [view, cleanQueryParams]);

  if (!view || dismissed) return null;

  return (
    <div className={`club-return-banner club-return-banner--${view.tone}`} role="status">
      <div className="club-return-banner__inner">
        <div className="club-return-banner__icon" aria-hidden="true">
          {view.tone === 'success' && '✓'}
          {view.tone === 'pending' && (view.spinning ? <span className="crb-spinner" /> : '…')}
          {view.tone === 'error' && '!'}
        </div>
        <div className="club-return-banner__text">
          <div className="club-return-banner__title">{view.title}</div>
          <div className="club-return-banner__body">{view.body}</div>
        </div>
        <button
          type="button"
          className="club-return-banner__close"
          aria-label="Cerrar"
          data-cursor="CERRAR"
          onClick={() => setDismissed(true)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
