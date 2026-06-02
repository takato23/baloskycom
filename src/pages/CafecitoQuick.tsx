import { useMemo, useState } from 'react';
import { ArrowRight, Coffee, Heart, MessageCircle } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { trackEvent } from '@/lib/analytics';

const DEFAULT_CAFECITO_AMOUNT = 3000;
const QUANTITY_PRESETS = [1, 3, 5, 10];

const clampQuantity = (value: number) => {
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(Math.round(value), 99);
};

export default function CafecitoQuick() {
  const { settings } = useAppContext();
  const unitAmount = Number(settings?.cafecito?.amount) > 0
    ? Number(settings.cafecito.amount)
    : DEFAULT_CAFECITO_AMOUNT;
  const paypalEnabled = Boolean(settings?.cafecito?.paypalLink?.trim());
  const paypalCurrency = settings?.cafecito?.paypalCurrency?.trim().toUpperCase() || 'USD';
  const paypalUnitAmount = Number(settings?.cafecito?.paypalUnitAmount) > 0
    ? Number(settings.cafecito.paypalUnitAmount)
    : 3;
  const [quantity, setQuantity] = useState(3);
  const [customQuantity, setCustomQuantity] = useState('');
  const [submitting, setSubmitting] = useState<'mp' | 'paypal' | null>(null);

  const total = unitAmount * quantity;
  const paypalTotal = paypalUnitAmount * quantity;
  const formattedUnit = useMemo(
    () => unitAmount.toLocaleString('es-AR'),
    [unitAmount]
  );
  const formattedTotal = useMemo(
    () => total.toLocaleString('es-AR'),
    [total]
  );
  const formattedPaypalTotal = useMemo(
    () => paypalTotal.toLocaleString('en-US', { maximumFractionDigits: 2 }),
    [paypalTotal]
  );

  const selectQuantity = (nextQuantity: number) => {
    setQuantity(clampQuantity(nextQuantity));
    setCustomQuantity('');
  };

  const handleCustomQuantity = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    setCustomQuantity(digits);
    setQuantity(clampQuantity(Number(digits || 1)));
  };

  const goToPayment = (provider: 'mp' | 'paypal') => {
    setSubmitting(provider);
    trackEvent('checkout_start', {
      source: 'cafecito_quick',
      provider,
      qty: quantity,
      amount: provider === 'paypal' ? paypalTotal : total,
      currency: provider === 'paypal' ? paypalCurrency : 'ARS',
    }, { target: provider });
    const params = new URLSearchParams({
      mode: 'cafecito',
      qty: String(quantity),
    });
    if (provider === 'paypal') params.set('provider', 'paypal');
    window.location.href = `/api/checkout/quick?${params.toString()}`;
  };

  return (
    <main className="cafe-root">
      <style>{css}</style>
      <section className="cafe-wrap" aria-label="Invitar cafecitos">
        <div className="cafe-copy">
          <div className="cafe-mark">
            <Coffee size={18} aria-hidden="true" />
            <span>cafecito directo</span>
          </div>
          <h1>¿Cuántos cafecitos me invitás?</h1>
        </div>

        <div className="cafe-picker">
          <div className="cafe-options" role="radiogroup" aria-label="Cantidad de cafecitos">
            {QUANTITY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`cafe-option${quantity === preset && !customQuantity ? ' is-active' : ''}${preset === 3 ? ' is-recommended' : ''}`}
                onClick={() => selectQuantity(preset)}
                role="radio"
                aria-checked={quantity === preset && !customQuantity}
              >
                {preset === 3 && <span className="cafe-tag">cómodo</span>}
                <strong>{preset}</strong>
                <span>{preset === 1 ? 'cafecito' : 'cafecitos'}</span>
              </button>
            ))}
          </div>

          <label className="cafe-custom">
            <span>otra cantidad</span>
            <input
              type="text"
              inputMode="numeric"
              value={customQuantity}
              onChange={(event) => handleCustomQuantity(event.target.value)}
              placeholder="ej. 15"
              aria-label="Otra cantidad de cafecitos"
            />
          </label>

          <div className="cafe-total" aria-live="polite">
            <span>{quantity} x ${formattedUnit}</span>
            <strong>${formattedTotal} ARS</strong>
          </div>

          <div className="cafe-payments">
            <button
              type="button"
              className="cafe-pay"
              onClick={() => goToPayment('mp')}
              disabled={submitting !== null}
            >
              <Heart size={18} aria-hidden="true" />
              <span className="cafe-pay-copy">
                <strong>{submitting === 'mp' ? 'abriendo Mercado Pago...' : 'Pagar en pesos'}</strong>
                <small>Mercado Pago · ${formattedTotal} ARS</small>
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>

            {paypalEnabled && (
              <button
                type="button"
                className="cafe-paypal-option"
                onClick={() => goToPayment('paypal')}
                disabled={submitting !== null}
              >
                <span className="paypal-logo" aria-hidden="true">
                  <span>Pay</span><span>Pal</span>
                </span>
                <span className="cafe-paypal-copy">
                  <strong>¿Estás en el exterior?</strong>
                  <small>
                    {submitting === 'paypal'
                      ? 'abriendo PayPal...'
                      : `comprame un coffee · ${formattedPaypalTotal} ${paypalCurrency}`}
                  </small>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="cafe-after">
            <MessageCircle size={17} aria-hidden="true" />
            <span>Después del pago podés dejar mensaje público, privado o tu mail. Sin formularios antes de pagar.</span>
          </div>
        </div>
      </section>
    </main>
  );
}

const css = `
  .cafe-root {
    min-height: 100dvh;
    background:
      radial-gradient(circle at 18% 18%, rgba(250, 93, 41, 0.22), transparent 28%),
      radial-gradient(circle at 82% 10%, rgba(255, 211, 94, 0.12), transparent 24%),
      #090807;
    color: #f7efe7;
    display: grid;
    place-items: center;
    padding: 28px 18px;
    font-family: Inter, system-ui, sans-serif;
    cursor: auto;
  }
  .cafe-root * { box-sizing: border-box; cursor: auto; }
  .cafe-wrap {
    width: min(920px, 100%);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 420px;
    gap: 42px;
    align-items: center;
  }
  .cafe-copy h1 {
    font-family: 'Inter Tight', Inter, system-ui, sans-serif;
    font-size: 84px;
    line-height: 0.9;
    letter-spacing: 0;
    margin: 18px 0 0;
    max-width: 640px;
    font-weight: 900;
  }
  .cafe-mark {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #fa5d29;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .cafe-picker {
    border: 1px solid rgba(247, 239, 231, 0.16);
    background: rgba(16, 13, 11, 0.82);
    padding: 18px;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.38);
  }
  .cafe-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .cafe-option {
    position: relative;
    min-height: 112px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-start;
    gap: 4px;
    border: 1px solid rgba(247, 239, 231, 0.14);
    background: #15110f;
    color: #f7efe7;
    padding: 16px;
    text-align: left;
    transition: border-color 150ms ease, background 150ms ease, transform 150ms ease;
  }
  .cafe-option:hover,
  .cafe-option.is-active {
    border-color: #fa5d29;
    background: rgba(250, 93, 41, 0.12);
    transform: translateY(-1px);
  }
  .cafe-option strong {
    font-family: 'Inter Tight', Inter, system-ui, sans-serif;
    font-size: 42px;
    line-height: 0.9;
  }
  .cafe-option span:not(.cafe-tag) {
    color: rgba(247, 239, 231, 0.68);
    font-size: 13px;
  }
  .cafe-tag {
    position: absolute;
    top: 10px;
    right: 10px;
    border: 1px solid rgba(250, 93, 41, 0.55);
    color: #fa5d29;
    padding: 4px 7px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    text-transform: uppercase;
  }
  .cafe-custom {
    display: grid;
    grid-template-columns: 1fr 120px;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    padding: 14px 16px;
    border: 1px solid rgba(247, 239, 231, 0.14);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(247, 239, 231, 0.68);
    font-size: 13px;
  }
  .cafe-custom input {
    width: 100%;
    border: 0;
    background: transparent;
    color: #f7efe7;
    font: 800 22px 'Inter Tight', Inter, sans-serif;
    outline: none;
    text-align: right;
  }
  .cafe-total {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    margin: 22px 0 14px;
  }
  .cafe-total span {
    color: rgba(247, 239, 231, 0.58);
    font-size: 13px;
  }
  .cafe-total strong {
    font-family: 'Inter Tight', Inter, system-ui, sans-serif;
    font-size: 38px;
    line-height: 1;
    text-align: right;
  }
  .cafe-payments {
    display: grid;
    gap: 10px;
  }
  .cafe-pay {
    width: 100%;
    min-height: 68px;
    border: 0;
    background: #fa5d29;
    color: #090807;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    font-family: 'Inter Tight', Inter, system-ui, sans-serif;
    font-size: 16px;
    font-weight: 900;
    text-transform: none;
  }
  .cafe-pay-copy {
    display: grid;
    gap: 3px;
    line-height: 1;
    text-align: center;
  }
  .cafe-pay-copy strong {
    font-size: 18px;
  }
  .cafe-pay-copy small {
    color: rgba(9, 8, 7, 0.7);
    font: 700 12px Inter, system-ui, sans-serif;
  }
  .cafe-paypal-option {
    width: 100%;
    min-height: 58px;
    border: 0;
    background: #ffc439;
    color: #111;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 13px;
    text-align: left;
    box-shadow: inset 0 0 0 1px rgba(9, 8, 7, 0.16);
  }
  .paypal-logo {
    flex: 0 0 auto;
    min-width: 72px;
    border-radius: 999px;
    background: #fff;
    padding: 7px 9px;
    color: #003087;
    font: 900 17px Arial, Helvetica, sans-serif;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .paypal-logo span + span { color: #009cde; }
  .cafe-paypal-copy {
    min-width: 0;
    display: grid;
    gap: 3px;
    line-height: 1.2;
  }
  .cafe-paypal-copy strong {
    font: 900 13px Inter, system-ui, sans-serif;
  }
  .cafe-paypal-copy small {
    font: 800 12px Inter, system-ui, sans-serif;
    color: rgba(17, 17, 17, 0.72);
    overflow-wrap: anywhere;
  }
  .cafe-paypal-option:disabled { opacity: 0.72; }
  .cafe-pay:disabled { opacity: 0.72; }
  .cafe-after {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 14px;
    color: rgba(247, 239, 231, 0.62);
    font-size: 12px;
    line-height: 1.35;
  }
  @media (max-width: 820px) {
    .cafe-root { align-items: start; padding-top: 34px; }
    .cafe-wrap { grid-template-columns: 1fr; gap: 28px; }
    .cafe-copy h1 { font-size: 58px; }
  }
  @media (max-width: 420px) {
    .cafe-picker { padding: 14px; }
    .cafe-option { min-height: 98px; padding: 14px; }
    .cafe-custom { grid-template-columns: 1fr 86px; }
    .cafe-copy h1 { font-size: 46px; }
    .cafe-total strong { font-size: 30px; }
    .cafe-paypal-option { align-items: center; }
    .paypal-logo { min-width: 66px; font-size: 15px; }
  }
`;
