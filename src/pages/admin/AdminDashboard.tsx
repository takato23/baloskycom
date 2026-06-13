import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Film,
  Image,
  Lightbulb,
  MessageSquare,
  Music,
  Package,
  Plus,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { api } from '@/services/api';
import { Campaign, SupporterMessage, Product, Membership, Idea, Encargo, EncargoStatus, EventSummary } from '@/types';
import { Modal } from '@/components/Modal';

const panelClass = 'rounded-[24px] border border-white/10 bg-zinc-950/70 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.22)] sm:p-5';
const listItemClass = 'rounded-[22px] border border-white/10 bg-zinc-950/70 p-4 transition-colors hover:border-white/18 sm:p-5';
const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black !text-zinc-950 transition-colors hover:bg-zinc-200';
const iconButtonClass = 'grid min-h-11 min-w-11 place-items-center rounded-2xl border border-white/10 bg-zinc-900 text-zinc-400 transition-colors hover:border-white/20 hover:text-white';

function AdminSectionHeader({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">{eyebrow}</p>
        <h2 className="mt-1 text-3xl font-black tracking-[-0.07em] text-white sm:text-5xl">{title}</h2>
        {copy && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{copy}</p>}
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className={panelClass}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-3 text-4xl font-black tracking-[-0.07em] text-white sm:text-5xl">{value}</p>
      {detail && <p className="mt-2 text-xs font-medium text-zinc-500">{detail}</p>}
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  detail,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail: string;
}) {
  return (
    <Link to={to} className="group flex min-h-24 items-center gap-3 rounded-[22px] border border-white/10 bg-zinc-950/70 p-4 transition-colors hover:border-cyan-300/50 hover:bg-zinc-900">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white !text-zinc-950">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-white">{label}</span>
        <span className="mt-1 block text-xs leading-snug text-zinc-500">{detail}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-cyan-300" />
    </Link>
  );
}

const encargoStatuses: EncargoStatus[] = ['nuevo', 'respondido', 'cotizado', 'ganado', 'perdido'];

const encargoStatusMeta: Record<EncargoStatus, { label: string; className: string }> = {
  nuevo: { label: 'Nuevo', className: 'bg-orange-500/15 text-orange-300 border-orange-400/20' },
  respondido: { label: 'Respondido', className: 'bg-sky-500/15 text-sky-300 border-sky-400/20' },
  cotizado: { label: 'Cotizado', className: 'bg-violet-500/15 text-violet-300 border-violet-400/20' },
  ganado: { label: 'Ganado', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20' },
  perdido: { label: 'Perdido', className: 'bg-zinc-700/50 text-zinc-300 border-white/10' },
};

const encargoPackageLabel: Record<string, string> = {
  reel: 'Reel 15s',
  spot: 'Spot 30s',
  historia: 'Historia narrativa',
  consultoria: 'Consultoría IA',
  serie: 'Serie de videos',
  web: 'Web / webapp',
  proyecto: 'Proyecto grande',
  pack: 'Pack Pauta ×3',
  campania: 'Campaña + Canal',
  custom: 'Idea rara',
};

// Anclas de /productora — fallback de valor cuando el encargo no tiene uno
// guardado (filas viejas). Mantener en sync con ENCARGO_PACKAGE_VALUES (api.ts).
const encargoPackageValue: Record<string, number> = {
  spot: 500,
  pack: 900,
  campania: 2500,
};

const encargoValue = (e: Encargo): number =>
  e.estimatedValue ?? encargoPackageValue[e.packageId] ?? 0;

const formatUsd = (n: number) =>
  `USD ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

const daysAgo = (iso: string): string => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days}d`;
};

/** Valor del deal, editable con un click (Enter guarda, Esc cancela). */
function EncargoValueChip({
  encargo,
  onSave,
}: {
  encargo: Encargo;
  onSave: (id: string, value: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === '') return;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    if (Math.round(parsed) === encargoValue(encargo)) return;
    onSave(encargo.id, Math.round(parsed));
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-24 rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-xs font-black text-white outline-none focus:ring-2 focus:ring-emerald-400/30"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(encargoValue(encargo)));
        setEditing(true);
      }}
      title="Editar valor estimado del deal"
      className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-xs font-black text-emerald-300 hover:bg-emerald-500/20"
    >
      {formatUsd(encargoValue(encargo))}
    </button>
  );
}

const analyticsEventLabel: Record<string, { label: string; detail: string }> = {
  page_view: { label: 'Visitas', detail: 'Páginas públicas vistas' },
  cta_click: { label: 'CTAs', detail: 'Clicks hacia secciones internas' },
  checkout_start: { label: 'Checkout iniciado', detail: 'Clicks o botones de pago' },
  checkout_created: { label: 'Link de pago creado', detail: 'Salida real a MP/PayPal' },
  social_click: { label: 'Redes', detail: 'Clicks a redes externas' },
  media_open: { label: 'Media', detail: 'Videos, fotos, canciones o descargas abiertas' },
  encargo_start: { label: 'Pre-pedido abierto', detail: 'Formulario de encargo abierto' },
  encargo_created: { label: 'Pre-pedido enviado', detail: 'Lead de encargo creado' },
};

const analyticsEventOrder = [
  'page_view',
  'checkout_start',
  'checkout_created',
  'cta_click',
  'social_click',
  'media_open',
  'encargo_start',
  'encargo_created',
];

const eventLabel = (eventName: string) => analyticsEventLabel[eventName]?.label || eventName.replace(/_/g, ' ');

function contactHref(contact: string) {
  const raw = contact.trim();
  if (!raw) return '';
  if (raw.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return `mailto:${raw}`;
  const ig = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '');
  if (/^[a-zA-Z0-9._]{2,30}$/.test(ig)) return `https://ig.me/m/${ig}`;
  return '';
}

/**
 * Botones de respuesta para el detalle del encargo. Detecta mail, teléfono
 * (→ WhatsApp) e Instagram dentro del texto libre del contacto y arma un link
 * directo para cada uno, así Santi responde sin copiar y pegar.
 */
function contactActions(contact: string): Array<{ label: string; href: string }> {
  const raw = (contact || '').trim();
  if (!raw) return [];
  const actions: Array<{ label: string; href: string }> = [];

  const email = raw.match(/[^\s<>,;]+@[^\s<>,;]+\.[^\s<>,;]+/)?.[0];
  if (email) actions.push({ label: `✉️ ${email}`, href: `mailto:${email}` });

  // Teléfono: 8+ dígitos (tolera +, espacios, guiones, paréntesis) → WhatsApp.
  const phoneRaw = raw.match(/\+?[\d][\d\s().-]{7,}\d/)?.[0];
  if (phoneRaw) {
    const digits = phoneRaw.replace(/\D/g, '');
    if (digits.length >= 8) actions.push({ label: `🟢 WhatsApp ${phoneRaw.trim()}`, href: `https://wa.me/${digits}` });
  }

  // Instagram: sin confundir con el local-part de un mail.
  const igSource = email ? raw.replace(email, ' ') : raw;
  // 1) Handle explícito con @ (lo más confiable). Si no hay, 2) un único
  // token plausible cuando el texto menciona instagram/ig.
  let ig = igSource.match(/@([a-zA-Z0-9._]{2,30})/)?.[1];
  if (!ig && /instagram|\big\b/i.test(raw)) {
    const tokens = igSource
      .replace(/instagram|\big\b/gi, ' ')
      .match(/[a-zA-Z0-9._]{2,30}/g)
      ?.filter((t) => /[a-zA-Z]/.test(t) && !t.includes('.com')) || [];
    if (tokens.length === 1) ig = tokens[0];
  }
  if (ig) actions.push({ label: `📷 @${ig}`, href: `https://ig.me/m/${ig}` });

  return actions;
}

/* ---------------------------------------------------------------------
 * Triage de leads: clasificación automática por reglas + detección de
 * presupuesto. Separa cómo Santi monetiza cada lead (marca / aprender /
 * personal) y resalta el dinero, que es la señal que importa.
 * ------------------------------------------------------------------- */
type EncargoCategory = 'marca' | 'aprender' | 'personal';

const categoryMeta: Record<EncargoCategory, { label: string; tab: string; hint: string }> = {
  marca: { label: 'Marca', tab: 'Marcas', hint: 'negocio, plata' },
  aprender: { label: 'Quiere aprender', tab: 'Aprender', hint: 'workshops' },
  personal: { label: 'Personal', tab: 'Personal', hint: 'otros' },
};

function categorizeEncargo(e: { brief: string; packageId: string }): EncargoCategory {
  const t = (e.brief || '').toLowerCase();
  if (/\b(aprend|workshop|taller|capacit|curso|ense[ñn]|skill|tutor|c[oó]mo (lo|los) hac)/.test(t)) return 'aprender';
  if (/\b(marca|empresa|negocio|local|producto|tienda|agencia|lanzamiento|comercio|pyme|emprend|client|vender|venta|difusi[oó]n|publicidad|campa[ñn]a|expo|show|banda|evento|presentaci[oó]n|cotiz|presupuest)/.test(t)) return 'marca';
  if (e.packageId === 'consultoria') return 'aprender';
  return 'personal';
}

// Devuelve el texto del monto si el brief trae un número real; null si no
// (ej: "a definir", "no tengo idea", "lo que valga tu laburo").
function detectBudget(brief: string): string | null {
  const t = brief || '';
  const tagged = t.match(/(?:rango pensado|presupuesto|invertir|cu[aá]nto)[:\s]+([^\n.]{1,40})/i);
  if (tagged && /\d/.test(tagged[1])) return tagged[1].trim().replace(/\s+/g, ' ');
  const amount = t.match(/(?:USD|US\$|U\$S|\$|ARS)\s?\d[\d.,]{2,}/i);
  if (amount) return amount[0].trim();
  return null;
}

/**
 * Panel de detalle del lead — reutilizado por el panel fijo de escritorio
 * y por el modal de celular. Mensaje completo + botones para responder.
 */
function EncargoDetailPanel({
  e,
  onStatus,
  onDelete,
  onCopy,
}: {
  e: Encargo;
  onStatus: (id: string, status: EncargoStatus) => void;
  onDelete: (id: string) => void;
  onCopy: (contact: string) => void;
}) {
  const budget = detectBudget(e.brief);
  const cat = categorizeEncargo(e);
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-lg font-black text-zinc-200">
          {(e.name.trim()[0] || '?').toUpperCase()}
        </span>
        <div className="min-w-0">
          <h3 className="text-2xl font-black tracking-[-0.03em] text-white">{e.name}</h3>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">
            {encargoPackageLabel[e.packageId] || e.packageId}
            {' · '}
            {new Date(e.createdAt).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-300">
          {categoryMeta[cat].label}
        </span>
        {budget && (
          <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-300">
            Presupuesto: {budget}
          </span>
        )}
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${encargoStatusMeta[e.status].className}`}>
          {encargoStatusMeta[e.status].label}
        </span>
      </div>

      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Lo que te escribió</p>
      <p className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-zinc-200">
        {e.brief}
      </p>
      {e.referenceUrl && (
        <a
          href={e.referenceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-flex max-w-full items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-black text-zinc-300 hover:text-white"
        >
          <span className="shrink-0 uppercase tracking-[0.14em]">Referencia</span>
          <span className="min-w-0 break-all text-zinc-400">{e.referenceUrl}</span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
        </a>
      )}

      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Responder</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {contactActions(e.contact).map((a) => (
          <a
            key={a.href}
            href={a.href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--accent,#FA5D29)]/40 bg-[var(--accent,#FA5D29)]/10 px-3.5 py-2.5 text-sm font-black text-[var(--accent,#FA5D29)] hover:bg-[var(--accent,#FA5D29)]/20"
          >
            {a.label}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ))}
        <button
          type="button"
          onClick={() => onCopy(e.contact)}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm font-bold text-zinc-300 hover:text-white"
          title="Copiar contacto"
        >
          <Copy className="h-4 w-4" />
          {e.contact}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Etapa</span>
        <select
          value={e.status}
          onChange={(ev) => onStatus(e.id, ev.target.value as EncargoStatus)}
          className="min-h-10 flex-1 rounded-2xl border border-white/10 bg-black/40 px-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-white/20"
        >
          {encargoStatuses.map((statusKey) => (
            <option key={statusKey} value={statusKey}>{encargoStatusMeta[statusKey].label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onDelete(e.id)}
          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 px-4 text-sm font-black text-red-300 hover:bg-red-500/15"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard({ defaultTab = 'overview' }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [messages, setMessages] = useState<SupporterMessage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [openEncargo, setOpenEncargo] = useState<Encargo | null>(null);
  const [encargoTab, setEncargoTab] = useState<'prioridad' | EncargoCategory | 'cerrados'>('prioridad');
  const [eventSummary, setEventSummary] = useState<EventSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Partial<Membership> | null>(null);

  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Partial<Idea> | null>(null);
  const [ideaTagsInput, setIdeaTagsInput] = useState('');

  // Filtro de la tab Mensajes: todos | pendientes | aprobados | del muro (amount=0)
  const [messageFilter, setMessageFilter] = useState<'all' | 'pending' | 'approved' | 'wall'>('all');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    const fetchData = async () => {
      const readResult = <T,>(result: PromiseSettledResult<T>, fallback: T, label: string): T => {
        if (result.status === 'fulfilled') return result.value;
        console.error(`Error fetching admin ${label}:`, result.reason);
        return fallback;
      };

      try {
        const [c, m, p, mem, i, e, events] = await Promise.allSettled([
          api.getCampaigns(),
          api.getMessages(),
          api.getProducts(),
          api.getMemberships(),
          api.getIdeas(),
          api.getEncargos(),
          api.getEventSummary(30),
        ]);
        setCampaigns(readResult(c, [], 'campaigns'));
        setMessages(readResult(m, [], 'messages'));
        setProducts(readResult(p, [], 'products'));
        setMemberships(readResult(mem, [], 'memberships'));
        setIdeas(readResult(i, [], 'ideas'));
        setEncargos(readResult(e, [], 'encargos'));
        setEventSummary(readResult(events, null, 'event summary'));
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleApproveMessage = async (id: string, isApproved: boolean) => {
    try {
      await api.approveMessage(id, isApproved);
      setMessages(messages.map(m => m.id === id ? { ...m, isApproved } : m));
    } catch (error) {
      console.error('Error approving message:', error);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    try {
      if (editingCampaign.id) {
        const updated = await api.updateCampaign(editingCampaign.id, editingCampaign);
        setCampaigns(campaigns.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await api.createCampaign(editingCampaign);
        setCampaigns([...campaigns, created]);
      }
      setIsCampaignModalOpen(false);
      setEditingCampaign(null);
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      if (editingProduct.id) {
        const updated = await api.updateProduct(editingProduct.id, editingProduct);
        setProducts(products.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await api.createProduct(editingProduct);
        setProducts([...products, created]);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleSaveMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMembership) return;
    try {
      if (editingMembership.id) {
        const updated = await api.updateMembership(editingMembership.id, editingMembership);
        setMemberships(memberships.map(m => m.id === updated.id ? updated : m));
      } else {
        const created = await api.createMembership(editingMembership);
        setMemberships([...memberships, created]);
      }
      setIsMembershipModalOpen(false);
      setEditingMembership(null);
    } catch (error) {
      console.error('Error saving membership:', error);
    }
  };

  const openIdeaModal = (idea: Partial<Idea> | null) => {
    if (idea === null) {
      setEditingIdea({ active: true, featured: false, sortOrder: 0 });
      setIdeaTagsInput('');
    } else {
      setEditingIdea(idea);
      setIdeaTagsInput((idea.tags || []).join(', '));
    }
    setIsIdeaModalOpen(true);
  };

  const handleSaveIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdea) return;
    try {
      const payload: Partial<Idea> = {
        ...editingIdea,
        tags: ideaTagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      };
      if (editingIdea.id) {
        const updated = await api.updateIdea(editingIdea.id, payload);
        setIdeas(ideas.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        const created = await api.createIdea(payload);
        setIdeas([...ideas, created]);
      }
      setIsIdeaModalOpen(false);
      setEditingIdea(null);
      setIdeaTagsInput('');
    } catch (error) {
      console.error('Error saving idea:', error);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (window.confirm('¿Eliminar esta idea?')) {
      try {
        await api.deleteIdea(id);
        setIdeas(ideas.filter((i) => i.id !== id));
      } catch (error) {
        console.error('Error deleting idea:', error);
      }
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta misión?')) {
      try {
        await api.deleteCampaign(id);
        setCampaigns(campaigns.filter(c => c.id !== id));
      } catch (error) {
        console.error('Error deleting campaign:', error);
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        await api.deleteProduct(id);
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleDeleteMembership = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta membresía?')) {
      try {
        await api.deleteMembership(id);
        setMemberships(memberships.filter(m => m.id !== id));
      } catch (error) {
        console.error('Error deleting membership:', error);
      }
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
      try {
        await api.deleteMessage(id);
        setMessages(messages.filter(m => m.id !== id));
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  const handleUpdateEncargoStatus = async (id: string, status: EncargoStatus) => {
    try {
      const updated = await api.updateEncargoStatus(id, status);
      setEncargos(encargos.map((encargo) => (encargo.id === id ? updated : encargo)));
    } catch (error) {
      console.error('Error updating encargo status:', error);
    }
  };

  const handleUpdateEncargoValue = async (id: string, value: number | null) => {
    try {
      const updated = await api.updateEncargoValue(id, value);
      setEncargos((prev) => prev.map((encargo) => (encargo.id === id ? updated : encargo)));
    } catch (error) {
      console.error('Error updating encargo value:', error);
    }
  };

  const handleDeleteEncargo = async (id: string) => {
    if (window.confirm('¿Eliminar este pre-pedido?')) {
      try {
        await api.deleteEncargo(id);
        setEncargos(encargos.filter((encargo) => encargo.id !== id));
      } catch (error) {
        console.error('Error deleting encargo:', error);
      }
    }
  };

  const copyContact = async (contact: string) => {
    try {
      await navigator.clipboard.writeText(contact);
    } catch {
      window.prompt('Copiar contacto', contact);
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-[28px] border border-white/10 bg-zinc-950/70 text-sm font-bold text-zinc-500">
        Cargando admin...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <AdminSectionHeader
            eyebrow="Panel operativo"
            title="Resumen"
            copy="Lo importante para operar la web: cargar laboratorio, revisar mensajes, ajustar apoyos y entrar rápido desde mobile."
            action={
              <a href="/laboratorio" className={primaryButtonClass}>
                Ver laboratorio <ArrowUpRight className="h-4 w-4" />
              </a>
            }
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Recaudación"
              value={`$${campaigns.reduce((sum, c) => sum + c.currentAmount, 0).toLocaleString()}`}
              detail="Total registrado en campañas"
            />
            <MetricCard
              label="Mensajes pendientes"
              value={messages.filter(m => !m.isApproved).length}
              detail="Revisar antes de publicar"
            />
            <MetricCard
              label="Pre-pedidos abiertos"
              value={encargos.filter(e => !['ganado', 'perdido'].includes(e.status)).length}
              detail={`${encargos.length} leads en pipeline`}
            />
            <MetricCard
              label="Inventario"
              value={products.length + memberships.length + ideas.length}
              detail="Productos, membresías e ideas"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className={panelClass}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Carga rápida</p>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.05em] text-white">Laboratorio</h3>
                </div>
                <Link to="/admin/media" className="text-xs font-black text-zinc-400 hover:text-white">Abrir todo</Link>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <QuickAction to="/admin/media/videos" icon={Film} label="Subir video IA" detail="Video, poster, prompt y storyboard." />
                <QuickAction to="/admin/media/panoramas" icon={Sparkles} label="Subir panorama 360" detail="Imágenes 2:1 con preview y destacado." />
                <QuickAction to="/admin/media/fotos" icon={Image} label="Subir foto" detail="Archivo visual para Ojo/foto." />
                <QuickAction to="/admin/media/canciones" icon={Music} label="Subir canción" detail="MP3 o embed externo." />
              </div>
            </div>

            <div className={panelClass}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Pendientes</p>
              <div className="mt-4 space-y-3">
                <Link to="/admin/messages" className="flex items-center justify-between rounded-2xl bg-black/35 p-3">
                  <span className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-yellow-300" />
                    <span>
                      <span className="block text-sm font-black text-white">Mensajes</span>
                      <span className="text-xs text-zinc-500">Moderación del muro</span>
                    </span>
                  </span>
                  <b className="text-xl text-white">{messages.filter(m => !m.isApproved).length}</b>
                </Link>
                <Link to="/admin/encargos" className="flex items-center justify-between rounded-2xl bg-black/35 p-3">
                  <span className="flex items-center gap-3">
                    <Lightbulb className="h-5 w-5 text-violet-300" />
                    <span>
                      <span className="block text-sm font-black text-white">Pre-pedidos</span>
                      <span className="text-xs text-zinc-500">Responder y cotizar</span>
                    </span>
                  </span>
                  <b className="text-xl text-white">{encargos.filter(e => e.status === 'nuevo').length}</b>
                </Link>
                <Link to="/admin/settings" className="flex items-center justify-between rounded-2xl bg-black/35 p-3">
                  <span className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-zinc-300" />
                    <span>
                      <span className="block text-sm font-black text-white">Ajustes públicos</span>
                      <span className="text-xs text-zinc-500">Home, apoyo y acceso</span>
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-zinc-500" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (() => {
        const counts = eventSummary?.counts ?? {};
        const eventRows = analyticsEventOrder.map((eventName) => ({
          eventName,
          count: counts[eventName] || 0,
          ...analyticsEventLabel[eventName],
        }));
        const checkoutStarts = counts.checkout_start || 0;
        const checkoutCreated = counts.checkout_created || 0;
        const checkoutRate = checkoutStarts > 0 ? Math.round((checkoutCreated / checkoutStarts) * 1000) / 10 : 0;
        const recentEvents = eventSummary?.recentEvents ?? [];
        const topPaths = eventSummary?.topPaths ?? [];

        // Embudo comercial: dónde se caen los leads entre que entran y mandan
        // el brief. Cada etapa muestra conversión contra la anterior.
        const funnelStages = [
          { key: 'page_view', label: 'Visitas', detail: 'Entraron al sitio' },
          { key: 'cta_click', label: 'Tocaron un CTA', detail: 'Mostraron interés' },
          { key: 'encargo_start', label: 'Abrieron el form', detail: 'Empezaron el brief' },
          { key: 'encargo_created', label: 'Mandaron el brief', detail: 'Lead en el CRM' },
        ].map((stage) => ({ ...stage, count: counts[stage.key] || 0 }));
        const funnelMax = funnelStages[0].count || 1;

        return (
          <div className="space-y-6">
            <AdminSectionHeader
              eyebrow="Medición"
              title="Analytics"
              copy="Lectura rápida de lo que está pasando en la web pública. Excluye admin y previews internas."
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Visitas"
                value={counts.page_view || 0}
                detail={`Últimos ${eventSummary?.days ?? 30} días`}
              />
              <MetricCard
                label="Checkout iniciado"
                value={checkoutStarts}
                detail="Cafecito, checkout y botones de pago"
              />
              <MetricCard
                label="Link de pago"
                value={checkoutCreated}
                detail={`${checkoutRate}% de handoff a pago`}
              />
              <MetricCard
                label="Clicks externos"
                value={counts.social_click || 0}
                detail="Instagram, Spotify, YouTube, etc."
              />
            </div>

            <div className={panelClass}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Embudo comercial</p>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.05em] text-white">Dónde se caen los leads</h3>
                </div>
                <p className="text-xs font-medium text-zinc-500">Últimos {eventSummary?.days ?? 30} días · conversión vs etapa anterior</p>
              </div>
              <div className="mt-5 space-y-2">
                {funnelStages.map((stage, index) => {
                  const prev = index > 0 ? funnelStages[index - 1].count : null;
                  const rate = prev && prev > 0 ? Math.round((stage.count / prev) * 1000) / 10 : null;
                  const width = Math.max(2, Math.round((stage.count / funnelMax) * 100));
                  return (
                    <div key={stage.key} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white">{stage.label}</p>
                          <p className="text-xs text-zinc-500">{stage.detail}</p>
                        </div>
                        <div className="flex shrink-0 items-baseline gap-3">
                          {rate !== null && (
                            <span className={`text-xs font-black ${rate >= 50 ? 'text-emerald-300' : rate >= 10 ? 'text-amber-300' : 'text-rose-300'}`}>
                              {rate}%
                            </span>
                          )}
                          <b className="text-2xl font-black tracking-[-0.06em] text-white">{stage.count}</b>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-[var(--accent,#FA5D29)]"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className={panelClass}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Eventos</p>
                    <h3 className="mt-1 text-2xl font-black tracking-[-0.05em] text-white">Qué está haciendo la gente</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs font-black text-zinc-400">
                    {Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0)} eventos
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {eventRows.map((event) => (
                    <div key={event.eventName} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white">{event.label}</p>
                          <p className="mt-1 text-xs leading-snug text-zinc-500">{event.detail}</p>
                        </div>
                        <b className="text-2xl font-black tracking-[-0.06em] text-white">{event.count}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={panelClass}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Top páginas</p>
                <div className="mt-4 space-y-2">
                  {topPaths.length === 0 ? (
                    <p className="text-sm text-zinc-500">Todavía no hay vistas registradas.</p>
                  ) : (
                    topPaths.map((row) => (
                      <div key={row.path} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                        <span className="min-w-0 truncate text-sm font-bold text-zinc-200">{row.path}</span>
                        <b className="shrink-0 text-lg font-black text-white">{row.count}</b>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className={panelClass}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Actividad reciente</p>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.05em] text-white">Últimos eventos</h3>
                </div>
                <p className="text-xs font-medium text-zinc-500">Sin emails, tokens ni referencias de pago.</p>
              </div>
              <div className="mt-4 grid gap-2">
                {recentEvents.length === 0 ? (
                  <p className="text-sm text-zinc-500">Todavía no hay eventos para mostrar.</p>
                ) : (
                  recentEvents.slice(0, 12).map((event) => (
                    <div key={event.id} className="grid gap-2 rounded-2xl border border-white/10 bg-black/25 p-3 sm:grid-cols-[180px_1fr_auto] sm:items-center">
                      <span className="text-sm font-black text-white">{eventLabel(event.eventName)}</span>
                      <span className="min-w-0 truncate text-xs text-zinc-500">
                        {event.path || '/'}{event.target ? ` · ${event.target}` : ''}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-500">
                        {new Date(event.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <AdminSectionHeader
            eyebrow="Apoyo"
            title="Misiones"
            copy="Campañas, objetivos y recaudación visible."
            action={
            <button 
              onClick={() => { setEditingCampaign({}); setIsCampaignModalOpen(true); }}
              className={primaryButtonClass}
            >
              <Plus className="w-4 h-4" />
              Nueva Misión
            </button>
            }
          />
          
          <div className="grid gap-4">
            {campaigns.map(campaign => (
              <div key={campaign.id} className={`${listItemClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white">{campaign.title}</h3>
                  <p className="text-zinc-400 text-sm mt-1">
                    ${campaign.currentAmount.toLocaleString()} de ${campaign.targetAmount.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingCampaign(campaign); setIsCampaignModalOpen(true); }}
                    className={iconButtonClass}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className={iconButtonClass}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <AdminSectionHeader
            eyebrow="Ventas"
            title="Productos"
            copy="Compras puntuales, entregables digitales y recursos."
            action={
            <button 
              onClick={() => { setEditingProduct({}); setIsProductModalOpen(true); }}
              className={primaryButtonClass}
            >
              <Plus className="w-4 h-4" />
              Nuevo Producto
            </button>
            }
          />
          
          <div className="grid gap-4">
            {products.map(product => (
              <div key={product.id} className={`${listItemClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white">{product.title}</h3>
                  <p className="text-zinc-400 text-sm mt-1">
                    ${product.price.toLocaleString()} • {product.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }}
                    className={iconButtonClass}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(product.id)}
                    className={iconButtonClass}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memberships Tab */}
      {activeTab === 'memberships' && (
        <div className="space-y-6">
          <AdminSectionHeader
            eyebrow="Club"
            title="Membresías"
            copy="Niveles de apoyo recurrente y acceso."
            action={
            <button 
              onClick={() => { setEditingMembership({}); setIsMembershipModalOpen(true); }}
              className={primaryButtonClass}
            >
              <Plus className="w-4 h-4" />
              Nueva Membresía
            </button>
            }
          />
          
          <div className="grid gap-4">
            {memberships.map(membership => (
              <div key={membership.id} className={`${listItemClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white">{membership.name}</h3>
                  <p className="text-zinc-400 text-sm mt-1">
                    ${membership.price.toLocaleString()} / {membership.billingPeriod === 'monthly' ? 'mes' : 'año'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingMembership(membership); setIsMembershipModalOpen(true); }}
                    className={iconButtonClass}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteMembership(membership.id)}
                    className={iconButtonClass}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'encargos' && (() => {
        const openCount = encargos.filter((e) => !['ganado', 'perdido'].includes(e.status)).length;
        const newCount = encargos.filter((e) => e.status === 'nuevo').length;
        const pipelineValue = encargos
          .filter((e) => !['ganado', 'perdido'].includes(e.status))
          .reduce((acc, e) => acc + encargoValue(e), 0);
        const wonValue = encargos
          .filter((e) => e.status === 'ganado')
          .reduce((acc, e) => acc + encargoValue(e), 0);
        const sorted = [...encargos].sort((a, b) => {
          const statusWeight: Record<EncargoStatus, number> = {
            nuevo: 0,
            respondido: 1,
            cotizado: 2,
            ganado: 3,
            perdido: 4,
          };
          const byStatus = statusWeight[a.status] - statusWeight[b.status];
          if (byStatus !== 0) return byStatus;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        const funnel = eventSummary?.encargo;
        const recentEvents = eventSummary?.recentEncargoEvents ?? [];

        return (
          <div className="space-y-6">
            <AdminSectionHeader
              eyebrow="Pipeline"
              title="Pre-pedidos"
              copy="Leads que llegaron desde la web. Primero respondés y cotizás; recién después se cobra."
              action={
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-sm font-black text-orange-300">
                    {newCount} nuevo{newCount === 1 ? '' : 's'}
                  </span>
                  <span className="rounded-full border border-white/10 bg-zinc-950 px-3 py-2 text-sm font-black text-zinc-300">
                    {openCount} abierto{openCount === 1 ? '' : 's'}
                  </span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-black text-emerald-300">
                    En juego: {formatUsd(pipelineValue)}
                  </span>
                  {wonValue > 0 && (
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-sm font-black text-emerald-200">
                      Ganado: {formatUsd(wonValue)}
                    </span>
                  )}
                </div>
              }
            />

            {/* Pestañas por intención — separan cómo se monetiza cada lead */}
            {(() => {
              const open = encargos.filter((e) => !['ganado', 'perdido'].includes(e.status));
              const catCount = (c: EncargoCategory) => open.filter((e) => categorizeEncargo(e) === c).length;
              const tabs: { key: 'prioridad' | EncargoCategory | 'cerrados'; label: string; count: number }[] = [
                { key: 'prioridad', label: '🔥 Prioridad', count: open.length },
                { key: 'marca', label: 'Marcas', count: catCount('marca') },
                { key: 'aprender', label: 'Aprender', count: catCount('aprender') },
                { key: 'personal', label: 'Personal', count: catCount('personal') },
                { key: 'cerrados', label: 'Cerrados', count: encargos.length - open.length },
              ];
              return (
                <div className="flex flex-wrap gap-2">
                  {tabs.map((t) => {
                    const active = encargoTab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => { setEncargoTab(t.key); setOpenEncargo(null); }}
                        className={`rounded-full border px-3.5 py-2 text-sm font-black transition-colors ${active ? 'border-[var(--accent,#FA5D29)] bg-[var(--accent,#FA5D29)]/15 text-white' : 'border-white/10 bg-zinc-950 text-zinc-400 hover:text-white'}`}
                      >
                        {t.label} <span className="opacity-60">· {t.count}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Funnel compacto — referencia, sobrio */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[20px] border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Funnel {eventSummary?.days ?? 30}d</span>
              <span className="font-bold text-zinc-300">{funnel?.starts ?? 0} <span className="text-zinc-500">abrieron</span></span>
              <span className="font-bold text-zinc-300">{funnel?.created ?? 0} <span className="text-zinc-500">enviaron</span></span>
              <span className="font-bold text-[var(--accent,#FA5D29)]">{newCount} <span className="text-zinc-500">sin responder</span></span>
              <span className="ml-auto text-zinc-400">{funnel?.conversionRate ?? 0}% conversión</span>
            </div>

            {/* Dos paneles: lista (izq) + lectura (der, escritorio). Celular: lista + modal. */}
            {(() => {
              const withCat = encargos.map((e) => ({
                e,
                cat: categorizeEncargo(e),
                budget: detectBudget(e.brief),
                open: !['ganado', 'perdido'].includes(e.status),
              }));
              let list = withCat;
              if (encargoTab === 'prioridad') list = withCat.filter((x) => x.open);
              else if (encargoTab === 'cerrados') list = withCat.filter((x) => !x.open);
              else list = withCat.filter((x) => x.cat === encargoTab);
              list = list.slice().sort((a, b) => {
                if (encargoTab === 'prioridad') {
                  const score = (x: typeof a) => (x.budget ? 2 : 0) + (x.cat === 'marca' ? 1 : 0);
                  const s = score(b) - score(a);
                  if (s !== 0) return s;
                }
                return new Date(b.e.createdAt || 0).getTime() - new Date(a.e.createdAt || 0).getTime();
              });
              if (list.length === 0) {
                return (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-zinc-950/50 p-10 text-center text-sm text-zinc-500">
                    {encargos.length === 0 ? 'Todavía no entró ningún pre-pedido.' : 'No hay leads en esta vista.'}
                  </div>
                );
              }
              const selected = (openEncargo && list.some((x) => x.e.id === openEncargo.id)) ? openEncargo : list[0].e;
              return (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
                  <div className="overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/40">
                    {list.map(({ e, cat, budget }) => {
                      const isNew = e.status === 'nuevo';
                      const isSel = selected.id === e.id;
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setOpenEncargo(e)}
                          className={`flex w-full items-start gap-3 border-b border-white/[0.06] px-4 py-3 text-left transition-colors ${isSel ? 'bg-[var(--accent,#FA5D29)]/10 shadow-[inset_3px_0_0_var(--accent,#FA5D29)]' : 'hover:bg-white/[0.03]'}`}
                        >
                          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-black text-zinc-200">
                            {(e.name.trim()[0] || '?').toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-2">
                                {isNew && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent,#FA5D29)]" />}
                                <span className={`truncate ${isNew ? 'font-black text-white' : 'font-bold text-zinc-400'}`}>{e.name}</span>
                              </span>
                              <span className="shrink-0 text-[11px] font-medium text-zinc-500">{daysAgo(e.createdAt)}</span>
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full border border-white/12 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-zinc-400">{categoryMeta[cat].label}</span>
                              {budget && <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">{budget}</span>}
                            </span>
                            <span className="mt-1 block truncate text-[13px] text-zinc-500">{e.brief}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="hidden rounded-[24px] border border-white/10 bg-zinc-950/40 p-6 lg:block">
                    <EncargoDetailPanel
                      e={selected}
                      onStatus={(id, st) => { handleUpdateEncargoStatus(id, st); setOpenEncargo({ ...selected, status: st }); }}
                      onDelete={(id) => { handleDeleteEncargo(id); setOpenEncargo(null); }}
                      onCopy={copyContact}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Detalle en celular — modal a pantalla completa. En escritorio
                el detalle vive en el panel derecho fijo, así que se oculta. */}
            {openEncargo && (
              <div
                className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm lg:hidden"
                onClick={() => setOpenEncargo(null)}
                role="dialog"
                aria-modal="true"
              >
                <div
                  className="max-h-[90vh] w-full overflow-y-auto rounded-t-[28px] border border-white/10 bg-zinc-950 p-6 shadow-2xl"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <div className="mb-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setOpenEncargo(null)}
                      className="rounded-full border border-white/10 bg-black/40 p-2 text-zinc-400 hover:text-white"
                      aria-label="Cerrar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <EncargoDetailPanel
                    e={openEncargo}
                    onStatus={(id, st) => { handleUpdateEncargoStatus(id, st); setOpenEncargo({ ...openEncargo, status: st }); }}
                    onDelete={(id) => { handleDeleteEncargo(id); setOpenEncargo(null); }}
                    onCopy={copyContact}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Ideas Tab */}
      {activeTab === 'ideas' && (
        <div className="space-y-6">
          <AdminSectionHeader
            eyebrow="Entrada"
            title="Encargos / Ideas"
            copy="Webapps, investigaciones, experimentos y pedidos raros que pueden convertirse en piezas públicas."
            action={
            <button
              onClick={() => openIdeaModal(null)}
              className={primaryButtonClass}
            >
              <Plus className="w-4 h-4" />
              Nueva Idea
            </button>
            }
          />

          <div className="grid gap-4">
            {ideas.map(idea => (
              <div key={idea.id} className={`${listItemClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white truncate">{idea.title}</h3>
                    {idea.featured && (
                      <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-[10px] font-bold rounded-full uppercase tracking-wide">Destacada</span>
                    )}
                    {!idea.active && (
                      <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-full uppercase tracking-wide">Oculta</span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm mt-1 truncate">
                    {idea.category ? `${idea.category} • ` : ''}{idea.url}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={idea.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={iconButtonClass}
                    title="Abrir"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => openIdeaModal(idea)}
                    className={iconButtonClass}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteIdea(idea.id)}
                    className={iconButtonClass}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {ideas.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-zinc-950/50 p-10 text-center text-sm text-zinc-500">
                Todavía no publicaste ninguna idea.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (() => {
        const pendingCount = messages.filter(m => !m.isApproved).length;
        const wallCount = messages.filter(m => (m.amount || 0) === 0).length;

        const filtered = messages.filter(m => {
          if (messageFilter === 'pending') return !m.isApproved;
          if (messageFilter === 'approved') return !!m.isApproved;
          if (messageFilter === 'wall') return (m.amount || 0) === 0;
          return true;
        });

        // Pendientes primero, después por fecha desc
        const sorted = [...filtered].sort((a, b) => {
          const aPending = a.isApproved ? 1 : 0;
          const bPending = b.isApproved ? 1 : 0;
          if (aPending !== bPending) return aPending - bPending;
          const at = new Date(a.createdAt || 0).getTime();
          const bt = new Date(b.createdAt || 0).getTime();
          return bt - at;
        });

        const filterBtn = (key: typeof messageFilter, label: string, badge?: number) => (
          <button
            key={key}
            type="button"
            onClick={() => setMessageFilter(key)}
            className={`min-h-10 px-3 py-1.5 rounded-full text-sm font-black transition-colors flex items-center gap-2 ${
              messageFilter === key
                ? 'bg-white text-zinc-950 border border-white'
                : 'bg-zinc-950 text-zinc-400 border border-white/10 hover:text-zinc-200'
            }`}
          >
            {label}
            {typeof badge === 'number' && badge > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                messageFilter === key ? 'bg-violet-500/30 text-violet-200' : 'bg-zinc-800 text-zinc-300'
              }`}>{badge}</span>
            )}
          </button>
        );

        return (
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <AdminSectionHeader
                eyebrow="Comunidad"
                title="Mensajes"
                copy="Moderá el muro, respondé y separá apoyos reales de comentarios sueltos."
              />
              {pendingCount > 0 && (
                <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-sm font-bold rounded-full">
                  {pendingCount} pendiente{pendingCount === 1 ? '' : 's'} de moderación
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {filterBtn('all', 'Todos', messages.length)}
              {filterBtn('pending', 'Pendientes', pendingCount)}
              {filterBtn('approved', 'Aprobados', messages.length - pendingCount)}
              {filterBtn('wall', 'Del muro', wallCount)}
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-zinc-950/70 p-8 text-center text-zinc-500">
              {messageFilter === 'pending'
                ? 'No hay mensajes pendientes. Todo aprobado.'
                : messageFilter === 'wall'
                ? 'Todavía no hay mensajes del muro (sin compra).'
                : 'Sin mensajes todavía.'}
            </div>
          ) : (
          <div className="grid gap-4">
            {sorted.map(msg => (
              <div key={msg.id} className={`rounded-[24px] border bg-zinc-950/70 p-4 flex flex-col gap-4 sm:p-5 ${
                !msg.isApproved ? 'border-yellow-500/30' : 'border-white/10'
              }`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-bold text-white">{msg.isAnonymous ? 'Anónimo' : msg.supporterName}</span>
                      {(msg.amount || 0) > 0 ? (
                        <span className="text-violet-400 font-medium">${msg.amount.toLocaleString()}</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 text-xs font-bold rounded-full">
                          Del muro
                        </span>
                      )}
                      {!msg.isApproved && (
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded-full">
                          Pendiente
                        </span>
                      )}
                      {msg.message.includes('[ENCARGO MÁGICO]') && (
                        <span className="px-2 py-0.5 bg-fuchsia-500/20 text-fuchsia-400 text-xs font-bold rounded-full flex items-center gap-1">
                          <Wand2 className="w-3 h-3" />
                          Encargo
                        </span>
                      )}
                      {msg.createdAt && (
                        <span className="text-xs text-zinc-500 ml-auto">
                          {new Date(msg.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {msg.isApproved ? (
                      <button 
                        onClick={() => handleApproveMessage(msg.id, false)}
                        className={iconButtonClass}
                        title="Ocultar"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleApproveMessage(msg.id, true)}
                        className={iconButtonClass}
                        title="Aprobar"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className={iconButtonClass}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Creator Response Section */}
                <div className="mt-2 border-t border-white/10 pt-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-400">Tu respuesta:</label>
                    <textarea 
                      className="w-full min-h-24 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                      rows={2}
                      placeholder="Escribe una respuesta pública a este mensaje..."
                      defaultValue={msg.creatorResponse || ''}
                      onBlur={async (e) => {
                        const newResponse = e.target.value;
                        if (newResponse !== msg.creatorResponse) {
                          try {
                            await api.updateMessageResponse(msg.id, newResponse);
                            setMessages(messages.map(m => m.id === msg.id ? { ...m, creatorResponse: newResponse } : m));
                          } catch (error) {
                            console.error('Error updating response:', error);
                          }
                        }
                      }}
                    />
                    <p className="text-xs text-zinc-500">La respuesta se guardará automáticamente al salir del campo de texto.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
        );
      })()}

      {/* Campaign Modal */}
      <Modal 
        isOpen={isCampaignModalOpen} 
        onClose={() => { setIsCampaignModalOpen(false); setEditingCampaign(null); }}
        title={editingCampaign?.id ? 'Editar Misión' : 'Nueva Misión'}
      >
        <form onSubmit={handleSaveCampaign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Título</label>
            <input 
              type="text" 
              required
              value={editingCampaign?.title || ''}
              onChange={e => setEditingCampaign({ ...editingCampaign, title: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
            <textarea 
              required
              value={editingCampaign?.shortDescription || ''}
              onChange={e => setEditingCampaign({ ...editingCampaign, shortDescription: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Meta ($)</label>
              <input 
                type="number" 
                required
                value={editingCampaign?.targetAmount || ''}
                onChange={e => setEditingCampaign({ ...editingCampaign, targetAmount: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Recaudado ($)</label>
              <input 
                type="number" 
                value={editingCampaign?.currentAmount || 0}
                onChange={e => setEditingCampaign({ ...editingCampaign, currentAmount: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Product Modal */}
      <Modal 
        isOpen={isProductModalOpen} 
        onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
        title={editingProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Título</label>
            <input 
              type="text" 
              required
              value={editingProduct?.title || ''}
              onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
            <textarea 
              required
              value={editingProduct?.description || ''}
              onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Precio ($)</label>
              <input 
                type="number" 
                required
                value={editingProduct?.price || ''}
                onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría</label>
              <input 
                type="text" 
                required
                value={editingProduct?.category || ''}
                onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">URL de la Imagen</label>
            <input 
              type="text" 
              required
              value={editingProduct?.coverImage || ''}
              onChange={e => setEditingProduct({ ...editingProduct, coverImage: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Membership Modal */}
      <Modal 
        isOpen={isMembershipModalOpen} 
        onClose={() => { setIsMembershipModalOpen(false); setEditingMembership(null); }}
        title={editingMembership?.id ? 'Editar Membresía' : 'Nueva Membresía'}
      >
        <form onSubmit={handleSaveMembership} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre</label>
            <input 
              type="text" 
              required
              value={editingMembership?.name || ''}
              onChange={e => setEditingMembership({ ...editingMembership, name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
            <textarea 
              required
              value={editingMembership?.description || ''}
              onChange={e => setEditingMembership({ ...editingMembership, description: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Precio ($)</label>
              <input 
                type="number" 
                required
                value={editingMembership?.price || ''}
                onChange={e => setEditingMembership({ ...editingMembership, price: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Periodo</label>
              <select 
                value={editingMembership?.billingPeriod || 'monthly'}
                onChange={e => setEditingMembership({ ...editingMembership, billingPeriod: e.target.value as 'monthly' | 'yearly' })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              >
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsMembershipModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Idea Modal */}
      <Modal
        isOpen={isIdeaModalOpen}
        onClose={() => { setIsIdeaModalOpen(false); setEditingIdea(null); setIdeaTagsInput(''); }}
        title={editingIdea?.id ? 'Editar Idea' : 'Nueva Idea'}
      >
        <form onSubmit={handleSaveIdea} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Título</label>
            <input
              type="text"
              required
              value={editingIdea?.title || ''}
              onChange={e => setEditingIdea({ ...editingIdea, title: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              placeholder="Simulador de Fases Lunares"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
            <textarea
              required
              rows={3}
              value={editingIdea?.description || ''}
              onChange={e => setEditingIdea({ ...editingIdea, description: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white resize-none"
              placeholder="De qué va esta idea, por qué la hiciste, qué vas a encontrar si entrás..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">URL externa</label>
            <input
              type="url"
              required
              value={editingIdea?.url || ''}
              onChange={e => setEditingIdea({ ...editingIdea, url: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              placeholder="https://..."
            />
            <p className="text-xs text-zinc-500 mt-1">A dónde manda el click en la tarjeta (Vercel, ChatGPT share, Notion, etc.).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">URL de la imagen (opcional)</label>
            <input
              type="url"
              value={editingIdea?.coverImage || ''}
              onChange={e => setEditingIdea({ ...editingIdea, coverImage: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría</label>
              <input
                type="text"
                value={editingIdea?.category || ''}
                onChange={e => setEditingIdea({ ...editingIdea, category: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
                placeholder="Webapp, Investigación, Experimento..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Orden</label>
              <input
                type="number"
                value={editingIdea?.sortOrder ?? 0}
                onChange={e => setEditingIdea({ ...editingIdea, sortOrder: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Tags (separados por coma)</label>
            <input
              type="text"
              value={ideaTagsInput}
              onChange={e => setIdeaTagsInput(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              placeholder="astronomía, experimento, vercel"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={editingIdea?.active !== false}
                onChange={e => setEditingIdea({ ...editingIdea, active: e.target.checked })}
              />
              Visible en el sitio
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={Boolean(editingIdea?.featured)}
                onChange={e => setEditingIdea({ ...editingIdea, featured: e.target.checked })}
              />
              Destacada
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => { setIsIdeaModalOpen(false); setEditingIdea(null); setIdeaTagsInput(''); }} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl">Guardar</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
