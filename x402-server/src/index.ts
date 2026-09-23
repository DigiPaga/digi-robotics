import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { catalogRouter } from './routes/catalog';
import { purchaseRouter } from './routes/purchase';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DigiRobotics x402 Backend is running', timestamp: new Date().toISOString() });
});

// Rutas de la aplicación
app.use('/api/catalog', catalogRouter);
app.use('/api/purchase', purchaseRouter);

app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`x402 Server listening on port ${PORT}`);
});

export default app;
