import dotenv from 'dotenv';
dotenv.config();

import { Telegraf } from 'telegraf';
import { PinataSDK } from 'pinata-web3';
import { mkdir, readFile } from 'fs/promises';
import { existsSync, createWriteStream, unlinkSync } from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud'
});

const uploadsDir = path.join(__dirname, '../uploads');
if (!existsSync(uploadsDir)) {
  mkdir(uploadsDir, { recursive: true });
}

bot.start((ctx) => {
  ctx.reply(
    '🤖 *Welcome to DigiRobotics Capture Bot!*\n\n' +
    'Send me your egocentric videos to contribute to robotics training.\n\n' +
    '📹 Supported: MP4, WebM\n' +
    '💰 You will be paid in USDG/PYUSD after approval.\n\n' +
    'Start recording and send your video now!'
  );
});

bot.on('video', async (ctx) => {
  const videoId = ctx.message.video.file_id;
  ctx.reply(' Receiving video...');
  
  try {
    const file = await ctx.telegram.getFile(videoId);
    if (!file || !file.file_path) throw new Error('File not found');
    
    const fileName = `${Date.now()}_${videoId}.mp4`;
    const localPath = path.join(uploadsDir, fileName);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const protocol = fileUrl.startsWith('https') ? https : http;
    
    await new Promise((resolve, reject) => {
      const fileStream = createWriteStream(localPath);
      protocol.get(fileUrl, (response) => {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(true);
        });
      }).on('error', (err) => {
        unlinkSync(localPath);
        reject(err);
      });
    });

    ctx.reply('📤 Uploading to IPFS...');
    const fileBuffer = await readFile(localPath);
    const uploadFile = new File([new Uint8Array(fileBuffer)], fileName, { type: 'video/mp4' });
    const upload = await pinata.upload.file(uploadFile, {
      metadata: {
        name: `DigiRobotics_Capture_${Date.now()}`,
        keyValues: {
          type: 'egocentric_video',
          uploader: ctx.from?.id.toString() || 'anonymous',
          timestamp: new Date().toISOString()
        }
      }
    });
    
    ctx.reply(`✅ *Video Successfully Received!*\n\n🔗 IPFS CID: \`${upload.IpfsHash}\`\n📊 Status: Pending Review\n Payment: You will receive USDG/PYUSD after verification.`);
  } catch (error) {
    console.error('Upload error:', error);
    ctx.reply('❌ Error processing video. Please try again.');
  }
});

bot.launch();
console.log('🤖 DigiRobotics Telegram Bot is running...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
