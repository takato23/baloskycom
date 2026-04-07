import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Clock3, LoaderCircle, Sparkles, XCircle } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { api } from '@/services/api';
import { CheckoutPaymentStatus } from '@/types';
import { cn } from '@/lib/utils';

type ResolvedStatus = 'loading' | 'approved' | 'pending' | 'rejected' | 'unknown';

const resolveVisualStatus = (
  pathname: string,
  paymentStatus?: string | null,
  fallbackStatus?: string | null
): ResolvedStatus => {
  const normalizedStatus = (paymentStatus || fallbackStatus || '').toLowerCase();

  if (pathname.endsWith('/pending') || normalizedStatus === 'pending' || normalizedStatus === 'in_process') {
    return 'pending';
  }

  if (pathname.endsWith('/failure') || normalizedStatus === 'rejected' || normalizedStatus === 'cancelled') {
    return 'rejected';
  }

  if (normalizedStatus === 'approved') {
    return 'approved';
  }

  return 'unknown';
};

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<CheckoutPaymentStatus | null>(null);
  const [statusError, setStatusError] = useState<string>('');

  const paymentId = searchParams.get('payment_id');
  const fallbackStatus = searchParams.get('status') || searchParams.get('collection_status');

  useEffect(() => {
    let isMounted = true;

    const loadPaymentStatus = async () => {
      if (!paymentId) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const status = await api.getPaymentStatus(paymentId);
        if (!isMounted) return;
        setPaymentStatus(status);
      } catch (error) {
        console.error('Error fetching payment status:', error);
        if (!isMounted) return;
        setStatusError('No pudimos verificar el estado del pago automáticamente.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadPaymentStatus();

    return () => {
      isMounted = false;
    };
  }, [paymentId]);

  const resolvedStatus = useMemo<ResolvedStatus>(() => {
    if (isLoading && paymentId) return 'loading';
    return resolveVisualStatus(location.pathname, paymentStatus?.status, fallbackStatus);
  }, [fallbackStatus, isLoading, location.pathname, paymentId, paymentStatus?.status]);

  useEffect(() => {
    if (resolvedStatus !== 'approved') {
      setShowConfetti(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [resolvedStatus]);

  const presentation = {
    loading: {
      title: 'Verificando Pago',
      description: 'Estamos consultando a Mercado Pago para confirmar tu aporte.',
      accent: 'bg-yellow-300',
      Icon: LoaderCircle,
      iconClassName: 'animate-spin text-black'
    },
    approved: {
      title: '¡Pago Aprobado!',
      description: 'Tu aporte fue procesado con éxito a través de Mercado Pago.',
      accent: 'bg-[#00FF00]',
      Icon: CheckCircle2,
      iconClassName: 'text-black'
    },
    pending: {
      title: 'Pago Pendiente',
      description: 'Mercado Pago recibió la operación, pero todavía no la confirmó.',
      accent: 'bg-yellow-300',
      Icon: Clock3,
      iconClassName: 'text-black'
    },
    rejected: {
      title: 'Pago No Aprobado',
      description: 'Mercado Pago no pudo aprobar el pago. Podés volver a intentarlo.',
      accent: 'bg-red-400',
      Icon: XCircle,
      iconClassName: 'text-black'
    },
    unknown: {
      title: 'Estado En Revisión',
      description: 'Todavía no pudimos confirmar el estado final del pago.',
      accent: 'bg-white',
      Icon: Clock3,
      iconClassName: 'text-black'
    }
  }[resolvedStatus];

  const Icon = presentation.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className={cn('min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8 px-4 relative', 'font-sans')}
    >
      {showConfetti && resolvedStatus === 'approved' && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          colors={['#FF00FF', '#00FF00', '#FFFF00', '#000000', '#FFFFFF']}
        />
      )}

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className={cn('w-32 h-32 flex items-center justify-center relative z-10 border-4 border-black brutal-shadow', presentation.accent)}
      >
        <Icon className={cn('w-16 h-16', presentation.iconClassName)} />
      </motion.div>

      <div className="space-y-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn('text-4xl md:text-5xl font-bold', 'font-brutal uppercase text-black')}
        >
          {presentation.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={cn('text-xl max-w-md mx-auto', 'text-black/80 font-bold')}
        >
          {presentation.description}
        </motion.p>

        {paymentStatus?.amount ? (
          <p className="text-sm font-bold uppercase text-black/60">
            Monto: ${paymentStatus.amount.toLocaleString('es-AR')} {paymentStatus.currency || 'ARS'}
          </p>
        ) : null}

        {statusError ? (
          <p className="mx-auto max-w-md border-4 border-red-600 bg-red-100 px-4 py-3 text-sm font-bold uppercase text-red-700">
            {statusError}
          </p>
        ) : null}

        {resolvedStatus === 'approved' && (
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: 'spring' }}
            className={cn('font-medium pt-4 flex items-center justify-center gap-2 text-2xl', 'text-[#FF00FF] font-brutal uppercase')}
          >
            <Sparkles className="w-8 h-8" />
            ¡Gracias por bancar!
          </motion.p>
        )}
      </div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        onClick={() => navigate(resolvedStatus === 'rejected' ? '/checkout' : '/')}
        className={cn(
          'px-8 py-4 font-bold uppercase text-xl transition-transform active:scale-95',
          'bg-black text-white border-4 border-black brutal-shadow-sm hover:-translate-y-1 hover:shadow-none'
        )}
      >
        {resolvedStatus === 'rejected' ? 'Volver a Intentar' : 'Volver al Inicio'}
      </motion.button>
    </motion.div>
  );
}
