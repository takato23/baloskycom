import { Currency } from '@/types';

export const formatCurrency = (amount: number, currency: Currency): string => {
  if (currency === 'ARS') {
    return `$${amount.toLocaleString('es-AR')}`;
  } else if (currency === 'USD') {
    return `US$${(amount / 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'CRYPTO') {
    return `₮${(amount / 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${amount.toLocaleString('es-AR')}`;
};
