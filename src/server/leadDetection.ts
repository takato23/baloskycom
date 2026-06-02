const LEAD_EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const LEAD_PHONE_RE = /(?:\+?\d[\s().-]*){8,}/;
const LEAD_WHATSAPP_RE = /\b(?:whats?app|wsp|wa\.me|wa\s?\+?\d|wp)\b/i;
const LEAD_WORK_RE = /\b(?:trabajemos|laburo|laburar|laburamos|contratar|contratame|presupuesto|cotizaci[oó]n|cotizar|propuesta|proyecto|cliente|marca|empresa|agencia|campaña|publicidad|sponsor|colaboraci[oó]n|consultor[ií]a|asesor[ií]a|asesorame|reuni[oó]n|llamada|curso|taller|clase|capacitaci[oó]n|web|landing|video\s+para|ia\s+para)\b/i;
const LEAD_TRABAJO_CONTEXT_RE = /\b(?:necesito|busco|quiero|queremos|podemos|podr[ií]amos|hagamos|hacer|armar|pagar|pago|oferta|propuesta)\b.{0,80}\b(?:trabajo|trabajos|servicio|servicios)\b|\b(?:trabajo|trabajos|servicio|servicios)\b.{0,80}\b(?:necesito|busco|quiero|queremos|podemos|podr[ií]amos|hagamos|hacer|armar|pagar|pago|oferta|propuesta)\b/i;

export type MessageLeadSignal = {
  shouldNotify: boolean;
  reasons: string[];
};

export const detectMessageLead = (message: string): MessageLeadSignal => {
  const reasons: string[] = [];

  if (LEAD_EMAIL_RE.test(message)) reasons.push('email');
  if (LEAD_PHONE_RE.test(message)) reasons.push('teléfono');
  if (LEAD_WHATSAPP_RE.test(message)) reasons.push('WhatsApp');
  if (LEAD_WORK_RE.test(message) || LEAD_TRABAJO_CONTEXT_RE.test(message)) {
    reasons.push('posible trabajo');
  }

  return {
    shouldNotify: reasons.length > 0,
    reasons: Array.from(new Set(reasons))
  };
};
