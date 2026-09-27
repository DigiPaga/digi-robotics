import dotenv from 'dotenv';
dotenv.config(); // THIS MUST BE THE VERY FIRST LINE

import express from 'express';
import cors from 'cors';

// Import the bot AFTER the environment variables are loaded
import './telegramBot';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: 'DigiRobotics x402 Server & Telegram Bot are running!',
    status: 'healthy'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
  console.log('🤖 Telegram Bot is listening for messages...\n');
});
