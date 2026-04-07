import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { api } from '@/services/api';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(true);
  const {} = useAppContext();
  
  useEffect(() => {
    // In a real app, the webhook handles the DB update.
    // For this MVP, we can optionally use the success page to trigger the message creation 
    // if we don't have a public webhook URL exposed yet (e.g., testing locally).
    
    // const paymentId = searchParams.get('payment_id');
    // const status = searchParams.get('status');
    
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={cn("min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8 px-4 relative", "font-sans")}
    >
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} colors={['#FF00FF', '#00FF00', '#FFFF00', '#000000', '#FFFFFF']} />}
      
      <motion.div 
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className={cn("w-32 h-32 flex items-center justify-center relative z-10", "bg-[#00FF00] border-4 border-black brutal-shadow")}
      >
        <CheckCircle2 className={cn("w-16 h-16", "text-black")} />
      </motion.div>
      
      <div className="space-y-4">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn("text-4xl md:text-5xl font-bold", "font-brutal uppercase text-black")}
        >
          ¡Pago Aprobado!
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={cn("text-xl max-w-md mx-auto", "text-black/80 font-bold")}
        >
          Tu aporte fue procesado con éxito a través de Mercado Pago.
        </motion.p>
        <motion.p 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: "spring" }}
          className={cn("font-medium pt-4 flex items-center justify-center gap-2 text-2xl", "text-[#FF00FF] font-brutal uppercase")}
        >
          <Sparkles className="w-8 h-8" />
          ¡Gracias por bancar!
        </motion.p>
      </div>
      
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        onClick={() => navigate('/')}
        className={cn(
          "px-8 py-4 font-bold uppercase text-xl transition-transform active:scale-95",
          "bg-black text-white border-4 border-black brutal-shadow-sm hover:-translate-y-1 hover:shadow-none"
        )}
      >
        Volver al Inicio
      </motion.button>
    </motion.div>
  );
}
