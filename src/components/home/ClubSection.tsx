import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';

/**
 * Port of `<section id="club">` — membership tiers.
 *
 * Cada botón "Sumarme" abre un modal que pide email y lanza MP preapproval
 * (suscripción mensual real) vía `POST /api/subscriptions/create`. El backend
 * crea una fila en `subscriptions` (status=pending), llama a MP y devuelve
 * el `initPoint` al que redirigimos. Cuando el usuario autoriza en MP, el
 * webhook `/api/webhook/mercadopago` actualiza la subscription a `authorized`.
 *
 * Los ids `base`/`orbita`/`cerrada` se seedean idempotentemente en db.ts con
 * los precios que se muestran acá, así el backend resuelve el membership y
 * arma el preapproval con el monto correcto.
 */
type Tier = { id: string; name: string; amount: number; subtitle: string };
const TIERS: Record<'base' | 'orbita' | 'cerrada', Tier> = {
  base:    { id: 'base',    name: 'Base',           amount: 3000,  subtitle: 'base · mensual' },
  orbita:  { id: 'orbita',  name: 'Órbita',         amount: 9000,  subtitle: 'órbita · mensual' },
  cerrada: { id: 'cerrada', name: 'Órbita cerrada', amount: 25000, subtitle: 'órbita cerrada · mensual' },
};

function formatArs(amount: number): { big: string; small: string } {
  // Argentine format: $9.000 / mes. No "k" ambiguity — full number with
  // thousand separators (period) so nadie lea "$9" como pesos o dólares.
  return { big: amount.toLocaleString('es-AR'), small: ' / mes' };
}

export default function ClubSection() {
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  // Focus email input y lock scroll mientras está abierto.
  useEffect(() => {
    if (!selectedTier) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => emailRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTier]);

  const openModal = (tier: Tier) => {
    setSelectedTier(tier);
    setEmail('');
    setErrorMsg('');
    setStatus('idle');
  };

  const closeModal = () => {
    if (status === 'submitting') return;
    setSelectedTier(null);
    setEmail('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) return;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('Poné un email válido (lo usamos para cobrarte y mandarte el acceso).');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      const resp = await api.createSubscription(selectedTier.id, trimmed);
      const redirectTo = resp.initPoint || resp.sandboxInitPoint;
      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        throw new Error('Mercado Pago no devolvió link de checkout.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'No pudimos conectar con Mercado Pago. Probá de nuevo.');
      setStatus('idle');
    }
  };

  const renderButton = (tier: Tier, label: string) => (
    <button
      type="button"
      className="tier-btn"
      data-cursor="ELEGIR"
      onClick={() => openModal(tier)}
    >
      {label}
    </button>
  );

  return (
    <section id="club">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--teal)', color: '#0a0908' }}>
                03 · BALOSKIERS
              </span>
            </div>
            <h2>los <em>baloskiers</em>.</h2>
          </div>
          <p>
            Mi círculo íntimo. Voice-notes, demos, encuentros, descuentos, early access a drops y
            encargos. Cancelás cuando quieras. <strong>Precios en pesos argentinos (ARS).</strong>
          </p>
        </div>

        <div className="tiers reveal">
          <div className="tier">
            <div className="name">base · mensual</div>
            <div className="price">
              $3.000<small> / mes</small>
            </div>
            <ul>
              <li>Demos + voice-notes mensuales</li>
              <li>Muro privado de miembros</li>
              <li>10% off en encargos</li>
              <li>Nombre en créditos web</li>
            </ul>
            {renderButton(TIERS.base, 'Sumarme')}
          </div>

          <div className="tier pop" data-cursor="ELEGIR" data-tilt>
            <div
              className="scrawl-arrow"
              style={{
                position: 'absolute',
                top: '-42px',
                right: 30,
                transform: 'rotate(120deg)',
                color: 'var(--gold)',
              }}
            >
              ↷
            </div>
            <div
              className="scrawl"
              style={{
                position: 'absolute',
                top: '-58px',
                right: 70,
                color: 'var(--gold)',
                fontSize: 28,
              }}
            >
              el que va
            </div>
            <div className="name" style={{ color: 'rgba(255,255,255,0.9)' }}>
              órbita · mensual
            </div>
            <div className="price">
              $9.000<small> / mes</small>
            </div>
            <ul>
              <li>Todo lo de Base</li>
              <li>Vivo privado mensual (Q&amp;A)</li>
              <li>25% off + early a drops</li>
              <li>Entrevistas en proceso</li>
              <li>Early a merch limitado</li>
            </ul>
            {renderButton(TIERS.orbita, 'Sumarme · recomendado')}
          </div>

          <div className="tier">
            <div className="name">órbita cerrada</div>
            <div className="price">
              $25.000<small> / mes</small>
            </div>
            <ul>
              <li>Todo lo de Órbita</li>
              <li>Zoom 1:1 trimestral</li>
              <li>Feedback personal</li>
              <li>Invitación prioritaria a lives</li>
              <li>Merch físico trimestral</li>
            </ul>
            {renderButton(TIERS.cerrada, 'Sumarme')}
          </div>
        </div>
      </div>

      {/* Email capture modal. Se monta on-demand para que el <video> del
          showreel o el lightbox no compitan por z-index. */}
      {selectedTier && (
        <div
          className="club-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Suscripción ${selectedTier.name}`}
          onClick={closeModal}
        >
          <form
            className="club-modal-card"
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="club-modal-close"
              aria-label="Cerrar"
              data-cursor="CERRAR"
              onClick={closeModal}
              disabled={status === 'submitting'}
            >
              ×
            </button>

            <div className="club-modal-eyebrow">03 · baloskiers · {selectedTier.subtitle}</div>
            <h3 className="club-modal-title">
              sumate a <em>{selectedTier.name}</em>
            </h3>
            <div className="club-modal-price">
              ${formatArs(selectedTier.amount).big}
              <small>{formatArs(selectedTier.amount).small} ARS</small>
            </div>

            <p className="club-modal-copy">
              Son <strong>${selectedTier.amount.toLocaleString('es-AR')} pesos argentinos por mes</strong>.
              Te cobramos automáticamente vía Mercado Pago y cancelás cuando quieras desde tu cuenta de MP.
            </p>

            <label className="club-modal-field">
              <span>email</span>
              <input
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="vos@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'submitting'}
                required
              />
            </label>

            {errorMsg && <p className="club-modal-error">{errorMsg}</p>}

            <div className="club-modal-actions">
              <button
                type="button"
                className="club-modal-cancel"
                onClick={closeModal}
                disabled={status === 'submitting'}
              >
                cancelar
              </button>
              <button
                type="submit"
                className="club-modal-submit"
                data-cursor="IR"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'conectando…' : 'ir a mercado pago →'}
              </button>
            </div>

            <p className="club-modal-fine">
              pago seguro · mercado pago · podés cancelar la suscripción desde MP
            </p>
          </form>
        </div>
      )}
    </section>
  );
}
