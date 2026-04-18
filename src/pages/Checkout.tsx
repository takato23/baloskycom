import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';

/**
 * Checkout — "single question per screen" flow (mockup-2 port).
 *
 * Replaces the old multi-section form. Ported from
 * `design-mockups/checkout/mockup-2-single-question.html` 1:1 in structure
 * (progress dots, step label, fixed bottom CTA, ←-back) and ties it to the
 * real backend endpoints:
 *
 *   · One-time payments (cafecito / encargo / producto) → `api.createPreference`
 *   · Recurring subscriptions (baloskiers) → `api.createSubscription`
 *
 * The flow adapts to the URL mode:
 *
 *   /checkout                          → full 4-step: mission → amount → datos → confirm
 *   /checkout?mode=cafecito            → amount (chips + custom) → datos → confirm
 *   /checkout?mode=cafecito&amount=2000→ amount pre-selected, datos → confirm
 *   /checkout?mode=encargo&amount=25000→ fixed amount, pedido (required) → datos → confirm
 *   /checkout?mode=baloskiers          → tier → email (required) → confirm
 *   /checkout?mode=baloskiers&tier=orbita
 *                                       → tier pre-selected, email → confirm
 *   /checkout?mode=producto&id=xxx     → fixed price (from catalog), datos → confirm
 *
 * Visual language is pulled directly from the mockup CSS so the feel survives
 * the port: Inter Tight display, JetBrains Mono mono, accent #FA5D29, panels
 * #141110, borders rgba(255,255,255,0.15). Everything sits inside a 440px
 * shell so the mobile treatment reads identically to the mockup on a phone,
 * and looks centered/contained on desktop.
 */

type Mission = 'cafecito' | 'encargo' | 'baloskiers' | 'producto';

type MissionDef = {
  id: Mission;
  icon: string;
  title: string;
  sub: string;
};

const MISSIONS: MissionDef[] = [
  { id: 'cafecito',   icon: '☕', title: 'Cafecito',    sub: 'aporte libre a lo que Santi esté haciendo' },
  { id: 'encargo',    icon: '◈', title: 'Encargo IA',  sub: 'un pedido concreto + IA mágica' },
  { id: 'baloskiers', icon: '⌘', title: 'Baloskiers',  sub: 'membresía mensual · contenido exclusivo' },
  { id: 'producto',   icon: '◎', title: 'Del muro',    sub: 'un producto del catálogo' },
];

type Tier = { id: 'base' | 'orbita' | 'cerrada'; name: string; amount: number; blurb: string };
const TIERS: Tier[] = [
  { id: 'base',    name: 'Base',           amount: 3000,  blurb: 'demos + muro privado · 10% off' },
  { id: 'orbita',  name: 'Órbita',         amount: 9000,  blurb: 'vivo mensual · 25% off · early drops' },
  { id: 'cerrada', name: 'Órbita cerrada', amount: 25000, blurb: 'zoom 1:1 trimestral · merch físico' },
];

type AmountChip = { value: number; label: string };
const AMOUNT_CHIPS_CAFECITO: AmountChip[] = [
  { value: 2000,   label: 'cafecito' },
  { value: 5000,   label: 'para 2 cafés' },
  { value: 10000,  label: 'el almuerzo' },
  { value: 25000,  label: 'una canción IA' },
];

// For encargo the "suggested" row is the real product price list from the
// home. When a card on the home links here with amount=N, we jump straight
// past this step, but if someone lands on /checkout?mode=encargo without a
// preset amount we show these as the menu.
const AMOUNT_CHIPS_ENCARGO: AmountChip[] = [
  { value: 25000,  label: 'canción IA' },
  { value: 80000,  label: 'pack 5 imágenes' },
  { value: 99000,  label: 'zoom 1:1 · 45min' },
  { value: 150000, label: 'pedido custom' },
];

const MIN_AMOUNT = 500;

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ---------------- URL → initial state ------------------------------------
  const urlMode = searchParams.get('mode') as Mission | null;
  const urlAmount = (() => {
    const raw = searchParams.get('amount');
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const urlTier = searchParams.get('tier') as Tier['id'] | null;
  const urlProductId = searchParams.get('id');

  const missionPreset = MISSIONS.some((m) => m.id === urlMode) ? (urlMode as Mission) : null;

  // ---------------- Flow state ---------------------------------------------
  const [mission, setMission] = useState<Mission | null>(missionPreset);
  const [amount, setAmount] = useState<number>(urlAmount ?? 0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [tier, setTier] = useState<Tier | null>(
    urlTier ? TIERS.find((t) => t.id === urlTier) ?? null : null,
  );
  const [pedido, setPedido] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ---------------- Steps --------------------------------------------------
  // We compute the step list dynamically based on what's already been filled
  // from the URL. The same `step` cursor walks through whichever remain.
  type StepId = 'mission' | 'tier' | 'amount' | 'pedido' | 'email' | 'datos' | 'confirm';

  const steps: StepId[] = useMemo(() => {
    const s: StepId[] = [];
    if (!missionPreset) s.push('mission');

    const current: Mission | null = mission ?? missionPreset;
    if (!current) {
      // User hasn't picked yet — just show the mission step until they do.
      return s.length ? s : ['mission'];
    }

    if (current === 'baloskiers') {
      if (!urlTier) s.push('tier');
      s.push('email');
    } else if (current === 'encargo') {
      if (!urlAmount) s.push('amount');
      s.push('pedido');
      s.push('datos');
    } else if (current === 'cafecito') {
      if (!urlAmount) s.push('amount');
      s.push('datos');
    } else if (current === 'producto') {
      // Product price always comes from URL (?amount=xxx). If it didn't,
      // we'd need a catalog step — for now fall back to amount.
      if (!urlAmount) s.push('amount');
      s.push('datos');
    }
    s.push('confirm');
    return s;
  }, [mission, missionPreset, urlAmount, urlTier]);

  const [stepIdx, setStepIdx] = useState(0);
  const step: StepId = steps[Math.min(stepIdx, steps.length - 1)] ?? 'mission';
  const totalSteps = steps.length;

  // If the user picks a mission mid-flow, make sure we don't jump past the
  // rebuilt steps array. We also reset the cursor to the first *remaining*
  // step any time the shape of steps changes.
  useEffect(() => {
    if (stepIdx >= steps.length) setStepIdx(steps.length - 1);
  }, [steps, stepIdx]);

  // ---------------- Derived -----------------------------------------------
  const currentMission = mission ?? missionPreset;
  const effectiveAmount = currentMission === 'baloskiers' ? tier?.amount ?? 0 : amount;

  const amountValid = effectiveAmount >= MIN_AMOUNT;
  const pedidoValid = pedido.trim().length >= 10;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Can we proceed from the *current* step?
  const canAdvance = (() => {
    switch (step) {
      case 'mission': return !!mission;
      case 'tier':    return !!tier;
      case 'amount':  return amountValid;
      case 'pedido':  return pedidoValid;
      case 'email':   return emailValid;
      case 'datos':   return true; // optional
      case 'confirm': return true;
      default: return false;
    }
  })();

  // ---------------- Handlers ----------------------------------------------
  const goBack = () => {
    if (stepIdx === 0) {
      navigate(-1);
      return;
    }
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const goNext = () => {
    if (!canAdvance) return;
    if (step === 'confirm') {
      void handleSubmit();
      return;
    }
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  };

  const handleAmountChip = (v: number) => {
    setAmount(v);
    setCustomAmount('');
  };
  const handleCustomAmount = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    setCustomAmount(digits);
    setAmount(digits ? parseInt(digits, 10) : 0);
  };

  async function handleSubmit() {
    setSubmitError('');
    setSubmitting(true);
    try {
      if (currentMission === 'baloskiers') {
        if (!tier) throw new Error('Falta elegir el tier.');
        const resp = await api.createSubscription(tier.id, email.trim().toLowerCase());
        const redirect = resp.initPoint || resp.sandboxInitPoint;
        if (!redirect) throw new Error('Mercado Pago no devolvió link.');
        window.location.href = redirect;
        return;
      }

      // One-time payments (cafecito, encargo, producto)
      const title = currentMission === 'encargo'
        ? 'Encargo · Balosky'
        : currentMission === 'producto'
        ? 'Producto · Balosky'
        : 'Aporte · Balosky';

      const finalMessage = currentMission === 'encargo'
        ? `[ENCARGO]\nPedido: ${pedido}\n\n${message ? `Mensaje: ${message}` : ''}`.trim()
        : message;

      const campaignId = urlProductId || 'c3'; // c3 = cafecito catch-all
      const resp = await api.createPreference(
        effectiveAmount,
        title,
        campaignId,
        name || undefined,
        finalMessage || undefined,
      );
      const redirect = resp.init_point || resp.sandbox_init_point;
      if (!redirect) throw new Error('Mercado Pago no devolvió link.');
      window.location.href = redirect;
    } catch (err: any) {
      console.error('checkout submit failed', err);
      setSubmitError(err?.message || 'No pudimos iniciar el pago. Probá de nuevo.');
      setSubmitting(false);
    }
  }

  // ---------------- Render helpers ----------------------------------------
  const stepNumber = String(stepIdx + 1).padStart(2, '0');
  const totalStr = String(totalSteps).padStart(2, '0');

  const ctaLabel = (() => {
    if (submitting) return 'conectando…';
    if (step === 'confirm') {
      if (currentMission === 'baloskiers' && tier) {
        return `suscribirme · $${tier.amount.toLocaleString('es-AR')}/mes →`;
      }
      return `pagar $${effectiveAmount.toLocaleString('es-AR')} →`;
    }
    return 'continuar →';
  })();

  const legalLine = step === 'confirm'
    ? (currentMission === 'baloskiers'
        ? '● pago recurrente · mercado pago · cancelás cuando quieras'
        : '● pago seguro · mercado pago')
    : `paso ${stepNumber} de ${totalStr}`;

  return (
    <div className="chk-root">
      <style>{css}</style>

      {/* Progress bar */}
      <div className="chk-progress">
        <button className="chk-back" aria-label="volver" onClick={goBack}>←</button>
        <div className="chk-dots">
          {Array.from({ length: totalSteps }).map((_, i) => {
            let cls = 'chk-dot';
            if (i < stepIdx) cls += ' done';
            if (i === stepIdx) cls += ' active';
            return <div key={i} className={cls} />;
          })}
        </div>
        <span className="chk-step-label">{stepNumber} / {totalStr}</span>
      </div>

      <div className="chk-viewport">
        <div className="chk-shell">

          {/* --------- STEP: MISSION --------- */}
          {step === 'mission' && (
            <section className="chk-screen">
              <div className="chk-eyebrow">paso {stepNumber}</div>
              <h1 className="chk-prompt">¿qué querés apoyar?</h1>
              <p className="chk-hint">Elegí a dónde va tu aporte. Podés cambiarlo después.</p>
              <div className="chk-choice-list">
                {MISSIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`chk-choice${mission === m.id ? ' active' : ''}`}
                    onClick={() => setMission(m.id)}
                  >
                    <div className="chk-icn">{m.icon}</div>
                    <div>
                      <div className="chk-title">{m.title}</div>
                      <div className="chk-sub">{m.sub}</div>
                    </div>
                    <div className="chk-go">→</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* --------- STEP: TIER (baloskiers) --------- */}
          {step === 'tier' && (
            <section className="chk-screen">
              <div className="chk-eyebrow">paso {stepNumber}</div>
              <h1 className="chk-prompt">¿qué tier?</h1>
              <p className="chk-hint">Podés cancelar cuando quieras desde tu cuenta de Mercado Pago.</p>
              <div className="chk-choice-list">
                {TIERS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`chk-choice${tier?.id === t.id ? ' active' : ''}`}
                    onClick={() => setTier(t)}
                  >
                    <div className="chk-icn">${String(t.amount / 1000)}k</div>
                    <div>
                      <div className="chk-title">{t.name}</div>
                      <div className="chk-sub">{t.blurb}</div>
                    </div>
                    <div className="chk-go">/mes →</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* --------- STEP: AMOUNT --------- */}
          {step === 'amount' && (
            <section className="chk-screen">
              <div className="chk-eyebrow">paso {stepNumber}</div>
              <h1 className="chk-prompt">¿cuánto ponés?</h1>
              <p className="chk-hint">
                {currentMission === 'encargo'
                  ? 'Elegí el pack o ingresá un monto custom.'
                  : 'Cada monto tiene su onda. Tirá un extra si querés.'}
              </p>
              <div className="chk-amount-grid">
                {(currentMission === 'encargo' ? AMOUNT_CHIPS_ENCARGO : AMOUNT_CHIPS_CAFECITO).map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    className={`chk-amt${amount === chip.value && !customAmount ? ' active' : ''}`}
                    onClick={() => handleAmountChip(chip.value)}
                  >
                    <div className="chk-amt-n">${(chip.value / 1000)}k</div>
                    <div className="chk-amt-lbl">{chip.label}</div>
                  </button>
                ))}
              </div>
              <div className="chk-custom-amount">
                <span className="chk-dollar">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="otro monto"
                  value={customAmount}
                  onChange={(e) => handleCustomAmount(e.target.value)}
                />
              </div>
              {!amountValid && amount > 0 && (
                <p className="chk-err">El monto mínimo es ${MIN_AMOUNT}.</p>
              )}
            </section>
          )}

          {/* --------- STEP: PEDIDO (encargo) --------- */}
          {step === 'pedido' && (
            <section className="chk-screen">
              <div className="chk-eyebrow">paso {stepNumber}</div>
              <h1 className="chk-prompt">¿qué te hago?</h1>
              <p className="chk-hint">
                Contame el pedido con detalle: referencias, tono, para qué lo vas a usar.
              </p>
              <div className="chk-text-input">
                <textarea
                  placeholder="ej: una canción reggaeton sobre mi gato Tobi, tono gracioso tipo Bizarrap. Para subir a IG."
                  value={pedido}
                  onChange={(e) => setPedido(e.target.value)}
                  rows={6}
                  autoFocus
                />
                {!pedidoValid && pedido.length > 0 && (
                  <p className="chk-err">Un poquito más de detalle — mínimo 10 caracteres.</p>
                )}
              </div>
            </section>
          )}

          {/* --------- STEP: EMAIL (baloskiers) --------- */}
          {step === 'email' && (
            <section className="chk-screen">
              <div className="chk-eyebrow">paso {stepNumber}</div>
              <h1 className="chk-prompt">¿tu email?</h1>
              <p className="chk-hint">
                Lo usamos para cobrarte la suscripción vía Mercado Pago y mandarte el acceso al muro privado.
              </p>
              <div className="chk-text-input">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="vos@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
                {!emailValid && email.length > 0 && (
                  <p className="chk-err">Revisá el email.</p>
                )}
              </div>
            </section>
          )}

          {/* --------- STEP: DATOS (nombre + mensaje opcional) --------- */}
          {step === 'datos' && (
            <section className="chk-screen">
              <div className="chk-eyebrow">paso {stepNumber}</div>
              <h1 className="chk-prompt">¿dejás un mensaje?</h1>
              <p className="chk-hint">
                {currentMission === 'encargo'
                  ? 'Dejame cómo contactarte y lo que quieras agregar.'
                  : 'Todo opcional. Si dejás nombre, aparece en el muro de aportantes.'}
              </p>
              <div className="chk-text-input">
                <label className="chk-lbl">tu nombre o @IG</label>
                <input
                  type="text"
                  placeholder={currentMission === 'encargo' ? 'cómo te contacto' : 'cómo te firmás en el muro'}
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                />
                <label className="chk-lbl">mensaje (opcional)</label>
                <textarea
                  placeholder="dejale algo a santi…"
                  value={message}
                  maxLength={280}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </section>
          )}

          {/* --------- STEP: CONFIRM --------- */}
          {step === 'confirm' && (
            <section className="chk-screen">
              <div className="chk-eyebrow">paso {stepNumber} · listo</div>
              <h1 className="chk-prompt">todo ok,<br/>vamos a pagar</h1>
              <div className="chk-summary">
                <div className="chk-sum-row">
                  <span className="k">misión</span>
                  <span className="v">{MISSIONS.find((m) => m.id === currentMission)?.title ?? '—'}</span>
                </div>
                {currentMission === 'baloskiers' ? (
                  <>
                    <div className="chk-sum-row">
                      <span className="k">tier</span>
                      <span className="v">{tier?.name ?? '—'}</span>
                    </div>
                    <div className="chk-sum-row">
                      <span className="k">email</span>
                      <span className="v" style={{ maxWidth: '60%', textAlign: 'right', fontSize: 13 }}>{email}</span>
                    </div>
                    <div className="chk-sum-row">
                      <span className="k">cobro</span>
                      <span className="v">mensual recurrente</span>
                    </div>
                  </>
                ) : (
                  <>
                    {pedido && (
                      <div className="chk-sum-row">
                        <span className="k">pedido</span>
                        <span className="v" style={{ maxWidth: '60%', textAlign: 'right', fontSize: 13, fontWeight: 500 }}>
                          {pedido.length > 60 ? pedido.slice(0, 57) + '…' : pedido}
                        </span>
                      </div>
                    )}
                    {name && (
                      <div className="chk-sum-row">
                        <span className="k">nombre</span>
                        <span className="v">{name}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="chk-sum-total">
                  <span className="k">{currentMission === 'baloskiers' ? 'total / mes' : 'total'}</span>
                  <span className="v">${effectiveAmount.toLocaleString('es-AR')}</span>
                </div>
              </div>
              {submitError && (
                <p className="chk-err" style={{ marginTop: 14 }}>{submitError}</p>
              )}
            </section>
          )}

        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="chk-cta-wrap">
        <div className="chk-cta-inner">
          <button
            className="chk-cta"
            onClick={(e: FormEvent) => { e.preventDefault(); goNext(); }}
            disabled={!canAdvance || submitting}
          >
            {submitting ? (
              <span className="chk-spinner" aria-label="cargando" />
            ) : (
              <span>{ctaLabel}</span>
            )}
          </button>
          <div className="chk-legal">{legalLine}</div>
        </div>
      </div>
    </div>
  );
}

// Inline CSS: ported from mockup-2-single-question.html. Kept scoped with
// the .chk- prefix so nothing leaks into the rest of the app.
const css = `
  .chk-root {
    position: fixed;
    inset: 0;
    background: #0a0908;
    color: white;
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
    z-index: 100;
  }
  .chk-progress {
    position: fixed;
    top: 0; left: 0; right: 0;
    padding: calc(14px + env(safe-area-inset-top,0px)) 20px 14px;
    background: rgba(10,9,8,0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .chk-back {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid rgba(255,255,255,0.15);
    background: transparent;
    color: white;
    font-family: 'JetBrains Mono', monospace;
    cursor: pointer;
  }
  .chk-back:hover { border-color: #FA5D29; color: #FA5D29; }
  .chk-dots { display: flex; gap: 6px; flex: 1; }
  .chk-dot {
    height: 3px;
    flex: 1;
    background: rgba(255,255,255,0.15);
    transition: background .3s;
  }
  .chk-dot.done { background: rgba(255,255,255,0.5); }
  .chk-dot.active { background: #FA5D29; }
  .chk-step-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.22em;
    color: rgba(255,255,255,0.55);
    text-transform: uppercase;
  }

  .chk-viewport {
    position: absolute;
    inset: 0;
    padding: calc(72px + env(safe-area-inset-top,0px)) 0 calc(140px + env(safe-area-inset-bottom,0px));
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .chk-shell {
    max-width: 440px;
    margin: 0 auto;
    padding: 0 24px;
    position: relative;
  }
  .chk-screen {
    display: flex;
    flex-direction: column;
    animation: chkFadeIn .28s ease;
  }
  @keyframes chkFadeIn {
    from { opacity: 0; transform: translateX(12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .chk-eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.22em;
    color: #FA5D29;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .chk-prompt {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 900;
    font-size: clamp(36px, 10vw, 56px);
    letter-spacing: -0.05em;
    line-height: 0.95;
    margin: 0 0 16px;
  }
  .chk-hint {
    font-size: 14px;
    color: rgba(255,255,255,0.7);
    line-height: 1.5;
    margin-bottom: 28px;
    max-width: 380px;
  }
  .chk-err {
    font-size: 13px;
    color: #ff7b7b;
    font-weight: 600;
    margin-top: 8px;
  }

  .chk-choice-list { display: grid; gap: 10px; }
  .chk-choice {
    display: grid;
    grid-template-columns: 44px 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 18px;
    background: #141110;
    border: 1px solid rgba(255,255,255,0.15);
    color: white;
    text-align: left;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: border-color .12s, background-color .12s;
    min-height: 74px;
    width: 100%;
  }
  .chk-choice:hover,
  .chk-choice.active {
    border-color: #FA5D29;
    background: rgba(250,93,41,0.08);
  }
  .chk-icn {
    width: 44px; height: 44px;
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter Tight', sans-serif;
    font-weight: 900;
    font-size: 16px;
    color: #FA5D29;
  }
  .chk-title {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 800;
    font-size: 18px;
    letter-spacing: -0.02em;
  }
  .chk-sub {
    font-size: 12px;
    color: rgba(255,255,255,0.6);
    margin-top: 2px;
  }
  .chk-go {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.22em;
    color: rgba(255,255,255,0.5);
  }

  .chk-amount-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }
  .chk-amt {
    padding: 22px 14px;
    background: #141110;
    border: 1px solid rgba(255,255,255,0.15);
    color: white;
    cursor: pointer;
    font-family: 'Inter Tight', sans-serif;
    text-align: left;
    transition: border-color .12s, background-color .12s;
    min-height: 84px;
  }
  .chk-amt:hover, .chk-amt.active {
    border-color: #FA5D29;
    background: rgba(250,93,41,0.08);
  }
  .chk-amt-n {
    font-weight: 900;
    font-size: 28px;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .chk-amt-lbl {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    font-size: 10px;
    letter-spacing: 0.22em;
    color: rgba(255,255,255,0.55);
    margin-top: 8px;
    text-transform: uppercase;
  }
  .chk-custom-amount { position: relative; }
  .chk-dollar {
    position: absolute;
    left: 18px; top: 50%; transform: translateY(-50%);
    font-family: 'Inter Tight', sans-serif; font-weight: 900;
    font-size: 22px; color: rgba(255,255,255,0.5);
  }
  .chk-custom-amount input {
    width: 100%;
    background: #141110;
    border: 1px solid rgba(255,255,255,0.15);
    color: white;
    padding: 20px 20px 20px 38px;
    font-family: 'Inter Tight', sans-serif;
    font-weight: 900;
    font-size: 22px;
    letter-spacing: -0.03em;
  }
  .chk-custom-amount input:focus { outline: none; border-color: #FA5D29; }

  .chk-text-input textarea,
  .chk-text-input input {
    width: 100%;
    background: #141110;
    border: 1px solid rgba(255,255,255,0.15);
    color: white;
    padding: 16px;
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    resize: none;
  }
  .chk-text-input textarea { min-height: 140px; }
  .chk-text-input textarea:focus,
  .chk-text-input input:focus { outline: none; border-color: #FA5D29; }
  .chk-text-input .chk-lbl {
    display: block;
    margin: 14px 0 6px;
    font-size: 10px;
    letter-spacing: 0.22em;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    color: rgba(255,255,255,0.6);
  }

  .chk-summary {
    background: #141110;
    border: 1px solid rgba(255,255,255,0.15);
    padding: 22px;
  }
  .chk-sum-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px dashed rgba(255,255,255,0.15);
    font-size: 14px;
  }
  .chk-sum-row:last-of-type { border-bottom: 0; }
  .chk-sum-row .k {
    color: rgba(255,255,255,0.65);
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .chk-sum-row .v {
    color: white;
    font-family: 'Inter Tight', sans-serif;
    font-weight: 700;
  }
  .chk-sum-total {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-top: 16px;
    margin-top: 6px;
    border-top: 1px solid rgba(255,255,255,0.15);
  }
  .chk-sum-total .k {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.22em;
    color: rgba(255,255,255,0.65);
    text-transform: uppercase;
  }
  .chk-sum-total .v {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 900;
    font-size: 44px;
    letter-spacing: -0.05em;
    color: #FA5D29;
    line-height: 1;
  }

  .chk-cta-wrap {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    padding: 14px 20px calc(14px + env(safe-area-inset-bottom,0px));
    background: rgba(10,9,8,0.98);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255,255,255,0.15);
    z-index: 30;
  }
  .chk-cta-inner { max-width: 440px; margin: 0 auto; }
  .chk-cta {
    width: 100%;
    background: #FA5D29;
    color: white;
    border: 1px solid #FA5D29;
    padding: 18px;
    font-family: 'Inter Tight', sans-serif;
    font-weight: 800;
    font-size: 16px;
    letter-spacing: -0.01em;
    cursor: pointer;
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .chk-cta:hover:not(:disabled) { opacity: 0.92; }
  .chk-cta:disabled { opacity: 0.4; cursor: not-allowed; }
  .chk-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: white;
    border-radius: 50%;
    animation: chkSpin 0.8s linear infinite;
  }
  @keyframes chkSpin { to { transform: rotate(360deg); } }
  .chk-legal {
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.22em;
    color: rgba(255,255,255,0.55);
    margin-top: 8px;
    text-transform: uppercase;
  }
`;
