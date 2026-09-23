import logger from '../utils/logger';
import { scoutAgent } from './marketplace-scout';
import { b2bAgent } from './b2b-outreach';

/**
 * Agent Orchestrator
 * Runs autonomous agents on scheduled intervals
 * Inspired by: https://eco.com/support/en/articles/14839402-x402-protocol-explained
 */

export class AgentOrchestrator {
  private intervals: NodeJS.Timeout[] = [];

  start() {
    logger.info('🤖 Starting Agent Orchestrator...');

    // Scout Agent: Run every 6 hours
    const scoutInterval = setInterval(async () => {
      logger.info('⏰ Running Scout Agent campaign...');
      await scoutAgent.runScoutingCampaign();
    }, 6 * 60 * 60 * 1000); // 6 hours

    this.intervals.push(scoutInterval);

    // B2B Agent: Run every 24 hours
    const b2bInterval = setInterval(async () => {
      logger.info('⏰ Running B2B Outreach campaign...');
      await b2bAgent.runB2BCampaign();
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.intervals.push(b2bInterval);

    logger.success('✅ Agent Orchestrator started. Agents will run autonomously.');
  }

  stop() {
    logger.info('Stopping Agent Orchestrator...');
    this.intervals.forEach(clearInterval);
    this.intervals = [];
  }
}

export const orchestrator = new AgentOrchestrator();
