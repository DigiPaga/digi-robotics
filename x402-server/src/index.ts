import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { purchaseRouter } from './routes/purchase';
import { bountyRouter } from './routes/bounties';
import { submissionRouter } from './routes/submissions';
import { hardwareRouter } from './routes/hardware';
import { orchestrator } from './agents/orchestrator';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'DigiRobotics x402 Backend with Autonomous Agents & Hardware Marketplace',
    timestamp: new Date().toISOString(),
  });
});

// Agent control endpoints
app.post('/api/agents/scout/run', async (req, res) => {
  const { scoutAgent } = await import('./agents/marketplace-scout');
  await scoutAgent.runScoutingCampaign();
  res.json({ success: true, message: 'Scout campaign completed' });
});

app.post('/api/agents/b2b/run', async (req, res) => {
  const { b2bAgent } = await import('./agents/b2b-outreach');
  await b2bAgent.runB2BCampaign();
  res.json({ success: true, message: 'B2B campaign completed' });
});

// Application Routes
app.use('/api/purchase', purchaseRouter);
app.use('/api/bounties', bountyRouter);
app.use('/api/submissions', submissionRouter);
app.use('/api/hardware', hardwareRouter); // NEW: Hardware marketplace

app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`x402 Server listening on port ${PORT}`);
  logger.info(`📊 Health: http://localhost:${PORT}/health`);
  logger.info(`🛠️ Hardware: http://localhost:${PORT}/api/hardware`);
  orchestrator.start();
});

export default app;
