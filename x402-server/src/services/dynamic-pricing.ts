import logger from '../utils/logger';

/**
 * Dynamic Pricing Engine
 * Adjusts dataset prices based on real-time bounty demand (Supply & Demand).
 */

interface DemandSignal {
  tag: string;
  activeBounties: number;
  basePrice: number;
}

const demandSignals: DemandSignal[] = [
  { tag: 'soldering', activeBounties: 3, basePrice: 0.50 },
  { tag: 'low-light', activeBounties: 5, basePrice: 1.50 },
  { tag: 'medical', activeBounties: 1, basePrice: 2.00 },
];

export const dynamicPricingService = {
  calculatePrice: (tags: string[], basePrice: number): number => {
    let multiplier = 1.0;

    for (const tag of tags) {
      const signal = demandSignals.find(d => d.tag === tag || tag.includes(d.tag));
      if (signal && signal.activeBounties > 2) {
        // High demand: increase price by 20% per extra bounty
        const demandPremium = (signal.activeBounties - 2) * 0.20;
        multiplier += demandPremium;
        logger.info(`Dynamic pricing: ${tag} demand premium applied`, { multiplier });
      }
    }

    const finalPrice = basePrice * multiplier;
    logger.info(`Calculated dynamic price`, { basePrice, finalPrice, multiplier });
    return parseFloat(finalPrice.toFixed(2));
  },

  updateDemand: (tag: string, bountyCount: number) => {
    const signal = demandSignals.find(d => d.tag === tag);
    if (signal) {
      signal.activeBounties = bountyCount;
      logger.info(`Demand signal updated for ${tag}`, { bountyCount });
    }
  }
};
