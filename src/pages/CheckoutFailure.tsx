import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function CheckoutFailure() {
  const navigate = useNavigate();
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 px-4"
    >
      <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <XCircle className="w-12 h-12 text-red-400" />
        </motion.div>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-3xl font-display font-bold text-white">Pago Rechazado</h2>
        <p className="text-zinc-400 text-lg">Hubo un problema al procesar tu pago en Mercado Pago.</p>
      </div>
      
      <button 
        onClick={() => navigate('/checkout')}
        className="mt-8 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
      >
        <ArrowLeft className="w-5 h-5" /> Volver a intentar
      </button>
    </motion.div>
  );
}
