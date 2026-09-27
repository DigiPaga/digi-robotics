import { createApp } from "./app";
import { getEnv } from "./config/env";

const env = getEnv();
const app = createApp(env);

app.listen(env.port, () => {
  console.log(`DigiRobotics x402 server listening on http://localhost:${env.port} (${env.mode})`);
});

if (process.env.TELEGRAM_BOT_TOKEN) {
  const telegramBotModule = "./telegramBot.js";
  void import(telegramBotModule).catch(error => console.error("Telegram bot failed to start:", error instanceof Error ? error.message : "unknown error"));
}
