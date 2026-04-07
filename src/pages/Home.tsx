import React, { Suspense } from 'react';
import { useAppContext } from '@/context/AppContext';
import { HOME_THEME_COMPONENTS } from '@/themes/registry';

export default function Home() {
  const { theme } = useAppContext();
  const ActiveHome = HOME_THEME_COMPONENTS[theme] ?? HOME_THEME_COMPONENTS.brutalist;

  return (
    <Suspense fallback={<div className="min-h-[60vh] bg-[#f5f0e8]" />}>
      <ActiveHome />
    </Suspense>
  );
}
