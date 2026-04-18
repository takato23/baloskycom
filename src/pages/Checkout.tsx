import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Coffee, CreditCard, ArrowLeft, Wand2, Upload, TicketPercent } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { getPageStyles } from '@/themes/pageStyles';
import { formatCurrency } from '@/utils/currency';
import InnerPageNav from '@/components/InnerPageNav';

export default function Checkout() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const { campaigns, settings, currency } = useAppContext();
  const checkoutCopy = settings?.content.checkout.copy;
  const styles = getPageStyles();

  const [amount, setAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>(campaignId || 'c3');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; name?: string; message?: string }>({});
  const [submitError, setSubmitError] = useState<string>('');

  const [discountCode, setDiscountCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountMessage, setDiscountMessage] = useState('');

  const [isEncargo, setIsEncargo] = useState(false);
  const [encargoImage, setEncargoImage] = useState<string | null>(null);
  const [encargoText, setEncargoText] = useState('');

  // Montos sugeridos reflejan los productos reales del muro de Balosky:
  // · $2k    → cafecito (lista de honor en el muro)
  // · $25k   → encargo: canción con IA
  // · $80k   → pack 5x imágenes IA
  // · $150k  → videollamada 1:1 con IA (45 min)
  const suggestedAmounts = useMemo(
    () =>
      settings?.supportAmountsSuggested?.length
        ? settings.supportAmountsSuggested
        : [2000, 25000, 80000, 150000],
    [settings?.supportAmountsSuggested]
  );

  // Derive defaults from the URL. Keep the dep list tight: campaignId +
  // searchParamsKey (stringified query). Do NOT include `suggestedAmounts`
  // or any value derived from `settings` here — settings streams in async
  // and we'd re-run the effect (and reset the user's input) on every change.
  React.useEffect(() => {
    const requestedCampaign = searchParams.get('campaign')?.trim() || campaignId || 'c3';
    const requestedMode = searchParams.get('mode')?.trim();
    const requestedAmountRaw = searchParams.get('amount');
    const requestedAmount = requestedAmountRaw ? Number.parseInt(requestedAmountRaw, 10) : Number.NaN;
    const hasRequestedAmount = Number.isFinite(requestedAmount) && requestedAmount > 0;
    const nextIsEncargo = requestedMode === 'encargo';

    let nextAmount = hasRequestedAmount ? requestedAmount : 1000;
    if (nextIsEncargo) {
      nextAmount = Math.max(nextAmount, 5000);
    }

    setSelectedCampaign(requestedCampaign);
    setIsEncargo(nextIsEncargo);
    setAmount(nextAmount);
    setCustomAmount(hasRequestedAmount ? String(nextAmount) : '');
    setErrors((prev) => {
      const next = nextAmount < 100 ? 'El monto mínimo es $100' : undefined;
      if (prev.amount === next) return prev;
      return { ...prev, amount: next };
    });

    if (!nextIsEncargo) {
      setEncargoImage(null);
      setEncargoText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, searchParamsKey]);

  const selectedCampaignData = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaign),
    [campaigns, selectedCampaign]
  );

  const finalAmount = amount - amount * (discountPercent / 100);

  const handleAmountSelect = (value: number) => {
    setAmount(value);
    setCustomAmount('');
    setErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCustomAmount(value);

    if (value) {
      const numericValue = parseInt(value, 10);
      setAmount(numericValue);
      if (numericValue < 100) {
        setErrors((prev) => ({ ...prev, amount: 'El monto mínimo es $100' }));
      } else {
        setErrors((prev) => ({ ...prev, amount: undefined }));
      }
    } else {
      setAmount(0);
      setErrors((prev) => ({ ...prev, amount: 'Ingresá un monto válido' }));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (value.length > 50) {
      setErrors((prev) => ({ ...prev, name: 'El nombre no puede superar los 50 caracteres' }));
    } else {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    if (value.length > 280) {
      setErrors((prev) => ({ ...prev, message: 'El mensaje no puede superar los 280 caracteres' }));
    } else {
      setErrors((prev) => ({ ...prev, message: undefined }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setEncargoImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const applyDiscount = () => {
    if (discountCode.toUpperCase() === 'VERANO20') {
      setDiscountPercent(20);
      setDiscountMessage('¡Código aplicado! 20% de descuento.');
    } else {
      setDiscountPercent(0);
      setDiscountMessage('Código inválido.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || errors.amount || errors.name || errors.message) return;

    if (isEncargo && amount < 5000) {
      setErrors((prev) => ({ ...prev, amount: 'Los encargos mágicos requieren un aporte mínimo de $5.000' }));
      return;
    }

    setSubmitError('');
    setIsProcessing(true);

    try {
      const campaign = campaigns.find((item) => item.id === selectedCampaign);
      let title = campaign ? `Aporte a: ${campaign.title}` : 'Aporte a Creador';

      if (isEncargo) {
        title = `Encargo Mágico: ${title}`;
      }

      const finalMessage = isEncargo
        ? `[ENCARGO MÁGICO]\nPedido: ${encargoText}\n\nMensaje: ${message}`
        : message;

      const response = await api.createPreference(
        finalAmount,
        title,
        selectedCampaign,
        name,
        finalMessage
      );

      if (response.init_point) {
        window.location.href = response.init_point;
      } else if (response.sandbox_init_point) {
        window.location.href = response.sandbox_init_point;
      } else {
        throw new Error('No init_point received');
      }
    } catch (error) {
      console.error('Error creating preference:', error);
      setSubmitError('No pudimos iniciar el pago con Mercado Pago. Revisá la configuración e intentá de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* -------- Delirio style tokens (checkout-only) ------- */
  // Padding más chico en mobile (p-4) — antes p-6 dejaba poco lugar
  // útil al texto en pantallas <380px.
  const panelDark = 'bg-[#0f0d0c] border border-white/8 p-4 sm:p-6 md:p-8';
  const labelMono = 'font-mono text-[10px] tracking-[0.22em] uppercase text-white/55';
  const inputDark = 'w-full bg-black/40 border border-white/10 text-white placeholder-white/35 focus:border-[var(--accent)] focus:outline-none transition-colors';
  const btnPill = 'inline-flex items-center justify-center gap-2 px-5 py-3 text-[11px] font-mono tracking-[0.22em] uppercase border rounded-full transition-colors';

  return (
    <div
      className={cn('theme-page text-white', styles.shell)}
      style={{ background: '#0a0908', minHeight: '100vh' }}
    >
      {/* Layout marks /checkout como full-bleed, así que el fondo oscuro
       * llega a los bordes en mobile. El wrapper interno se encarga del
       * max-width legible, padding lateral y padding-top para compensar
       * el `DelirioHeader` fijo (pill ~50px desde top + 14px top + safe-area).
       * Bumpeado a 96px en mobile porque el H1 tight (line-height 1.05) +
       * eyebrow + breadcrumb ocupan buen espacio y el pill quedaba pisando. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-[calc(96px+env(safe-area-inset-top,0px))] sm:pt-24 pb-40 sm:pb-24">
        <InnerPageNav label="encargos" />
        <div className="grid gap-8 md:gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start mt-4 sm:mt-8">
        <div className="space-y-6 sm:space-y-8 md:space-y-10">
          {/* InnerPageNav ya muestra "index / encargos" como breadcrumb
              fijo arriba a la izquierda en mobile, pero NO es un botón.
              Mantenemos el back-button real acá para que el usuario tenga
              cómo volver. La eyebrow "01 · apoyo directo" sí la ocultamos
              en mobile porque InnerPageNav cubre la misma idea y libera
              espacio vertical para el H1 grande. */}
          <button
            onClick={() => navigate(-1)}
            className={cn(labelMono, 'flex items-center gap-2 hover:text-[var(--accent)] transition-colors')}
            data-hover
          >
            <ArrowLeft className="w-4 h-4" />
            <span>volver</span>
          </button>

          <header className="pt-2 space-y-3">
            <p className={cn(labelMono, 'hidden sm:block')}>
              <Coffee className="inline w-3 h-3 mr-1 text-[var(--accent)] align-baseline" />
              01 · apoyo directo
            </p>
            <h1
              className="text-white"
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontWeight: 900,
                fontSize: 'clamp(2.25rem, 9vw, 6rem)',
                letterSpacing: '-0.05em',
                lineHeight: 1.02,
              }}
            >
              {checkoutCopy?.title || 'invitame un cafecito'}
            </h1>
            <p className="text-white/55 text-sm max-w-lg leading-relaxed">
              {checkoutCopy?.subtitle || 'Tu aporte no es caridad: es combustible. Cada $1 va a que salga música nueva, clips, clases y encargos.'}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ------ 01 DESTINO ------ */}
            <section className={panelDark}>
              <header className="flex items-baseline justify-between mb-5">
                <h2
                  className="text-white"
                  style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.04em' }}
                >
                  destino
                </h2>
                <span className={labelMono}>01 / 04</span>
              </header>

              <div className="grid gap-3">
                {campaigns.filter((campaign) => campaign.active).map((campaign) => {
                  const selected = selectedCampaign === campaign.id;
                  return (
                    <label
                      key={campaign.id}
                      data-hover
                      className={cn(
                        'group grid gap-3 p-4 cursor-pointer transition-all md:grid-cols-[auto_1fr_auto] md:items-center border',
                        selected
                          ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                          : 'bg-black/30 border-white/10 text-white/85 hover:border-[var(--accent)]/60'
                      )}
                    >
                      <input
                        type="radio"
                        name="campaign"
                        value={campaign.id}
                        checked={selected}
                        onChange={(e) => setSelectedCampaign(e.target.value)}
                        className="hidden"
                      />
                      <div className={cn('w-5 h-5 flex items-center justify-center shrink-0 border', selected ? 'border-white' : 'border-white/40')}>
                        {selected && <div className="w-2.5 h-2.5 bg-white" />}
                      </div>
                      <div>
                        <p className="font-bold uppercase tracking-wide text-sm">{campaign.title}</p>
                        <p className={cn('text-xs mt-1', selected ? 'text-white/85' : 'text-white/50')}>
                          {campaign.description}
                        </p>
                      </div>
                      <div className={cn('font-mono text-[11px] tracking-[0.15em] uppercase', selected ? 'text-white/90' : 'text-white/50')}>
                        {campaign.goal > 0 ? formatCurrency(campaign.raised, currency) : 'meta abierta'}
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* ------ 02 MONTO ------ */}
            <section className={panelDark}>
              <header className="flex items-baseline justify-between mb-5">
                <h2
                  className="text-white"
                  style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.04em' }}
                >
                  monto
                </h2>
                <span className={labelMono}>02 / 04</span>
              </header>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {suggestedAmounts.map((value) => {
                  const active = amount === value && !customAmount;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleAmountSelect(value)}
                      data-hover
                      className={cn(
                        'py-4 px-3 font-bold text-lg transition-all active:scale-95 border',
                        active
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'bg-black/30 border-white/10 text-white/85 hover:border-[var(--accent)]/60'
                      )}
                    >
                      ${value.toLocaleString('es-AR')}
                    </button>
                  );
                })}
              </div>

              <div className="relative mt-4">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-lg text-white/40">$</span>
                <input
                  type="text"
                  placeholder="otro monto..."
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className={cn(inputDark, 'py-5 pl-10 pr-5 font-bold text-lg tracking-tight')}
                />
              </div>
              {errors.amount && <p className="text-sm mt-2 text-red-400 font-bold">{errors.amount}</p>}

              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end mt-5">
                <div className="space-y-2">
                  <label className={labelMono}>código de descuento</label>
                  <input
                    type="text"
                    placeholder="ej: verano20"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className={cn(inputDark, 'p-4 font-mono text-base uppercase tracking-[0.15em]')}
                  />
                </div>
                <button
                  type="button"
                  onClick={applyDiscount}
                  data-hover
                  className={cn(btnPill, 'border-white/20 text-white/90 hover:bg-white hover:text-black hover:border-white')}
                >
                  <TicketPercent className="w-4 h-4" />
                  aplicar
                </button>
              </div>
              {discountMessage && (
                <p className={cn('text-[11px] font-mono tracking-[0.18em] uppercase mt-3', discountPercent > 0 ? 'text-[var(--accent)]' : 'text-red-400')}>
                  {discountMessage}
                </p>
              )}
            </section>

            {/* ------ 03 ENCARGO MÁGICO ------ */}
            <section className={panelDark}>
              <header className="flex items-baseline justify-between mb-5">
                <h2
                  className="text-white"
                  style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.04em' }}
                >
                  encargo
                </h2>
                <span className={labelMono}>03 / 04 · opcional</span>
              </header>

              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEncargo}
                  onChange={(e) => {
                    setIsEncargo(e.target.checked);
                    if (e.target.checked && amount < 5000) {
                      setAmount(5000);
                      setCustomAmount('');
                      setErrors((prev) => ({ ...prev, amount: undefined }));
                    }
                  }}
                  className="mt-1 w-5 h-5 accent-[var(--accent)]"
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-[var(--accent)]" />
                    <span className="font-bold uppercase text-base text-white">
                      {checkoutCopy?.encargoTitle || 'convertir en encargo mágico'}
                    </span>
                  </div>
                  <p className="text-sm text-white/55 leading-relaxed max-w-md">
                    Activá esto si además del aporte querés dejar un pedido concreto (un encargo con IA, una dedicatoria, etc).
                  </p>
                </div>
              </label>

              {isEncargo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-5 mt-5 border-t border-white/10"
                >
                  <p className="text-sm text-white/70">{checkoutCopy?.encargoDescription}</p>

                  <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
                    <label
                      data-hover
                      className={cn(btnPill, 'border-white/20 text-white/90 hover:bg-white hover:text-black hover:border-white cursor-pointer')}
                    >
                      <Upload className="w-4 h-4" />
                      subir imagen
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {encargoImage && (
                      <div className="w-24 h-24 overflow-hidden border border-white/10">
                        <img src={encargoImage} alt="Preview" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <textarea
                    placeholder="ej: haceme una foto tomando mates con Messi en la luna..."
                    value={encargoText}
                    onChange={(e) => setEncargoText(e.target.value)}
                    rows={4}
                    className={cn(inputDark, 'p-4 text-base resize-none')}
                    required={isEncargo}
                  />
                </motion.div>
              )}
            </section>

            {/* ------ 04 MENSAJE ------ */}
            <section className={panelDark}>
              <header className="flex items-baseline justify-between mb-5">
                <h2
                  className="text-white"
                  style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.04em' }}
                >
                  mensaje
                </h2>
                <span className={labelMono}>04 / 04 · opcional</span>
              </header>

              <input
                type="text"
                placeholder="tu nombre (opcional)"
                value={name}
                onChange={handleNameChange}
                className={cn(inputDark, 'py-4 px-5 text-base')}
              />
              {errors.name && <p className="text-sm mt-2 text-red-400 font-bold">{errors.name}</p>}

              <textarea
                placeholder="dejale un mensaje a santi... (opcional)"
                value={message}
                onChange={handleMessageChange}
                rows={4}
                className={cn(inputDark, 'py-4 px-5 text-base resize-none mt-3')}
              />
              {errors.message && <p className="text-sm mt-2 text-red-400 font-bold">{errors.message}</p>}
            </section>

            {submitError && (
              <div className="p-4 border border-red-500/50 bg-red-950/40 text-red-300 font-bold text-sm">
                {submitError}
              </div>
            )}

            {/* Sticky submit CTA */}
            <div
              className={cn(
                'fixed bottom-0 left-0 right-0 p-4 z-40 sm:static sm:p-0',
                'bg-[#0a0908]/95 backdrop-blur border-t border-white/10 sm:bg-transparent sm:border-none sm:backdrop-blur-0'
              )}
            >
              <div className="max-w-xl mx-auto">
                <button
                  type="submit"
                  disabled={isProcessing || amount < 100 || !!errors.name || !!errors.message || !!errors.amount}
                  data-hover
                  className="w-full py-5 font-bold text-lg transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--accent)] text-white hover:opacity-90 border border-[var(--accent)] uppercase tracking-[0.08em]"
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
                      aportar ${finalAmount.toLocaleString('es-AR')} →
                    </>
                  )}
                </button>

                <p className={cn(labelMono, 'text-center mt-3 flex items-center justify-center gap-1')}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                  pago seguro · mercado pago
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* ============= SIDEBAR ============= */}
        <aside className="space-y-4 lg:sticky lg:top-24 mt-8 lg:mt-0">
          <div className="p-6 md:p-7 bg-[var(--accent)] text-white border border-[var(--accent)]">
            <p className={cn(labelMono, 'text-white/75')}>resumen en vivo</p>
            <h2
              className="mt-3 text-white"
              style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 900, fontSize: '2rem', letterSpacing: '-0.04em', lineHeight: 1 }}
            >
              {selectedCampaignData?.title || 'aporte libre'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              {selectedCampaignData?.description || 'Tu aporte suma al proyecto y ayuda a que siga saliendo contenido.'}
            </p>
            <div className="mt-6 space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-white/70 tracking-[0.15em] uppercase text-[11px]">subtotal</span>
                <span className="font-bold tracking-tight">${amount.toLocaleString('es-AR')}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/70 tracking-[0.15em] uppercase text-[11px]">descuento</span>
                  <span className="font-bold tracking-tight">-${(amount * (discountPercent / 100)).toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-3 border-t border-white/25">
                <span className="text-white/90 tracking-[0.15em] uppercase text-[11px]">total</span>
                <span
                  className="text-white"
                  style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 900, fontSize: '1.8rem', letterSpacing: '-0.04em' }}
                >
                  ${finalAmount.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#0f0d0c] border border-white/10 text-white/85">
            <p className={labelMono}>cómo funciona</p>
            <ol className="mt-4 space-y-4 text-sm leading-relaxed">
              <li className="flex gap-3">
                <span className="font-mono text-[var(--accent)] text-[11px] tracking-[0.2em] shrink-0 pt-[2px]">01</span>
                <span>elegís misión y monto — podés apoyar algo puntual o sumar sin vueltas.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[var(--accent)] text-[11px] tracking-[0.2em] shrink-0 pt-[2px]">02</span>
                <span>dejás mensaje o pedido — si querés, lo convertís en un encargo mágico.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[var(--accent)] text-[11px] tracking-[0.2em] shrink-0 pt-[2px]">03</span>
                <span>vas a mercado pago — el pago se procesa afuera y después volvés acá.</span>
              </li>
            </ol>
          </div>
        </aside>
        </div>
      </div>
    </div>
  );
}
