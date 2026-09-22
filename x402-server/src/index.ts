import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { assetRouter } from './routes/assets';
import { catalogRouter } from './routes/catalog';
import { verifyRouter } from './routes/verify';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'DigiPaga x402 Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/assets', assetRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/verify', verifyRouter);

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 x402 Server running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
});

export default app;
