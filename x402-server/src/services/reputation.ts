import logger from '../utils/logger';

/**
 * Agent Reputation Service
 * Tracks trust scores for data collectors and buyers based on on-chain history.
 */

interface ReputationRecord {
  address: string;
  trustScore: number; // 0-100
  totalTransactions: number;
  successfulDeliveries: number;
  disputes: number;
  lastUpdated: number;
}

const mockReputationDB = new Map<string, ReputationRecord>();

export const reputationService = {
  getScore: (address: string): number => {
    const record = mockReputationDB.get(address.toLowerCase());
    return record ? record.trustScore : 100; // Default to 100 for new agents
  },

  recordTransaction: (agentAddress: string, success: boolean) => {
    const addr = agentAddress.toLowerCase();
    const current = mockReputationDB.get(addr) || {
      address: addr,
      trustScore: 100,
      totalTransactions: 0,
      successfulDeliveries: 0,
      disputes: 0,
      lastUpdated: Date.now(),
    };

    current.totalTransactions += 1;
    if (success) {
      current.successfulDeliveries += 1;
      // Boost score slightly for good behavior, capped at 100
      current.trustScore = Math.min(100, current.trustScore + 2);
    } else {
      current.disputes += 1;
      // Penalize heavily for bad data or failed delivery
      current.trustScore = Math.max(0, current.trustScore - 15);
    }
    current.lastUpdated = Date.now();
    
    mockReputationDB.set(addr, current);
    logger.info(`Reputation updated for ${addr}`, { score: current.trustScore });
  },

  isTrusted: (address: string, minScore: number = 70): boolean => {
    return this.getScore(address) >= minScore;
  }
};
