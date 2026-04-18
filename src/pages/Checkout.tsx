import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, CreditCard, Wand2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { getPageStyles } from '@/themes/pageStyles';
import InnerPageNav from '@/components/InnerPageNav';

/**
 * Checkout — refactor "1 botón = 1 acción" (abril 2026).
 *
 * Antes este componente manejaba 4 secciones (destino / monto / encargo /
 * mensaje) con sidebar sticky, código de descuento y upload de imagen. La
 * mayoría de ese flujo no tenía sentido porque cada CTA del home ya sabe
 * exactamente qué es lo que va a comprar el usuario — no necesita elegir
 * campaña, ni el monto si ya clickeó un botón con precio.
 *
 * Ahora esta página sólo maneja 2 modos:
 *
 *   `mode=libre`  (default)
 *     - El usuario eligió "aportar libre" o aterrizó sin parámetros.
 *     - Chips de monto ($2k / $5k / $10k / otro) + nombre + mensaje.
 *
 *   `mode=encargo`
 *     - Llega desde un CTA tipo "canción con IA" con `amount` fijo en la URL.
 *     - El monto no se edita, pero sí se pide un pedido (textarea required).
 *
 * El resto de los CTAs del home (cafecito, pack-images, zoom, pack-walls)
 * NUNCA llegan acá — van directo a `/api/checkout/quick?mode=...` que hace
 * 302 a Mercado Pago sin página intermedia. Ver `server/routes/api.ts`.
 */

type Mode = 'libre' | 'encargo';

const SUGGESTED_AMOUNTS_LIBRE = [2000, 5000, 10000, 25000];
const MIN_AMOUNT = 500;

export default function Checkout() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useAppContext();
  const checkoutCopy = settings?.content.checkout.copy;
  const styles = getPageStyles();

  // Mode + amount derivan de la URL y no cambian después.
  const mode: Mode = useMemo(() => {
    const raw = searchParams.get('mode')?.trim();
    return raw === 'encargo' ? 'encargo' : 'libre';
  }, [searchParams]);

  const urlAmount = useMemo(() => {
    const raw = searchParams.get('amount');
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  // Campaña destino: siempre c3 (cafecito = catch-all) a menos que el CTA
  // diga explícitamente otra. No damos al usuario la opción de elegir —
  // eso lo decide el botón de origen.
  const targetCampaignId = (searchParams.get('campaign')?.trim() || campaignId || 'c3');

  const [amount, setAmount] = useState<number>(
    mode === 'encargo' ? (urlAmount ?? 25000) : (urlAmount ?? 2000)
  );
  const [customAmount, setCustomAmount] = useState<string>(
    urlAmount && !SUGGESTED_AMOUNTS_LIBRE.includes(urlAmount) ? String(urlAmount) : ''
  );
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [pedido, setPedido] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const amountError = amount < MIN_AMOUNT ? `El monto mínimo es $${MIN_AMOUNT}` : '';
  const pedidoError = mode === 'encargo' && pedido.trim().length < 10
    ? 'Contame qué querés — mínimo 10 caracteres'
    : '';

  const handleAmountSelect = (value: number) => {
    setAmount(value);
    setCustomAmount('');
  };

  const handleCustomAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomAmount(raw);
    setAmount(raw ? parseInt(raw, 10) : 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountError || pedidoError) return;

    setSubmitError('');
    setIsProcessing(true);

    try {
      const title = mode === 'encargo'
        ? `Encargo · Balosky`
        : `Aporte libre · Balosky`;

      const finalMessage = mode === 'encargo'
        ? `[ENCARGO]\nPedido: ${pedido}\n\n${message ? `Mensaje: ${message}` : ''}`.trim()
        : message;

      const response = await api.createPreference(
        amount,
        title,
        targetCampaignId,
        name,
        finalMessage
      );

      const target = response.init_point || response.sandbox_init_point;
      if (!target) throw new Error('No init_point received');
      window.location.href = target;
    } catch (error) {
      console.error('Error creating preference:', error);
      setSubmitError('No pudimos iniciar el pago. Probá de nuevo en un rato.');
    } finally {
      setIsProcessing(false);
    }
  };

  const labelMono = 'font-mono text-[11px] tracking-[0.22em] uppercase text-white/70';
  const inputDark = 'w-full bg-black/50 border border-white/15 text-white placeholder-white/45 focus:border-[var(--accent)] focus:outline-none transition-colors';
  const panelDark = 'bg-[#141110] border border-white/15 p-5 sm:p-6';

  const heroTitle = mode === 'encargo'
    ? 'encargo'
    : (checkoutCopy?.title || 'aportar');
  const heroSub = mode === 'encargo'
    ? (checkoutCopy?.encargoDescription || 'Contame qué querés y lo hacemos. Te respondo por IG o mail cuando esté listo.')
    : (checkoutCopy?.subtitle || 'Elegí un monto, dejame un mensaje si querés, y pagás con Mercado Pago. Listo.');

  return (
    <div
      className={cn('theme-page text-white', styles.shell)}
      style={{ background: '#0a0908', minHeight: '100vh' }}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-[calc(96px+env(safe-area-inset-top,0px))] sm:pt-24 pb-40 sm:pb-24">
        <InnerPageNav label={mode === 'encargo' ? 'encargo' : 'aportar'} />

        <button
          onClick={() => navigate(-1)}
          className={cn(labelMono, 'flex items-center gap-2 hover:text-[var(--accent)] transition-colors mt-4 sm:mt-8')}
          data-hover
        >
          <ArrowLeft className="w-4 h-4" />
          <span>volver</span>
        </button>

        <header className="pt-4 space-y-3">
          {mode === 'encargo' && (
            <p className={cn(labelMono, 'flex items-center gap-2 text-[var(--accent)]')}>
              <Wand2 className="w-3.5 h-3.5" />
              <span>encargo personalizado</span>
            </p>
          )}
          <h1
            className="text-white"
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(2.25rem, 9vw, 5rem)',
              letterSpacing: '-0.05em',
              lineHeight: 1.02,
            }}
          >
            {heroTitle}
          </h1>
          <p className="text-white/75 text-sm sm:text-base max-w-lg leading-relaxed">
            {heroSub}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 mt-8">
          {/* ------ MONTO ------ */}
          <section className={panelDark}>
            <header className="flex items-baseline justify-between mb-4">
              <h2
                className="text-white"
                style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.03em' }}
              >
                {mode === 'encargo' ? 'precio' : 'monto'}
              </h2>
              <span className={labelMono}>ARS</span>
            </header>

            {mode === 'encargo' ? (
              // Encargo: el precio es fijo (viene del CTA). No lo editamos.
              <div className="flex items-baseline gap-3 py-2">
                <span
                  style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 900, fontSize: '3rem', letterSpacing: '-0.04em', lineHeight: 1 }}
                >
                  ${amount.toLocaleString('es-AR')}
                </span>
                <span className={labelMono}>fijo</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SUGGESTED_AMOUNTS_LIBRE.map((value) => {
                    const active = amount === value && !customAmount;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleAmountSelect(value)}
                        data-hover
                        className={cn(
                          'py-5 px-3 font-bold text-base transition-all active:scale-95 border min-h-[56px]',
                          active
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'bg-black/40 border-white/15 text-white hover:border-[var(--accent)]/70'
                        )}
                      >
                        ${value.toLocaleString('es-AR')}
                      </button>
                    );
                  })}
                </div>

                <div className="relative mt-3">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-lg text-white/55">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="otro monto..."
                    value={customAmount}
                    onChange={handleCustomAmount}
                    className={cn(inputDark, 'py-4 pl-10 pr-5 font-bold text-base tracking-tight')}
                  />
                </div>
                {amountError && <p className="text-sm mt-2 text-red-300 font-bold">{amountError}</p>}
              </>
            )}
          </section>

          {/* ------ PEDIDO (solo en encargo) ------ */}
          {mode === 'encargo' && (
            <section className={panelDark}>
              <header className="flex items-baseline justify-between mb-3">
                <h2
                  className="text-white"
                  style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.03em' }}
                >
                  tu pedido
                </h2>
                <span className={labelMono}>requerido</span>
              </header>
              <p className="text-sm text-white/70 mb-3 leading-relaxed">
                {checkoutCopy?.encargoTitle || '¿Qué querés que te haga?'} Escribilo con el detalle que puedas — referencias, tono, uso.
              </p>
              <textarea
                placeholder="ej: una canción reggaeton sobre mi gato que se llama Tobi. Tono gracioso, tipo Bizarrap. La voy a subir a mi IG."
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
                rows={5}
                required
                className={cn(inputDark, 'p-4 text-base resize-none')}
              />
              {pedidoError && <p className="text-sm mt-2 text-red-300 font-bold">{pedidoError}</p>}
            </section>
          )}

          {/* ------ CONTACTO + MENSAJE ------ */}
          <section className={panelDark}>
            <header className="flex items-baseline justify-between mb-3">
              <h2
                className="text-white"
                style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.03em' }}
              >
                {mode === 'encargo' ? 'tus datos' : 'mensaje'}
              </h2>
              <span className={labelMono}>opcional</span>
            </header>

            <input
              type="text"
              placeholder={mode === 'encargo' ? 'tu nombre o @IG (para contactarte)' : 'tu nombre (aparece en el muro)'}
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              className={cn(inputDark, 'py-4 px-5 text-base')}
            />

            {mode !== 'encargo' && (
              <textarea
                placeholder="dejale un mensaje a santi..."
                value={message}
                maxLength={280}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className={cn(inputDark, 'py-4 px-5 text-base resize-none mt-3')}
              />
            )}
          </section>

          {submitError && (
            <div className="p-4 border border-red-500/50 bg-red-950/40 text-red-300 font-bold text-sm">
              {submitError}
            </div>
          )}

          {/* ------ STICKY CTA ------ */}
          <div
            className={cn(
              'fixed bottom-0 left-0 right-0 z-40 sm:static',
              'bg-[#0a0908]/98 backdrop-blur-md border-t border-white/15 sm:bg-transparent sm:border-none sm:backdrop-blur-0',
              'pb-[env(safe-area-inset-bottom,0px)] sm:pb-0'
            )}
          >
            <div className="max-w-xl mx-auto p-4 sm:p-0">
              <button
                type="submit"
                disabled={isProcessing || !!amountError || !!pedidoError}
                data-hover
                className="w-full py-5 font-bold text-base sm:text-lg transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--accent)] text-white hover:opacity-90 border border-[var(--accent)] uppercase tracking-[0.08em] min-h-[60px]"
              >
                {isProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-2 rounded-full border-white/30 border-t-white"
                  />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    pagar ${amount.toLocaleString('es-AR')}
                  </>
                )}
              </button>

              <p className={cn('text-center mt-3 flex items-center justify-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase text-white/70')}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                pago seguro · mercado pago
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
