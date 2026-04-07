export interface FanTier {
  id: string;
  name: string;
  minAmount: number;
  benefits: string[];
  color: string;
}

export const FAN_TIERS: FanTier[] = [
  {
    id: 'amigo',
    name: 'Amigo',
    minAmount: 1000,
    benefits: ['Insignia de Amigo en el perfil', 'Acceso al Feed del Creador'],
    color: 'bg-yellow-300'
  },
  {
    id: 'colaborador',
    name: 'Colaborador',
    minAmount: 5000,
    benefits: ['Insignia de Colaborador', 'Acceso anticipado a contenido', 'Voto doble en encuestas'],
    color: 'bg-[#00FF00]'
  },
  {
    id: 'mecenas',
    name: 'Mecenas',
    minAmount: 25000,
    benefits: ['Insignia de Mecenas Supremo', 'Mención especial en videos', 'Chat directo (próximamente)'],
    color: 'bg-[#FF00FF]'
  }
];

export const getUserTier = (totalContributed: number): FanTier | null => {
  // Find the highest tier the user qualifies for
  let currentTier: FanTier | null = null;
  for (const tier of FAN_TIERS) {
    if (totalContributed >= tier.minAmount) {
      currentTier = tier;
    }
  }
  return currentTier;
};
