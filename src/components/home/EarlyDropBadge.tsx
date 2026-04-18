import type { Media } from '@/types';

/**
 * Chip que se muestra encima de un ítem cuando `isEarlyDrop` es true.
 *
 * Semántica:
 *   - Miembro (Baloskier) autenticado: ve el mediaUrl real. Le mostramos
 *     "ADELANTO BALOSKIER" para que sepa que está viendo algo antes que
 *     el resto — refuerza el valor de la membresía.
 *   - No miembro: el backend redacta `mediaUrl` a null y fuerza
 *     `isLocked=true`. Acá mostramos "ADELANTO · EN XD" con el countdown
 *     hasta que se libera al público, para tentarlo a entrar.
 *
 * Heurística para distinguir viewer:
 *   mediaUrl presente → viewer tiene acceso (miembro o thumb-only no cuenta).
 *   Si mediaUrl es null pero publicFrom existe → no tiene acceso todavía.
 *
 * Estilo inline para no tocar CSS global de cada sección.
 */
export default function EarlyDropBadge({ media }: { media: Media }) {
  if (!media.isEarlyDrop || !media.publicFrom) return null;

  const hasAccess = Boolean(media.mediaUrl);
  const until = new Date(media.publicFrom).getTime();
  const now = Date.now();
  const msRemaining = Math.max(0, until - now);

  const label = hasAccess ? 'ADELANTO BALOSKIER' : `LIBERA EN ${formatCountdown(msRemaining)}`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 3,
        padding: '4px 8px',
        background: hasAccess ? 'rgba(250,93,41,0.92)' : 'rgba(0,0,0,0.65)',
        color: hasAccess ? '#0a0908' : '#FA5D29',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        borderRadius: 999,
        border: hasAccess ? '1px solid rgba(10,9,8,0.2)' : '1px solid rgba(250,93,41,0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        pointerEvents: 'none',
        lineHeight: 1.2,
      }}
      aria-label={label}
    >
      {label}
    </div>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'YA';
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days >= 1) return `${days}D`;
  if (hours >= 1) return `${hours}H`;
  return `${minutes}M`;
}
