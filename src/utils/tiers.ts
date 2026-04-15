export interface FanTier {
  id: string;
  name: string;
  minAmount: number;
  benefits: string[];
  color: string;
}

export const FAN_TIERS: FanTier[] = [
  {
    id: 'morerial',
    name: 'Morerial',
    minAmount: 1000,
    benefits: ['Entrás al ecosistema', 'Desbloqueás los packs de entrada y las publicaciones para aportantes'],
    color: 'bg-yellow-300'
  },
  {
    id: 'complice',
    name: 'Cómplice',
    minAmount: 5000,
    benefits: ['Sos cómplice oficial', 'Te llevás los packs completos y los recursos marcados'],
    color: 'bg-[#00FF00]'
  },
  {
    id: 'mesaza',
    name: 'Mesaza',
    minAmount: 25000,
    benefits: ['Sos Mesaza', 'Te llevás todo lo que hay subido, más mención personal'],
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
