import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '@/services/api';

const IG_DM_URL = 'https://ig.me/m/santiagobalosky';

const PROJECT_OPTIONS = [
  { value: 'reel', label: 'Video corto / reel IA' },
  { value: 'spot', label: 'Edición 30-60s' },
  { value: 'historia', label: 'Pieza narrativa / serie corta' },
  { value: 'custom', label: 'Otro material para editar' },
] as const;

type ProjectType = (typeof PROJECT_OPTIONS)[number]['value'];
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

function trackPresupuesto(eventName: 'encargo_start' | 'encargo_created', packageId: ProjectType) {
  const metadata = { packageId, source: 'presupuesto_edicion_ia' };
  try {
    const plausible = (window as any).plausible;
    if (typeof plausible === 'function') plausible(eventName, { props: metadata });
  } catch (_) {}
  try {
    window.fetch?.('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        eventName,
        path: window.location.pathname + window.location.hash,
        target: packageId,
        metadata,
      }),
    }).catch(() => {});
  } catch (_) {}
}

function PresupuestoForm() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('reel');
  const [budget, setBudget] = useState('');
  const [brief, setBrief] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackPresupuesto('encargo_start', projectType);
  }, [projectType]);

  const resetForm = () => {
    setName('');
    setContact('');
    setProjectType('reel');
    setBudget('');
    setBrief('');
    setStatus('idle');
    setErrorMsg('');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (honeypot.trim()) return;

    setErrorMsg('');
    if (!name.trim() || contact.trim().length < 3 || brief.trim().length < 10) {
      setErrorMsg('Completá nombre, contacto y una idea de al menos 10 caracteres.');
      return;
    }

    const optionLabel = PROJECT_OPTIONS.find((option) => option.value === projectType)?.label || projectType;
    const composedBrief = [
      `Tipo: ${optionLabel}`,
      budget.trim() ? `Rango pensado: ${budget.trim()}` : 'Rango pensado: a definir',
      '',
      brief.trim(),
    ].filter(Boolean).join('\n');

    setStatus('submitting');
    try {
      await api.createEncargo({
        name: name.trim(),
        contact: contact.trim(),
        packageId: projectType,
        brief: composedBrief,
      });
      trackPresupuesto('encargo_created', projectType);
      setStatus('success');
    } catch (error: any) {
      setStatus('error');
      setErrorMsg(error?.message || 'No pude guardar el pedido. Probá por Instagram.');
    }
  };

  if (status === 'success') {
    return (
      <div
        className="reveal in visible"
        style={{
          padding: 'clamp(22px, 4vw, 34px)',
          borderRadius: 22,
          border: '1px solid rgba(250,93,41,0.44)',
          background: 'linear-gradient(180deg, rgba(250,93,41,0.14), rgba(10,9,8,0.38))',
        }}
      >
        <div className="t-eyebrow" style={{ color: 'var(--accent)' }}>
          pedido enviado
        </div>
        <h3 style={{ margin: '8px 0 8px', fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 0.95 }}>
          Me llegó.
        </h3>
        <p style={{ maxWidth: 560, margin: 0, color: 'rgba(243,239,230,0.78)', lineHeight: 1.55 }}>
          Lo veo y te respondo por el contacto que dejaste.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
          <button type="button" className="cta cta-primary" onClick={resetForm} data-cursor="OTRO">
            <span>Enviar otro</span>
            <span className="arr">+</span>
          </button>
          <a className="cta cta-ghost" href={IG_DM_URL} target="_blank" rel="noopener noreferrer" data-cursor="IG">
            <span>Seguir por IG</span>
            <span className="arr">↗</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <form
      id="prepedido"
      onSubmit={onSubmit}
      style={{
        padding: 'clamp(20px, 3vw, 30px)',
        borderRadius: 22,
        border: '1px solid rgba(243,239,230,0.14)',
        background: 'rgba(0,0,0,0.24)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 12,
      }}
    >
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />

      <div style={{ gridColumn: '1 / -1' }}>
        <div className="t-eyebrow" style={{ color: 'var(--accent)' }}>
          edición IA
        </div>
        <h3 style={{ margin: '8px 0 0', fontSize: 'clamp(26px, 3.4vw, 38px)', lineHeight: 0.95 }}>
          mandame el material y la idea.
        </h3>
      </div>

      <label className="budget-field">
        <span>tu nombre</span>
        <input
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Cómo te llamás"
        />
      </label>

      <label className="budget-field">
        <span>contacto</span>
        <input
          type="text"
          required
          maxLength={160}
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          placeholder="email, WhatsApp o @instagram"
        />
      </label>

      <label className="budget-field">
        <span>cuánto querés invertir</span>
        <input
          type="text"
          maxLength={80}
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
          placeholder="$80.000, rango, a definir"
        />
      </label>

      <label className="budget-field" style={{ gridColumn: '1 / -1' }}>
        <span>qué querés editar</span>
        <textarea
          required
          minLength={10}
          maxLength={1200}
          rows={4}
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Qué tenés, qué querés lograr, duración/formato y dónde se va a publicar."
        />
        <small>{brief.length}/1200</small>
      </label>

      {errorMsg && (
        <p style={{ gridColumn: '1 / -1', margin: 0, color: '#ff9a7d', fontSize: 13 }}>
          {errorMsg}
        </p>
      )}

      <div
        style={{
          gridColumn: '1 / -1',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span
          style={{
            color: 'rgba(243,239,230,0.48)',
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          lo veo y te respondo
        </span>
        <button type="submit" className="cta cta-primary" disabled={status === 'submitting'} data-cursor="ENVIAR">
          <span>{status === 'submitting' ? 'enviando...' : 'Presupuestame esto!'}</span>
          <span className="arr">→</span>
        </button>
      </div>
    </form>
  );
}

export default function MonetizacionHub() {
  return (
    <section id="trabajemos" className="rdz-scope rdz-apoya budget-hub">
      <span id="apoya" className="rdz-anchor-offset" aria-hidden="true" />
      <span id="prepedido-custom" className="rdz-anchor-offset" aria-hidden="true" />
      <div className="rdz-apoya-shell">
        <div className="rdz-eyebrow reveal">
          <span className="rdz-dot" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
              <path d="M12 21s-7-4.5-9.5-9C.8 8.5 2.5 5 6 5c2 0 3.5 1 4.5 2.5 1-1.5 2.5-2.5 4.5-2.5 3.5 0 5.2 3.5 3.5 7-2.5 4.5-9.5 9-9.5 9z" />
            </svg>
          </span>
          <span className="rdz-eyebrow-label">01 · TRABAJEMOS</span>
          <span className="rdz-eyebrow-sep" aria-hidden="true">/</span>
          <span className="rdz-eyebrow-cat">edición IA</span>
        </div>

        <h2 className="rdz-hero-title reveal">
          edición IA<br />
          <span className="rdz-grad-orange">con mirada</span>
          <span className="rdz-dot-end">.</span>
        </h2>

        <p className="rdz-body-copy reveal">
          Mandame material, idea y rango. Lo veo y te respondo.
        </p>

        <div className="rdz-direct-actions reveal">
          <a className="cta cta-ghost" href="/cafecito" data-cursor="CAFECITO">
            <span>Invitame un cafecito</span>
            <span className="arr">↗</span>
          </a>
        </div>

        <div className="rdz-apoya-body">
          <div
            className="hub-panel"
            role="tabpanel"
            style={{
              marginTop: 0,
              display: 'grid',
              maxWidth: 920,
              marginInline: 'auto',
            }}
          >
            <PresupuestoForm />
          </div>
        </div>
      </div>
    </section>
  );
}
