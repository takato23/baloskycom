import React, { lazy } from 'react';
import type { ThemeId } from '@/types';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  shortLabel: string;
  description: string;
  preview: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'brutalist',
    name: 'Brutalista',
    shortLabel: 'BOLD',
    description: 'Tipografía agresiva, bloques marcados y una energía muy de cartel.',
    preview: 'linear-gradient(135deg, #00ff00 0%, #f5f0e8 55%, #ff00ff 100%)',
  },
  {
    id: 'minimal',
    name: 'Minimalista',
    shortLabel: 'CALM',
    description: 'Editorial, limpio y más premium para portfolio y campañas serias.',
    preview: 'linear-gradient(135deg, #f7f4ee 0%, #e8dfd1 50%, #c9b69e 100%)',
  },
  {
    id: 'atmospheric',
    name: 'Atmosférico',
    shortLabel: 'SOFT',
    description: 'Nebulosas, blur y una sensación más artística e inmersiva.',
    preview: 'linear-gradient(135deg, #090914 0%, #24143f 50%, #3c6dd9 100%)',
  },
  {
    id: 'cybergrid',
    name: 'Cyber Grid',
    shortLabel: 'NEON',
    description: 'Futurista, neón y más gamer-tech para mostrar experimentación.',
    preview: 'linear-gradient(135deg, #0f172a 0%, #0c4a6e 45%, #ec4899 100%)',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    shortLabel: 'CLI',
    description: 'Modo consola, monocromo y muy internet old-school.',
    preview: 'linear-gradient(135deg, #020202 0%, #071907 55%, #00ff00 100%)',
  },
];

export const HOME_THEME_COMPONENTS: Record<ThemeId, React.LazyExoticComponent<React.ComponentType>> = {
  brutalist: lazy(() => import('@/pages/themes/HomeBrutalist')),
  minimal: lazy(() => import('@/pages/themes/HomeMinimal')),
  atmospheric: lazy(() => import('@/pages/themes/HomeAtmospheric')),
  cybergrid: lazy(() => import('@/pages/themes/HomeCyberGrid')),
  terminal: lazy(() => import('../pages/themes/HomeTerminal')),
};

export const getThemeOption = (themeId: ThemeId) =>
  THEME_OPTIONS.find((theme) => theme.id === themeId) ?? THEME_OPTIONS[0];
