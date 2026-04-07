import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Coffee, CreditCard, ArrowLeft, Wand2, Upload } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';

export default function Checkout() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { campaigns, addContribution } = useAppContext();
  
  const [amount, setAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>(campaignId || 'c3');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; name?: string; message?: string }>({});

  const [discountCode, setDiscountCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountMessage, setDiscountMessage] = useState('');

  const [isEncargo, setIsEncargo] = useState(false);
  const [encargoImage, setEncargoImage] = useState<string | null>(null);
  const [encargoText, setEncargoText] = useState('');

  const suggestedAmounts = [1000, 3000, 5000, 10000];

  const applyDiscount = () => {
    if (discountCode.toUpperCase() === 'VERANO20') {
      setDiscountPercent(20);
      setDiscountMessage('¡Código aplicado! 20% de descuento.');
    } else {
      setDiscountPercent(0);
      setDiscountMessage('Código inválido.');
    }
  };

  const finalAmount = amount - (amount * (discountPercent / 100));

  const handleAmountSelect = (val: number) => {
    setAmount(val);
    setCustomAmount('');
    setErrors(prev => ({ ...prev, amount: undefined }));
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomAmount(val);
    
    if (val) {
      const numVal = parseInt(val, 10);
      setAmount(numVal);
      if (numVal < 100) {
        setErrors(prev => ({ ...prev, amount: 'El monto mínimo es $100' }));
      } else {
        setErrors(prev => ({ ...prev, amount: undefined }));
      }
    } else {
      setAmount(0);
      setErrors(prev => ({ ...prev, amount: 'Ingresá un monto válido' }));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (val.length > 50) {
      setErrors(prev => ({ ...prev, name: 'El nombre no puede superar los 50 caracteres' }));
    } else {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);
    if (val.length > 280) {
      setErrors(prev => ({ ...prev, message: 'El mensaje no puede superar los 280 caracteres' }));
    } else {
      setErrors(prev => ({ ...prev, message: undefined }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEncargoImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    if (isEncargo && amount < 5000) {
      setErrors(prev => ({ ...prev, amount: 'Los encargos mágicos requieren un aporte mínimo de $5.000' }));
      return;
    }

    setIsProcessing(true);
    
    try {
      const campaign = campaigns.find(c => c.id === selectedCampaign);
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
      } else {
        throw new Error('No init_point received');
      }
    } catch (error) {
      console.error('Error creating preference:', error);
      // Fallback for testing if MP fails (e.g., invalid token)
      // In a real app, you would show an error message
      alert('Error al conectar con Mercado Pago. Simulando pago exitoso para pruebas.');
      await addContribution(finalAmount, name, message, selectedCampaign);
      navigate('/checkout/success');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn("theme-page theme-adapt max-w-xl mx-auto space-y-8 pb-32 sm:pb-16 px-4 sm:px-0", "font-sans text-black")}>
      <button 
        onClick={() => navigate(-1)}
        className={cn(
          "flex items-center gap-2 transition-colors mt-4 sm:mt-0",
          "text-black hover:text-black/70 font-bold uppercase"
        )}
      >
        <ArrowLeft className="w-5 h-5" /> <span className="font-medium">Volver</span>
      </button>

      <div className="space-y-3">
        <h1 className={cn("text-3xl sm:text-4xl font-bold flex items-center gap-3", "font-brutal uppercase text-black")}>
          <Coffee className={cn("w-8 h-8 sm:w-10 sm:h-10", "text-black")} />
          Invitame un cafecito
        </h1>
        <p className={cn("text-lg", "text-black/80 font-bold")}>Elegí cuánto querés aportar y a qué misión.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Campaign Selection */}
        <div className="space-y-4">
          <label className={cn("text-sm font-bold uppercase tracking-wider", "text-black")}>Destino del aporte</label>
          <div className="grid gap-3">
            {campaigns.filter(c => c.active).map((campaign) => (
              <label 
                key={campaign.id}
                className={cn(
                  "flex items-center gap-4 p-4 cursor-pointer transition-all",
                  selectedCampaign === campaign.id ? "bg-[#00FF00] border-4 border-black brutal-shadow-sm" : "bg-white border-4 border-black/20 hover:border-black"
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
                <div className={cn(
                  "w-5 h-5 flex items-center justify-center shrink-0",
                  selectedCampaign === campaign.id ? "border-4 border-black bg-white" : "border-4 border-black/20 bg-white"
                )}>
                  {selectedCampaign === campaign.id && <div className={cn("w-2.5 h-2.5", "bg-black")} />}
                </div>
                <span className={cn("font-semibold", "text-black uppercase")}>{campaign.title}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Amount Selection */}
        <div className="space-y-4">
          <label className={cn("text-sm font-bold uppercase tracking-wider", "text-black")}>Monto (ARS)</label>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {suggestedAmounts.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleAmountSelect(val)}
                className={cn(
                  "py-4 sm:py-5 font-bold text-lg transition-all active:scale-95",
                  amount === val && !customAmount ? "bg-[#FF00FF] border-4 border-black text-white brutal-shadow-sm" : "bg-white border-4 border-black text-black hover:bg-zinc-100"
                )}
              >
                ${val.toLocaleString('es-AR')}
              </button>
            ))}
          </div>
          
          <div className="relative mt-4">
            <span className={cn("absolute left-5 top-1/2 -translate-y-1/2 font-bold text-lg", "text-black")}>$</span>
            <input
              type="text"
              placeholder="Otro monto..."
              value={customAmount}
              onChange={handleCustomAmountChange}
              className={cn(
                "w-full py-5 pl-10 pr-5 font-bold text-lg focus:outline-none transition-all",
                "bg-white border-4 border-black text-black placeholder:text-black/40 focus:translate-y-1 brutal-shadow-sm focus:shadow-none",
                ""
              )}
            />
          </div>
          {errors.amount && <p className={cn("text-sm font-medium mt-1", "text-red-600 font-bold")}>{errors.amount}</p>}
        </div>

        {/* Discount Code */}
        <div className="space-y-4">
          <label className={cn("text-sm font-bold uppercase tracking-wider", "text-black")}>Código de Descuento</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: VERANO20"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className={cn(
                "flex-1 p-4 font-bold text-lg transition-all outline-none uppercase",
                "bg-white border-4 border-black text-black placeholder:text-black/40 focus:bg-yellow-100"
              )}
            />
            <button
              type="button"
              onClick={applyDiscount}
              className={cn(
                "px-6 font-bold uppercase transition-transform active:scale-95",
                "bg-black text-white border-4 border-black brutal-shadow-sm"
              )}
            >
              Aplicar
            </button>
          </div>
          {discountMessage && (
            <p className={cn("text-sm font-bold uppercase", discountPercent > 0 ? "text-[#00FF00]" : "text-red-500")}>
              {discountMessage}
            </p>
          )}
        </div>

        {/* Order Summary */}
        <div className={cn("p-6 space-y-4", "bg-white border-4 border-black brutal-shadow-sm")}>
          <h3 className="font-bold uppercase text-xl border-b-4 border-black pb-2">Resumen del Pedido</h3>
          <div className="flex justify-between font-medium">
            <span>Subtotal:</span>
            <span>${amount.toLocaleString('es-AR')}</span>
          </div>
          {discountPercent > 0 && (
            <div className="flex justify-between font-medium text-[#00FF00]">
              <span>Descuento ({discountPercent}%):</span>
              <span>-${(amount * (discountPercent / 100)).toLocaleString('es-AR')}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-2xl pt-2 border-t-4 border-black">
            <span>Total:</span>
            <span>${finalAmount.toLocaleString('es-AR')}</span>
          </div>
        </div>

        {/* Encargo Mágico */}
        <div className={cn("p-6 space-y-4 transition-all", "bg-white border-4 border-black brutal-shadow-sm", isEncargo ? "bg-yellow-300" : "")}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isEncargo}
              onChange={(e) => {
                setIsEncargo(e.target.checked);
                if (e.target.checked && amount < 5000) {
                  setAmount(5000);
                  setCustomAmount('');
                  setErrors(prev => ({ ...prev, amount: undefined }));
                }
              }}
              className="w-6 h-6 border-4 border-black accent-black"
            />
            <div className="flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-black" />
              <span className="font-bold uppercase text-lg text-black">Quiero un Encargo Mágico (Mínimo $5.000)</span>
            </div>
          </label>
          
          {isEncargo && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-4 border-t-4 border-black"
            >
              <p className="font-medium text-black/80">
                ¿Querés que te edite una foto con Cristiano Ronaldo? ¿O que te convierta en un personaje cyberpunk? Dejame tu foto y contame qué querés.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-black">Tu Foto (Opcional)</label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white border-4 border-black font-bold uppercase hover:bg-[#00FF00] transition-colors brutal-shadow-sm">
                    <Upload className="w-5 h-5" />
                    Subir Imagen
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  {encargoImage && (
                    <div className="w-16 h-16 border-4 border-black overflow-hidden">
                      <img src={encargoImage} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-black">¿Qué querés que haga?</label>
                <textarea
                  placeholder="Ej: Haceme una foto tomando mates con Messi en la luna..."
                  value={encargoText}
                  onChange={(e) => setEncargoText(e.target.value)}
                  rows={3}
                  className={cn(
                    "w-full py-4 px-5 focus:outline-none transition-colors resize-none text-lg",
                    "bg-white border-4 border-black text-black font-bold placeholder:text-black/40 focus:translate-y-1 brutal-shadow-sm focus:shadow-none"
                  )}
                  required={isEncargo}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Personal Info */}
        <div className="space-y-4">
          <label className={cn("text-sm font-bold uppercase tracking-wider", "text-black")}>Tu mensaje</label>
          
          <div>
            <input
              type="text"
              placeholder="Tu nombre (opcional)"
              value={name}
              onChange={handleNameChange}
              className={cn(
                "w-full py-4 px-5 focus:outline-none transition-colors text-lg",
                "bg-white border-4 border-black text-black font-bold placeholder:text-black/40 focus:translate-y-1 brutal-shadow-sm focus:shadow-none",
                ""
              )}
            />
            {errors.name && <p className={cn("text-sm font-medium mt-1", "text-red-600 font-bold")}>{errors.name}</p>}
          </div>
          
          <div>
            <textarea
              placeholder="Dejale un mensaje a Santi... (opcional)"
              value={message}
              onChange={handleMessageChange}
              rows={3}
              className={cn(
                "w-full py-4 px-5 focus:outline-none transition-colors resize-none text-lg",
                "bg-white border-4 border-black text-black font-bold placeholder:text-black/40 focus:translate-y-1 brutal-shadow-sm focus:shadow-none",
                ""
              )}
            />
            {errors.message && <p className={cn("text-sm font-medium mt-1", "text-red-600 font-bold")}>{errors.message}</p>}
          </div>
        </div>

        {/* Submit */}
        <div className={cn(
          "fixed bottom-0 left-0 right-0 p-4 z-40 sm:static sm:p-0",
          "bg-white border-t-4 border-black sm:bg-transparent sm:border-none"
        )}>
          <div className="max-w-xl mx-auto">
            <button
              type="submit"
              disabled={isProcessing || amount < 100 || !!errors.name || !!errors.message}
              className={cn(
                "w-full py-5 font-bold text-xl transition-all flex items-center justify-center gap-3 active:scale-95",
                "bg-[#00FF00] text-black border-4 border-black uppercase brutal-shadow hover:translate-y-1 hover:shadow-none disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none disabled:translate-y-0"
              )}
            >
              {isProcessing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className={cn("w-6 h-6 border-2 rounded-full", "border-black/30 border-t-black")}
                />
              ) : (
                <>
                  <CreditCard className="w-6 h-6" />
                  Aportar ${amount.toLocaleString('es-AR')}
                </>
              )}
            </button>
            
            <p className={cn("text-center text-xs mt-3 flex items-center justify-center gap-1", "text-black font-bold uppercase")}>
              <span className={cn("inline-block w-2 h-2 rounded-full", "bg-[#00FF00] border border-black")} />
              Pago seguro simulado (MVP)
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
