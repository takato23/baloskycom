import React, { useState, useEffect } from 'react';
import { Check, Save } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { api } from '@/services/api';
import { SiteSettings } from '@/types';
import { THEME_OPTIONS } from '@/themes/registry';
import { cn } from '@/lib/utils';

export default function AdminSettings() {
  const { settings: contextSettings, setTheme, refreshData } = useAppContext();
  const [formData, setFormData] = useState<SiteSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (contextSettings) {
      setFormData(contextSettings);
    }
  }, [contextSettings]);

  if (!formData) return <div>Cargando configuración...</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSave = async () => {
    if (!formData) return;
    setIsSaving(true);
    setMessage('');
    try {
      await api.updateSettings(formData);
      setTheme(formData.defaultTheme);
      await refreshData();
      setMessage('Configuración guardada correctamente');
    } catch (error) {
      console.error(error);
      setMessage('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeSelect = (themeId: SiteSettings['defaultTheme']) => {
    setFormData(prev => prev ? { ...prev, defaultTheme: themeId } : null);
    setTheme(themeId);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-white">Configuración del Sitio</h1>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
          {message}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Perfil Público</h2>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Nombre del Creador</label>
            <input 
              type="text" 
              name="creatorName"
              value={formData.creatorName}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">URL de la Foto de Perfil</label>
            <input 
              type="text" 
              name="creatorAvatar"
              value={formData.creatorAvatar}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-bold text-zinc-400">Biografía Corta</label>
            <textarea 
              name="creatorBio"
              value={formData.creatorBio}
              onChange={handleChange}
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Textos de la Home</h2>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Título Principal (Hero)</label>
            <input 
              type="text" 
              name="heroTitle"
              value={formData.heroTitle}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Texto del Botón Principal</label>
            <input 
              type="text" 
              name="primaryCTA"
              value={formData.primaryCTA}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Templates del Sitio</h2>
          <p className="text-sm text-zinc-400">
            Elegís uno y cambia la portada junto con el shell público del sitio. Sirve para rotar la estética sin rehacer la web.
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
                  "text-left rounded-2xl border p-4 transition-all",
                  isActive
                    ? "border-violet-400 bg-violet-500/10 shadow-[0_0_0_1px_rgba(167,139,250,0.45)]"
                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
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

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-4">Integraciones</h2>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-bold text-zinc-400">Discord Webhook URL (Notificaciones de aportes)</label>
            <input 
              type="text" 
              name="discordWebhookUrl"
              value={formData.discordWebhookUrl || ''}
              onChange={handleChange}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
