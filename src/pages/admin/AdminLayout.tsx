import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Camera,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Film,
  Image,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquare,
  Music,
  Package,
  Search,
  Settings,
  Share2,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminNativeCursor } from '@/hooks/useAdminNativeCursor';
import { api } from '@/services/api';

type AdminNavItem = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  end?: boolean;
};

type QuickJumpItem = AdminNavItem & {
  detail: string;
};

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Resumen', description: 'Estado general', end: true },
  { to: '/admin/campaigns', icon: Target, label: 'Misiones', description: 'Campañas y objetivos' },
  { to: '/admin/products', icon: Package, label: 'Productos', description: 'Compras y entregables' },
  { to: '/admin/memberships', icon: Users, label: 'Membresías', description: 'Club y accesos' },
  { to: '/admin/encargos', icon: Lightbulb, label: 'Pre-pedidos', description: 'Leads y cotizaciones' },
  { to: '/admin/analytics', icon: ChartNoAxesColumnIncreasing, label: 'Analytics', description: 'Tráfico y conversiones' },
  { to: '/admin/ideas', icon: Search, label: 'Ideas públicas', description: 'Contenido accionable' },
  { to: '/admin/media', icon: Film, label: 'Laboratorio', description: 'Videos, fotos, 360 y música' },
  { to: '/admin/messages', icon: MessageSquare, label: 'Mensajes', description: 'Muro y comunidad' },
  { to: '/admin/settings', icon: Settings, label: 'Ajustes', description: 'Identidad y acceso' },
];

const mediaItems = [
  { to: '/admin/media/videos', icon: Film, label: 'Videos IA' },
  { to: '/admin/media/panoramas', icon: Sparkles, label: 'Panoramas 360' },
  { to: '/admin/media/fotos', icon: Camera, label: 'Fotos' },
  { to: '/admin/media/wallpapers', icon: Image, label: 'Wallpapers' },
  { to: '/admin/media/canciones', icon: Music, label: 'Canciones' },
  { to: '/admin/media/socials', icon: Share2, label: 'Redes' },
  { to: '/admin/media/newsletter', icon: MessageSquare, label: 'Newsletter' },
] satisfies AdminNavItem[];

const mobilePrimaryItems = [
  navItems[0],
  navItems[4],
  navItems[5],
  navItems[7],
];

const quickJumpItems = [
  { to: '/admin/encargos', icon: Lightbulb, label: 'Ver pre-pedidos', detail: 'Responder y cotizar' },
  { to: '/admin/analytics', icon: ChartNoAxesColumnIncreasing, label: 'Ver analytics', detail: 'Tráfico y pagos' },
  { to: '/admin/media/videos', icon: Film, label: 'Subir video IA', detail: 'Ir directo a videos' },
  { to: '/admin/media/canciones', icon: Music, label: 'Cargar canción', detail: 'Audio, embeds y portada' },
  { to: '/admin/settings', icon: Settings, label: 'Editar home', detail: 'Textos, redes y acceso' },
] satisfies QuickJumpItem[];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');

  useAdminNativeCursor();

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login', { replace: true });
      setIsCheckingAuth(false);
      return;
    }

    api.getCurrentAdmin()
      .then(() => {
        if (mounted) setIsAuthenticated(true);
      })
      .catch(() => {
        if (!mounted) return;
        setIsAuthenticated(false);
        navigate('/admin/login?expired=1', { replace: true });
      })
      .finally(() => {
        if (mounted) setIsCheckingAuth(false);
      });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    const handleInvalidAuth = () => {
      setIsAuthenticated(false);
      navigate('/admin/login?expired=1', { replace: true });
    };

    window.addEventListener('admin-auth-invalid', handleInvalidAuth);
    return () => window.removeEventListener('admin-auth-invalid', handleInvalidAuth);
  }, [navigate]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  if (isCheckingAuth || !isAuthenticated) return null;

  const currentItem =
    [...mediaItems, ...navItems]
      .filter((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
      .sort((a, b) => b.to.length - a.to.length)[0] || navItems[0];

  const normalizedQuery = navQuery.trim().toLowerCase();
  const matchesQuery = (item: AdminNavItem) => {
    if (!normalizedQuery) return true;
    return `${item.label} ${item.description || ''}`.toLowerCase().includes(normalizedQuery);
  };
  const visibleNavItems = navItems.filter(matchesQuery);
  const visibleMediaItems = mediaItems.filter(matchesQuery);

  const renderNavLink = (item: AdminNavItem, compact = false) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => cn(
        'group flex min-w-0 items-center gap-3 rounded-[18px] px-3 py-2.5 transition-all active:scale-[0.99]',
        isActive
          ? 'bg-[#f26a3d] !text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_34px_rgba(242,106,61,0.18)]'
          : 'text-stone-500 hover:bg-stone-100 hover:text-stone-950'
      )}
    >
      <span className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-[14px] border transition-colors',
        compact ? 'h-8 w-8' : '',
        'border-stone-200 bg-white group-[.active]:border-zinc-950/15 group-[.active]:bg-zinc-950/10'
      )}>
        <item.icon className={cn('h-4 w-4', compact ? 'h-3.5 w-3.5' : '')} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black leading-tight">{item.label}</span>
        {!compact && 'description' in item && (
          <span className="mt-0.5 block truncate text-[11px] font-medium leading-tight opacity-60">
            {item.description}
          </span>
        )}
      </span>
      {!compact && (
        <ChevronRight className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-[.active]:opacity-70 group-hover:opacity-50" />
      )}
    </NavLink>
  );

  const searchControl = (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        value={navQuery}
        onChange={(event) => setNavQuery(event.target.value)}
        placeholder="Buscar sección..."
        className="h-11 w-full rounded-[16px] border border-stone-200 bg-white pl-10 pr-3 text-sm font-bold text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-[#f26a3d]/60"
      />
    </label>
  );

  return (
    <div className="admin-friendly min-h-screen bg-[#f5efe4] text-stone-950">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#fffaf2]/92 px-3 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-stone-200 bg-white text-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            aria-label="Abrir menú admin"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">Balosky admin</p>
            <h1 className="truncate text-lg font-black tracking-[-0.04em] text-stone-950">{currentItem.label}</h1>
          </div>
          <a
            href="/"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-stone-200 bg-white text-stone-600"
            aria-label="Ver sitio"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Cerrar menú admin"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(380px,92vw)] flex-col border-r border-stone-200 bg-[#fffaf2] shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#f26a3d]">Panel privado</p>
                <h2 className="text-2xl font-black tracking-[-0.06em] text-stone-950">Balosky</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-[16px] border border-stone-200 text-stone-600"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <div className="px-1 pb-4">{searchControl}</div>
              <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">Operación</p>
              <div className="space-y-1">{visibleNavItems.map((item) => renderNavLink(item))}</div>
              <p className="px-3 pb-2 pt-6 text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">Carga rápida</p>
              <div className="grid grid-cols-2 gap-2">
                {visibleMediaItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => cn(
                      'flex min-h-20 flex-col justify-between rounded-[18px] border p-3 text-sm font-black transition-colors active:scale-[0.99]',
                      isActive ? 'border-[#f26a3d] bg-[#f26a3d] !text-zinc-950' : 'border-stone-200 bg-white text-stone-800'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
              {!visibleNavItems.length && !visibleMediaItems.length && (
                <p className="px-3 py-6 text-sm font-medium text-zinc-500">No encontré esa sección.</p>
              )}
            </nav>
            <div className="border-t border-stone-200 p-3">
              <button
                onClick={handleLogout}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-red-500/10 font-black text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1480px] gap-6 px-3 pb-28 pt-4 sm:px-5 lg:px-6 lg:pb-10 lg:pt-6">
        <aside className="sticky top-6 hidden h-[calc(100svh-48px)] w-[304px] shrink-0 flex-col rounded-[26px] border border-stone-200 bg-[#fffaf2]/92 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_24px_80px_rgba(64,49,32,0.12)] backdrop-blur-xl lg:flex">
          <div className="px-3 pb-5 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#f26a3d]">Panel privado</p>
                <h2 className="mt-1 text-3xl font-black tracking-[-0.07em] text-stone-950">Balosky</h2>
              </div>
              <a
                href="/"
                className="grid h-10 w-10 place-items-center rounded-[16px] border border-stone-200 bg-white text-stone-500 transition-colors hover:border-[#f26a3d]/40 hover:text-stone-950"
                title="Ver sitio"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-4 rounded-[18px] border border-stone-200 bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-500">
                <CircleDot className="h-3.5 w-3.5 text-emerald-400" />
                Modo edición
              </div>
              <p className="mt-1 text-sm font-black text-stone-950">Contenido, pagos y laboratorio</p>
            </div>
          </div>

          <div className="px-2 pb-4">{searchControl}</div>

          <div className="grid grid-cols-1 gap-2 px-2 pb-4">
            {quickJumpItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="group flex items-center gap-3 rounded-[18px] border border-stone-200 bg-white px-3 py-3 text-left transition-colors hover:border-[#f26a3d]/35 hover:bg-[#fff3e9]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[#f26a3d] text-zinc-950">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-stone-950">{item.label}</span>
                  <span className="block truncate text-[11px] font-semibold text-stone-500">{item.detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-[#f26a3d]" />
              </NavLink>
            ))}
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
            <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">Operación</p>
            <div className="space-y-1">{visibleNavItems.map((item) => renderNavLink(item))}</div>
            <p className="px-3 pb-2 pt-6 text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">Laboratorio</p>
            <div className="grid grid-cols-1 gap-1">
              {visibleMediaItems.map((item) => renderNavLink(item, true))}
            </div>
            {!visibleNavItems.length && !visibleMediaItems.length && (
              <p className="px-3 py-5 text-sm font-medium text-zinc-500">No encontré esa sección.</p>
            )}
          </nav>

          <div className="border-t border-stone-200 pt-3">
            <button
              onClick={handleLogout}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-red-400/20 bg-red-500/10 font-black text-red-300 transition-colors hover:bg-red-500/15 active:scale-[0.99]"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="hidden items-center justify-between pb-5 lg:flex">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f26a3d]">Admin</p>
              <h1 className="truncate text-4xl font-black tracking-[-0.07em] text-stone-950">{currentItem.label}</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-500">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Sesión activa
            </div>
          </div>
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-[#fffaf2]/94 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {mobilePrimaryItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-[16px] text-[10px] font-black transition-colors active:scale-[0.98]',
                isActive ? 'bg-[#f26a3d] !text-zinc-950' : 'text-stone-500'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
