import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Coffee, CreditCard, ArrowLeft, Wand2, Upload, TicketPercent } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { getThemedPageStyles } from '@/themes/pageStyles';
import { formatCurrency } from '@/utils/currency';

export default function Checkout() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { campaigns, settings, theme, currency } = useAppContext();
  const checkoutCopy = settings?.content.checkout.copy;
  const styles = getThemedPageStyles(theme);

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
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="space-y-8">
          <button
            onClick={() => navigate(-1)}
            className={cn(
              'flex items-center gap-2 transition-colors mt-4 sm:mt-0',
              styles.pageSubtitle,
              theme === 'minimal' ? 'normal-case tracking-normal font-medium' : 'font-bold uppercase'
            )}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>

          <div className={cn('p-6 md:p-8', styles.panel)}>
            <div className="space-y-4">
              <div
                className={cn(
                  'inline-flex items-center gap-3 px-4 py-2 border',
                  styles.softPanel,
                  theme === 'minimal' ? 'rounded-full border-black/10 shadow-none' : '',
                  theme === 'terminal' ? 'rounded-none' : ''
                )}
              >
                <Coffee className="w-4 h-4" />
                <span className={cn(theme === 'minimal' ? 'normal-case tracking-[0.04em] font-medium' : 'text-xs font-bold uppercase tracking-[0.2em]')}>
                  apoyo directo
                </span>
              </div>
              <h1
                className={cn(
                  'text-4xl md:text-6xl font-bold',
                  styles.pageTitle,
                  theme === 'minimal' && 'leading-[0.92]',
                  theme === 'terminal' && 'text-3xl md:text-5xl'
                )}
              >
                {checkoutCopy?.title}
              </h1>
              <p className={cn('max-w-2xl text-lg', styles.pageSubtitle)}>
                {checkoutCopy?.subtitle}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className={cn('p-6 md:p-8 space-y-5', styles.panel)}>
              <div>
                <p
                  className={cn(
                    'text-xs uppercase tracking-[0.2em]',
                    styles.pageSubtitle,
                    theme === 'minimal' ? 'normal-case tracking-[0.04em] font-medium' : 'font-bold'
                  )}
                >
                  dónde cae tu aporte
                </p>
                <h2 className={cn('text-2xl font-bold mt-2', styles.sectionTitle)}>Destino</h2>
              </div>

              <div className="grid gap-3">
                {campaigns.filter((campaign) => campaign.active).map((campaign) => (
                  <label
                    key={campaign.id}
                    className={cn(
                      'group grid gap-3 p-4 cursor-pointer transition-all md:grid-cols-[auto_1fr_auto] md:items-center',
                      selectedCampaign === campaign.id ? styles.accentPanel : styles.softPanel,
                      theme === 'minimal' && 'border border-black/10 shadow-none',
                      theme === 'terminal' && 'rounded-none'
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
                        selectedCampaign === campaign.id ? 'border-current bg-white/90' : 'border-current/40 bg-transparent'
                      )}
                    >
                      {selectedCampaign === campaign.id && <div className="w-2.5 h-2.5 bg-current" />}
                    </div>
                    <div>
                      <p className={cn('font-bold uppercase', theme === 'minimal' ? 'normal-case text-base' : '')}>
                        {campaign.title}
                      </p>
                      <p className={cn('text-sm mt-1', selectedCampaign === campaign.id ? 'opacity-80' : styles.pageSubtitle)}>
                        {campaign.description}
                      </p>
                    </div>
                    <div className={cn('text-sm font-bold uppercase', selectedCampaign === campaign.id ? 'opacity-90' : styles.pageSubtitle)}>
                      {campaign.goal > 0 ? formatCurrency(campaign.raised, currency) : 'Meta abierta'}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={cn('p-6 md:p-8 space-y-5', styles.panel)}>
              <div>
                <p
                  className={cn(
                    'text-xs uppercase tracking-[0.2em]',
                    styles.pageSubtitle,
                    theme === 'minimal' ? 'normal-case tracking-[0.04em] font-medium' : 'font-bold'
                  )}
                >
                  elegí el tamaño del empujón
                </p>
                <h2 className={cn('text-2xl font-bold mt-2', styles.sectionTitle)}>Monto</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {suggestedAmounts.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleAmountSelect(value)}
                    className={cn(
                      'py-4 px-3 font-bold text-lg transition-all active:scale-95 border',
                      amount === value && !customAmount ? styles.accentPanel : styles.softPanel,
                      theme === 'minimal' && 'shadow-none border-black/10',
                      theme === 'terminal' && 'rounded-none'
                    )}
                  >
                    ${value.toLocaleString('es-AR')}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className={cn('absolute left-5 top-1/2 -translate-y-1/2 font-bold text-lg', theme === 'terminal' ? 'text-[#00ff00]' : '')}>
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
                  <label className={cn('text-sm font-bold uppercase tracking-wider', theme === 'minimal' ? 'normal-case tracking-[0.04em]' : '')}>
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
                  className={cn('px-6 py-4 font-bold uppercase transition-transform active:scale-95', styles.secondaryButton)}
                >
                  <span className="inline-flex items-center gap-2">
                    <TicketPercent className="w-4 h-4" />
                    Aplicar
                  </span>
                </button>
              </div>
              {discountMessage && (
                <p className={cn('text-sm font-bold uppercase', discountPercent > 0 ? 'text-[#00FF00]' : 'text-red-500')}>
                  {discountMessage}
                </p>
              )}
            </div>

            <div className={cn('p-6 md:p-8 space-y-5 transition-all', isEncargo ? styles.softPanel : styles.panel)}>
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
                  className="mt-1 w-5 h-5"
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5" />
                    <span className={cn('font-bold uppercase text-lg', theme === 'minimal' ? 'normal-case' : '')}>
                      {checkoutCopy?.encargoTitle}
                    </span>
                  </div>
                  <p className={cn('text-sm', styles.pageSubtitle)}>
                    Activá esto si además del aporte querés dejar un pedido concreto.
                  </p>
                </div>
              </label>

              {isEncargo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-4 border-t border-current/20"
                >
                  <p className={cn('font-medium', styles.pageSubtitle)}>{checkoutCopy?.encargoDescription}</p>

                  <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
                    <label className={cn('cursor-pointer inline-flex items-center gap-2 px-4 py-3 border font-bold uppercase transition-colors', styles.secondaryButton)}>
                      <Upload className="w-5 h-5" />
                      Subir imagen
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {encargoImage && (
                      <div className={cn('w-24 h-24 overflow-hidden border', styles.panel)}>
                        <img src={encargoImage} alt="Preview" className="w-full h-full object-cover" />
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
                <p
                  className={cn(
                    'text-xs uppercase tracking-[0.2em]',
                    styles.pageSubtitle,
                    theme === 'minimal' ? 'normal-case tracking-[0.04em] font-medium' : 'font-bold'
                  )}
                >
                  si querés dejar algo más
                </p>
                <h2 className={cn('text-2xl font-bold mt-2', styles.sectionTitle)}>Mensaje</h2>
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
              <div className="p-4 border-4 border-red-500 bg-red-50 text-red-700 font-bold">
                {submitError}
              </div>
            )}

            <div
              className={cn(
                'fixed bottom-0 left-0 right-0 p-4 z-40 sm:static sm:p-0',
                theme === 'minimal'
                  ? 'bg-[#f7f4ee]/96 border-t border-black/10 backdrop-blur-xl'
                  : 'bg-white border-t-4 border-black sm:bg-transparent sm:border-none'
              )}
            >
              <div className="max-w-xl mx-auto">
                <button
                  type="submit"
                  disabled={isProcessing || amount < 100 || !!errors.name || !!errors.message || !!errors.amount}
                  className={cn(
                    'w-full py-5 font-bold text-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
                    styles.primaryButton
                  )}
                >
                  {isProcessing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className={cn(
                        'w-6 h-6 border-2 rounded-full',
                        theme === 'terminal' ? 'border-[#00ff00]/30 border-t-[#00ff00]' : 'border-black/30 border-t-black'
                      )}
                    />
                  ) : (
                    <>
                      <CreditCard className="w-6 h-6" />
                      Aportar ${finalAmount.toLocaleString('es-AR')}
                    </>
                  )}
                </button>

                <p
                  className={cn(
                    'text-center text-xs mt-3 flex items-center justify-center gap-1',
                    styles.pageSubtitle,
                    theme !== 'minimal' && 'font-bold uppercase'
                  )}
                >
                  <span className={cn('inline-block w-2 h-2 rounded-full', theme === 'terminal' ? 'bg-[#00ff00] border border-[#00ff00]' : 'bg-[#00FF00] border border-black')} />
                  Pago seguro con Mercado Pago
                </p>
              </div>
            </div>
          </form>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className={cn('p-6 md:p-7', styles.contrastPanel)}>
            <p
              className={cn(
                'text-xs uppercase tracking-[0.2em]',
                theme === 'minimal' ? 'normal-case tracking-[0.04em] text-white/65 font-medium' : 'text-white/55 font-bold'
              )}
            >
              resumen en vivo
            </p>
            <h2 className="mt-3 text-3xl font-bold">{selectedCampaignData?.title || 'Aporte libre'}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              {selectedCampaignData?.description || 'Tu aporte suma al proyecto y ayuda a que siga saliendo contenido.'}
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/55">Subtotal</span>
                <span className="font-bold">{amount.toLocaleString('es-AR')}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm text-[#00FF00]">
                  <span>Descuento</span>
                  <span className="font-bold">-{(amount * (discountPercent / 100)).toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="flex justify-between text-lg pt-3 border-t border-white/12">
                <span>Total</span>
                <span className="font-bold">{finalAmount.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          <div className={cn('p-6', styles.softPanel)}>
            <p
              className={cn(
                'text-xs uppercase tracking-[0.2em]',
                styles.pageSubtitle,
                theme === 'minimal' ? 'normal-case tracking-[0.04em]' : 'font-bold'
              )}
            >
              cómo funciona
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="font-bold">1. Elegís misión y monto</p>
                <p className={cn('text-sm mt-1', styles.pageSubtitle)}>Podés apoyar algo puntual o sumar sin vueltas.</p>
              </div>
              <div>
                <p className="font-bold">2. Dejás mensaje o pedido</p>
                <p className={cn('text-sm mt-1', styles.pageSubtitle)}>Si querés, podés convertirlo en un encargo.</p>
              </div>
              <div>
                <p className="font-bold">3. Vas a Mercado Pago</p>
                <p className={cn('text-sm mt-1', styles.pageSubtitle)}>El pago se procesa afuera y después volvés acá.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
