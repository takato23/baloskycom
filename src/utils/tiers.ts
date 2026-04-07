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
    benefits: ['Tu perfil pasa al nivel Amigo', 'Desbloqueás publicaciones para aportantes desde este monto'],
    color: 'bg-yellow-300'
  },
  {
    id: 'colaborador',
    name: 'Colaborador',
    minAmount: 5000,
    benefits: ['Tu perfil pasa al nivel Colaborador', 'Desbloqueás publicaciones y recursos marcados desde este monto'],
    color: 'bg-[#00FF00]'
  },
  {
    id: 'mecenas',
    name: 'Mecenas',
    minAmount: 25000,
    benefits: ['Tu perfil pasa al nivel Mecenas', 'Desbloqueás todo el contenido bloqueado cargado en la plataforma'],
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
