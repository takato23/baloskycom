import React, { useEffect, useState } from 'react';
import { Check, Save } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { api } from '@/services/api';
import { SiteSettings } from '@/types';
import { THEME_OPTIONS } from '@/themes/registry';
import { cn } from '@/lib/utils';
import { normalizeSiteSettings } from '@/content/publicContent';

const inputClassName =
  'w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none';

const textareaClassName = `${inputClassName} resize-none`;

export default function AdminSettings() {
  const { settings: contextSettings, setTheme, refreshData } = useAppContext();
  const [formData, setFormData] = useState<SiteSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);

  useEffect(() => {
    if (contextSettings) {
      setFormData(normalizeSiteSettings(contextSettings));
    }
  }, [contextSettings]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.username) {
        setAdminUsername(payload.username);
      }
    } catch (error) {
      console.error('No se pudo leer el token admin actual', error);
    }
  }, []);

  if (!formData) return <div>Cargando configuración...</div>;

  const handleFieldChange = (
    field: keyof SiteSettings,
    value: string
  ) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleThemeSelect = (themeId: SiteSettings['defaultTheme']) => {
    setFormData((prev) => (prev ? { ...prev, defaultTheme: themeId } : null));
    setTheme(themeId);
  };

  const handleHeroChange = (
    field: keyof SiteSettings['content']['home']['hero'],
    value: string
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            content: {
              ...prev.content,
              home: {
                ...prev.content.home,
                hero: {
                  ...prev.content.home.hero,
                  [field]: value,
                },
              },
            },
          }
        : null
    );
  };

  const handleSupportModeChange = (
    index: number,
    field: keyof SiteSettings['content']['home']['supportModes'][number],
    value: string
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            content: {
              ...prev.content,
              home: {
                ...prev.content.home,
                supportModes: prev.content.home.supportModes.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, [field]: value } : item
                ),
              },
            },
          }
        : null
    );
  };

  const handleDiscoveryCardChange = (
    index: number,
    field: keyof SiteSettings['content']['home']['discoveryCards'][number],
    value: string
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            content: {
              ...prev.content,
              home: {
                ...prev.content.home,
                discoveryCards: prev.content.home.discoveryCards.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, [field]: value } : item
                ),
              },
            },
          }
        : null
    );
  };

  const handleSectionCopyChange = (
    field: keyof SiteSettings['content']['home']['sections'],
    value: string
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            content: {
              ...prev.content,
              home: {
                ...prev.content.home,
                sections: {
                  ...prev.content.home.sections,
                  [field]: value,
                },
              },
            },
          }
        : null
    );
  };

  const handleCheckoutCopyChange = (
    field: keyof SiteSettings['content']['checkout']['copy'],
    value: string
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            content: {
              ...prev.content,
              checkout: {
                copy: {
                  ...prev.content.checkout.copy,
                  [field]: value,
                },
              },
            },
          }
        : null
    );
  };

  const handlePortfolioCopyChange = (
    field: keyof SiteSettings['content']['portfolio']['copy'],
    value: string
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            content: {
              ...prev.content,
              portfolio: {
                copy: {
                  ...prev.content.portfolio.copy,
                  [field]: value,
                },
              },
            },
          }
        : null
    );
  };

  const handleVipCopyChange = (
    field: keyof SiteSettings['content']['vip']['copy'],
    value: string
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            content: {
              ...prev.content,
              vip: {
                copy: {
                  ...prev.content.vip.copy,
                  [field]: value,
                },
              },
            },
          }
        : null
    );
  };

  const handleSave = async () => {
    if (!formData) return;
    setIsSaving(true);
    setMessage('');
    try {
      const normalized = normalizeSiteSettings(formData);
      await api.updateSettings(normalized);
      setTheme(normalized.defaultTheme);
      await refreshData();
      setMessage('Configuración guardada correctamente');
    } catch (error) {
      console.error(error);
      setMessage('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAdminCredentials = async () => {
    setAdminMessage('');

    if (adminUsername.trim().length < 3) {
      setAdminMessage('Elegí un usuario admin de al menos 3 caracteres.');
      return;
    }

    if (adminPassword.length < 8) {
      setAdminMessage('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (adminPassword !== adminPasswordConfirm) {
      setAdminMessage('Las contraseñas nuevas no coinciden.');
      return;
    }

    setIsUpdatingAdmin(true);

    try {
      const response = await api.updateAdminCredentials(adminUsername.trim(), adminPassword);
      localStorage.setItem('admin_token', response.token);
      setAdminPassword('');
      setAdminPasswordConfirm('');
      setAdminMessage('Acceso admin actualizado correctamente');
    } catch (error) {
      console.error(error);
      setAdminMessage('No se pudo actualizar el acceso admin');
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Configuración del Sitio</h1>
          <p className="text-sm text-zinc-400 mt-2">
            Editás el contenido público desde formularios guiados. Los textos se comparten entre todos los templates.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium ${
            message.includes('Error')
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          {message}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Acceso Admin</h2>
          <p className="text-sm text-zinc-400">
            Desde acá podés rotar el usuario y la contraseña del panel. La contraseña actual no se muestra ni queda en texto plano.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Usuario admin</label>
            <input
              type="text"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Nueva contraseña</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className={inputClassName}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Repetir nueva contraseña</label>
            <input
              type="password"
              value={adminPasswordConfirm}
              onChange={(e) => setAdminPasswordConfirm(e.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {adminMessage && (
            <p className={cn(
              'text-sm font-medium',
              adminMessage.includes('correctamente') ? 'text-emerald-400' : 'text-red-400'
            )}>
              {adminMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleUpdateAdminCredentials}
            disabled={isUpdatingAdmin}
            className="px-4 py-2 bg-zinc-100 hover:bg-white text-black rounded-xl font-medium transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {isUpdatingAdmin ? 'Actualizando...' : 'Actualizar acceso admin'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Perfil Público</h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Nombre del Creador</label>
            <input
              type="text"
              value={formData.creatorName}
              onChange={(e) => handleFieldChange('creatorName', e.target.value)}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">URL de la Foto de Perfil</label>
            <input
              type="text"
              value={formData.creatorAvatar}
              onChange={(e) => handleFieldChange('creatorAvatar', e.target.value)}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-bold text-zinc-400">Biografía Corta</label>
            <textarea
              value={formData.creatorBio}
              onChange={(e) => handleFieldChange('creatorBio', e.target.value)}
              rows={3}
              className={textareaClassName}
            />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Templates del Sitio</h2>
          <p className="text-sm text-zinc-400">
            Cambiás el diseño sin tocar la copy. Los textos que editás abajo se usan en todos los templates.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {THEME_OPTIONS.map((themeOption) => {
            const isActive = formData.defaultTheme === themeOption.id;

            return (
              <button
                key={themeOption.id}
                type="button"
                onClick={() => handleThemeSelect(themeOption.id)}
                className={cn(
                  'text-left rounded-2xl border p-4 transition-all',
                  isActive
                    ? 'border-violet-400 bg-violet-500/10 shadow-[0_0_0_1px_rgba(167,139,250,0.45)]'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'
                )}
              >
                <div
                  className="h-28 rounded-xl border border-white/10"
                  style={{ background: themeOption.preview }}
                />
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white font-bold">{themeOption.name}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-500 mt-1">
                      {themeOption.shortLabel}
                    </p>
                  </div>
                  {isActive && (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-500 text-white">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{themeOption.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-8">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Home</h2>
          <p className="text-sm text-zinc-400">
            Estos bloques se comparten entre todas las variantes de la portada.
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white">Hero</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400">Eyebrow</label>
              <input
                type="text"
                value={formData.content.home.hero.eyebrow}
                onChange={(e) => handleHeroChange('eyebrow', e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-bold text-zinc-400">Título</label>
              <textarea
                value={formData.content.home.hero.title}
                onChange={(e) => handleHeroChange('title', e.target.value)}
                rows={3}
                className={textareaClassName}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-bold text-zinc-400">Subtítulo</label>
              <textarea
                value={formData.content.home.hero.subtitle}
                onChange={(e) => handleHeroChange('subtitle', e.target.value)}
                rows={3}
                className={textareaClassName}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400">CTA principal</label>
              <input
                type="text"
                value={formData.content.home.hero.primaryCtaLabel}
                onChange={(e) => handleHeroChange('primaryCtaLabel', e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400">Link CTA principal</label>
              <input
                type="text"
                value={formData.content.home.hero.primaryCtaHref}
                onChange={(e) => handleHeroChange('primaryCtaHref', e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400">CTA secundario</label>
              <input
                type="text"
                value={formData.content.home.hero.secondaryCtaLabel}
                onChange={(e) => handleHeroChange('secondaryCtaLabel', e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400">Link CTA secundario</label>
              <input
                type="text"
                value={formData.content.home.hero.secondaryCtaHref}
                onChange={(e) => handleHeroChange('secondaryCtaHref', e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white">Formas de bancar</h3>
          <div className="grid gap-6">
            {formData.content.home.supportModes.map((mode, index) => (
              <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 grid gap-4">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Card {index + 1}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={mode.eyebrow}
                    onChange={(e) => handleSupportModeChange(index, 'eyebrow', e.target.value)}
                    placeholder="Eyebrow"
                    className={inputClassName}
                  />
                  <input
                    type="text"
                    value={mode.title}
                    onChange={(e) => handleSupportModeChange(index, 'title', e.target.value)}
                    placeholder="Título"
                    className={inputClassName}
                  />
                  <div className="sm:col-span-2">
                    <textarea
                      value={mode.description}
                      onChange={(e) => handleSupportModeChange(index, 'description', e.target.value)}
                      rows={3}
                      placeholder="Descripción"
                      className={textareaClassName}
                    />
                  </div>
                  <input
                    type="text"
                    value={mode.ctaLabel}
                    onChange={(e) => handleSupportModeChange(index, 'ctaLabel', e.target.value)}
                    placeholder="Texto del botón"
                    className={inputClassName}
                  />
                  <input
                    type="text"
                    value={mode.href}
                    onChange={(e) => handleSupportModeChange(index, 'href', e.target.value)}
                    placeholder="/checkout"
                    className={inputClassName}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white">Cards para seguir chusmeando</h3>
          <div className="grid gap-6">
            {formData.content.home.discoveryCards.map((card, index) => (
              <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 grid gap-4">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Card {index + 1}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={card.title}
                    onChange={(e) => handleDiscoveryCardChange(index, 'title', e.target.value)}
                    placeholder="Título"
                    className={inputClassName}
                  />
                  <input
                    type="text"
                    value={card.href}
                    onChange={(e) => handleDiscoveryCardChange(index, 'href', e.target.value)}
                    placeholder="/wall"
                    className={inputClassName}
                  />
                  <div className="sm:col-span-2">
                    <textarea
                      value={card.description}
                      onChange={(e) => handleDiscoveryCardChange(index, 'description', e.target.value)}
                      rows={3}
                      placeholder="Descripción"
                      className={textareaClassName}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white">Labels de secciones</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['supportEyebrow', 'Eyebrow bloque de apoyo'],
                ['supportTitle', 'Título bloque de apoyo'],
                ['supportSubtitle', 'Texto bloque de apoyo'],
                ['rewardsEyebrow', 'Eyebrow recompensas'],
                ['rewardsTitle', 'Título recompensas'],
                ['rewardsSubtitle', 'Texto recompensas'],
                ['discoveryEyebrow', 'Eyebrow descubrimiento'],
                ['discoveryTitle', 'Título descubrimiento'],
                ['discoverySubtitle', 'Texto descubrimiento'],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className={cn('space-y-2', field.includes('Subtitle') && 'sm:col-span-2')}>
                <label className="text-sm font-bold text-zinc-400">{label}</label>
                {field.includes('Subtitle') ? (
                  <textarea
                    value={formData.content.home.sections[field]}
                    onChange={(e) => handleSectionCopyChange(field, e.target.value)}
                    rows={3}
                    className={textareaClassName}
                  />
                ) : (
                  <input
                    type="text"
                    value={formData.content.home.sections[field]}
                    onChange={(e) => handleSectionCopyChange(field, e.target.value)}
                    className={inputClassName}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Checkout</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Título</label>
            <input
              type="text"
              value={formData.content.checkout.copy.title}
              onChange={(e) => handleCheckoutCopyChange('title', e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-bold text-zinc-400">Subtítulo</label>
            <textarea
              value={formData.content.checkout.copy.subtitle}
              onChange={(e) => handleCheckoutCopyChange('subtitle', e.target.value)}
              rows={3}
              className={textareaClassName}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-bold text-zinc-400">Título del encargo</label>
            <input
              type="text"
              value={formData.content.checkout.copy.encargoTitle}
              onChange={(e) => handleCheckoutCopyChange('encargoTitle', e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-bold text-zinc-400">Descripción del encargo</label>
            <textarea
              value={formData.content.checkout.copy.encargoDescription}
              onChange={(e) => handleCheckoutCopyChange('encargoDescription', e.target.value)}
              rows={3}
              className={textareaClassName}
            />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Portfolio</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Título principal</label>
            <input
              type="text"
              value={formData.content.portfolio.copy.heroTitle}
              onChange={(e) => handlePortfolioCopyChange('heroTitle', e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-bold text-zinc-400">Subtítulo</label>
            <textarea
              value={formData.content.portfolio.copy.heroSubtitle}
              onChange={(e) => handlePortfolioCopyChange('heroSubtitle', e.target.value)}
              rows={3}
              className={textareaClassName}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Título del CTA final</label>
            <input
              type="text"
              value={formData.content.portfolio.copy.ctaTitle}
              onChange={(e) => handlePortfolioCopyChange('ctaTitle', e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Botón del CTA final</label>
            <input
              type="text"
              value={formData.content.portfolio.copy.ctaButton}
              onChange={(e) => handlePortfolioCopyChange('ctaButton', e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-bold text-zinc-400">Texto del CTA final</label>
            <textarea
              value={formData.content.portfolio.copy.ctaBody}
              onChange={(e) => handlePortfolioCopyChange('ctaBody', e.target.value)}
              rows={3}
              className={textareaClassName}
            />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Feed exclusivo</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Título</label>
            <input
              type="text"
              value={formData.content.vip.copy.title}
              onChange={(e) => handleVipCopyChange('title', e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-bold text-zinc-400">Subtítulo</label>
            <textarea
              value={formData.content.vip.copy.subtitle}
              onChange={(e) => handleVipCopyChange('subtitle', e.target.value)}
              rows={3}
              className={textareaClassName}
            />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Integraciones</h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-bold text-zinc-400">Discord Webhook URL (Notificaciones de aportes)</label>
            <input
              type="text"
              value={formData.discordWebhookUrl || ''}
              onChange={(e) => handleFieldChange('discordWebhookUrl', e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className={inputClassName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
