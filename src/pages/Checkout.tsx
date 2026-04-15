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

  const suggestedAmounts = settings?.supportAmountsSuggested?.length
    ? settings.supportAmountsSuggested
    : [1000, 3000, 5000, 10000];

  React.useEffect(() => {
    const requestedCampaign = searchParams.get('campaign')?.trim() || campaignId || 'c3';
    const requestedMode = searchParams.get('mode')?.trim();
    const requestedAmountRaw = searchParams.get('amount');
    const requestedAmount = requestedAmountRaw ? Number.parseInt(requestedAmountRaw, 10) : Number.NaN;
    const hasRequestedAmount = Number.isFinite(requestedAmount) && requestedAmount > 0;
    const nextIsEncargo = requestedMode === 'encargo';

    let nextAmount = hasRequestedAmount ? requestedAmount : suggestedAmounts[0] ?? 1000;
    if (nextIsEncargo) {
      nextAmount = Math.max(nextAmount, 5000);
    }

    setSelectedCampaign(requestedCampaign);
    setIsEncargo(nextIsEncargo);
    setAmount(nextAmount);
    setCustomAmount(suggestedAmounts.includes(nextAmount) ? '' : String(nextAmount));
    setErrors((prev) => ({
      ...prev,
      amount: nextAmount < 100 ? 'El monto mínimo es $100' : undefined,
    }));

    if (!nextIsEncargo) {
      setEncargoImage(null);
      setEncargoText('');
    }
  }, [campaignId, searchParamsKey, suggestedAmounts]);

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

  return (
    <div className={cn('theme-page theme-adapt max-w-7xl mx-auto px-4 sm:px-6 pb-32 sm:pb-16', styles.shell)}>
      <InnerPageNav label="encargos" />
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="space-y-6 md:space-y-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 transition-colors mt-4 sm:mt-0 text-[10px] font-mono tracking-[0.22em] uppercase text-[var(--muted)] hover:text-[var(--accent)]"
            data-hover
          >
            <ArrowLeft className="w-4 h-4" />
            <span>volver</span>
          </button>

          <div className="pt-2">
            <p className="t-eyebrow mb-3">
              <Coffee className="inline w-3 h-3 mr-1 text-[var(--accent)] align-baseline" />
              Apoyo directo
            </p>
            <h1 className="t-hero text-[clamp(2.5rem,9vw,6rem)] text-[var(--black)]">
              {checkoutCopy?.title || 'Invitame un cafecito'}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className={cn('p-6 md:p-8 space-y-5', styles.panel)}>
              <h2 className="t-section text-[clamp(1.5rem,3vw,2rem)] text-[var(--black)]">
                <span className="text-[var(--accent)] font-mono text-[11px] tracking-[0.22em] mr-3">01</span>
                Destino
              </h2>

              <div className="grid gap-3">
                {campaigns.filter((campaign) => campaign.active).map((campaign) => (
                  <label
                    key={campaign.id}
                    data-hover
                    className={cn(
                      'group grid gap-3 p-4 cursor-pointer transition-all md:grid-cols-[auto_1fr_auto] md:items-center border border-[var(--border)]',
                      selectedCampaign === campaign.id
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--grey)] hover:border-[var(--accent)]'
                    )}
                  >
                    <input
                      type="radio"
                      name="campaign"
                      value={campaign.id}
                      checked={selectedCampaign === campaign.id}
                      onChange={(e) => setSelectedCampaign(e.target.value)}
                      className="hidden"
                    />
                    <div
                      className={cn(
                        'w-5 h-5 flex items-center justify-center shrink-0 border-2',
                        selectedCampaign === campaign.id ? 'border-white bg-white/90' : 'border-[var(--muted)] bg-transparent'
                      )}
                    >
                      {selectedCampaign === campaign.id && <div className="w-2.5 h-2.5 bg-[var(--accent)]" />}
                    </div>
                    <div>
                      <p className="font-bold uppercase">
                        {campaign.title}
                      </p>
                      <p className={cn('text-sm mt-1', selectedCampaign === campaign.id ? 'text-white/80' : 'text-[var(--muted)]')}>
                        {campaign.description}
                      </p>
                    </div>
                    <div className={cn('text-sm font-bold uppercase', selectedCampaign === campaign.id ? 'text-white/90' : 'text-[var(--muted)]')}>
                      {campaign.goal > 0 ? formatCurrency(campaign.raised, currency) : 'Meta abierta'}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={cn('p-6 md:p-8 space-y-5', styles.panel)}>
              <h2 className="t-section text-[clamp(1.5rem,3vw,2rem)] text-[var(--black)]">
                <span className="text-[var(--accent)] font-mono text-[11px] tracking-[0.22em] mr-3">02</span>
                Monto
              </h2>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {suggestedAmounts.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleAmountSelect(value)}
                    data-hover
                    className={cn(
                      'py-4 px-3 font-bold text-lg transition-all active:scale-95 border border-[var(--border)]',
                      amount === value && !customAmount
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--grey)] text-[var(--black)] hover:border-[var(--accent)]'
                    )}
                  >
                    ${value.toLocaleString('es-AR')}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-lg text-[var(--muted)]">
                  $
                </span>
                <input
                  type="text"
                  placeholder="Otro monto..."
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className={cn(styles.input, 'w-full py-5 pl-10 pr-5 font-bold text-lg')}
                />
              </div>
              {errors.amount && <p className="text-sm font-medium mt-1 text-red-600 font-bold">{errors.amount}</p>}

              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-2">
                  <label className="t-eyebrow">
                    Código de descuento
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: VERANO20"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className={cn(styles.input, 'w-full p-4 font-bold text-lg uppercase')}
                  />
                </div>
                <button
                  type="button"
                  onClick={applyDiscount}
                  data-hover
                  className="px-6 py-4 font-bold uppercase transition-all active:scale-95 bg-[var(--grey)] text-[var(--black)] border border-[var(--border)] hover:bg-[var(--black)] hover:text-[var(--white)]"
                >
                  <span className="inline-flex items-center gap-2">
                    <TicketPercent className="w-4 h-4" />
                    Aplicar
                  </span>
                </button>
              </div>
              {discountMessage && (
                <p className={cn('text-sm font-bold uppercase', discountPercent > 0 ? 'text-[var(--accent)]' : 'text-red-500')}>
                  {discountMessage}
                </p>
              )}
            </div>

            <div className={cn('p-6 md:p-8 space-y-5 transition-all border border-[var(--border)]', isEncargo ? 'bg-[var(--grey)]' : 'bg-[var(--grey)]')}>
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
                    <span className="font-bold uppercase text-lg text-[var(--black)]">
                      {checkoutCopy?.encargoTitle}
                    </span>
                  </div>
                  <p className="text-sm t-body">
                    Activá esto si además del aporte querés dejar un pedido concreto.
                  </p>
                </div>
              </label>

              {isEncargo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-4 border-t border-[var(--border)]"
                >
                  <p className="font-medium t-body">{checkoutCopy?.encargoDescription}</p>

                  <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
                    <label
                      data-hover
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-3 border border-[var(--border)] font-bold uppercase transition-colors bg-[var(--grey)] text-[var(--black)] hover:bg-[var(--black)] hover:text-[var(--white)]"
                    >
                      <Upload className="w-5 h-5" />
                      Subir imagen
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {encargoImage && (
                      <div className="w-24 h-24 overflow-hidden border border-[var(--border)]">
                        <img src={encargoImage} alt="Preview" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <textarea
                    placeholder="Ej: haceme una foto tomando mates con Messi en la luna..."
                    value={encargoText}
                    onChange={(e) => setEncargoText(e.target.value)}
                    rows={4}
                    className={cn(styles.input, 'w-full p-4 text-lg resize-none')}
                    required={isEncargo}
                  />
                </motion.div>
              )}
            </div>

            <div className={cn('p-6 md:p-8 space-y-5', styles.panel)}>
              <div>
                <p className="t-eyebrow">si querés dejar algo más</p>
                <h2 className="text-2xl t-section text-[var(--black)] mt-2">Mensaje</h2>
              </div>

              <input
                type="text"
                placeholder="Tu nombre (opcional)"
                value={name}
                onChange={handleNameChange}
                className={cn(styles.input, 'w-full py-4 px-5 text-lg')}
              />
              {errors.name && <p className="text-sm font-medium mt-1 text-red-600 font-bold">{errors.name}</p>}

              <textarea
                placeholder="Dejale un mensaje a Santi... (opcional)"
                value={message}
                onChange={handleMessageChange}
                rows={4}
                className={cn(styles.input, 'w-full py-4 px-5 text-lg resize-none')}
              />
              {errors.message && <p className="text-sm font-medium mt-1 text-red-600 font-bold">{errors.message}</p>}
            </div>

            {submitError && (
              <div className="p-4 border border-red-500 bg-red-50 text-red-700 font-bold">
                {submitError}
              </div>
            )}

            <div
              className={cn(
                'fixed bottom-0 left-0 right-0 p-4 z-40 sm:static sm:p-0',
                'bg-[var(--white)] border-t border-[var(--border)] sm:bg-transparent sm:border-none'
              )}
            >
              <div className="max-w-xl mx-auto">
                <button
                  type="submit"
                  disabled={isProcessing || amount < 100 || !!errors.name || !!errors.message || !!errors.amount}
                  data-hover
                  className="w-full py-5 font-bold text-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent)] text-white hover:opacity-90"
                >
                  {isProcessing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 rounded-full border-white/30 border-t-white"
                    />
                  ) : (
                    <>
                      <CreditCard className="w-6 h-6" />
                      Aportar ${finalAmount.toLocaleString('es-AR')}
                    </>
                  )}
                </button>

                <p className="text-center text-xs mt-3 flex items-center justify-center gap-1 t-eyebrow">
                  <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)]" />
                  Pago seguro con Mercado Pago
                </p>
              </div>
            </div>
          </form>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="p-6 md:p-7 bg-[var(--black)] text-[var(--white)] border border-[var(--border)]">
            <p className="t-eyebrow text-[var(--white)]/55">
              resumen en vivo
            </p>
            <h2 className="mt-3 text-3xl font-bold">{selectedCampaignData?.title || 'Aporte libre'}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--white)]/72">
              {selectedCampaignData?.description || 'Tu aporte suma al proyecto y ayuda a que siga saliendo contenido.'}
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--white)]/55">Subtotal</span>
                <span className="font-bold">{amount.toLocaleString('es-AR')}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm text-[var(--accent)]">
                  <span>Descuento</span>
                  <span className="font-bold">-{(amount * (discountPercent / 100)).toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="flex justify-between text-lg pt-3 border-t border-[var(--white)]/12">
                <span>Total</span>
                <span className="font-bold">{finalAmount.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[var(--grey)] border border-[var(--border)]">
            <p className="t-eyebrow">cómo funciona</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="font-bold text-[var(--black)]">1. Elegís misión y monto</p>
                <p className="text-sm mt-1 t-body">Podés apoyar algo puntual o sumar sin vueltas.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--black)]">2. Dejás mensaje o pedido</p>
                <p className="text-sm mt-1 t-body">Si querés, podés convertirlo en un encargo.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--black)]">3. Vas a Mercado Pago</p>
                <p className="text-sm mt-1 t-body">El pago se procesa afuera y después volvés acá.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
