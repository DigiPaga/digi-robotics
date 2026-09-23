import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { purchaseRouter } from './routes/purchase';
import { bountyRouter } from './routes/bounties';
import { submissionRouter } from './routes/submissions';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DigiRobotics Dual-Rail Backend is running', timestamp: new Date().toISOString() });
});

// Rutas de la aplicación
app.use('/api/purchase', purchaseRouter);
app.use('/api/bounties', bountyRouter);         // Flujo Pro: Robot Builders
app.use('/api/submissions', submissionRouter);   // Flujo Retail: Data Collectors

app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`x402 Server listening on port ${PORT}`);
  logger.info(`📊 Health: http://localhost:${PORT}/health`);
  logger.info(`📥 Submissions: http://localhost:${PORT}/api/submissions`);
  logger.info(`📤 Bounties: http://localhost:${PORT}/api/bounties`);
});

export default app;
