import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  demoMode: String(process.env.DEMO_MODE || '').toLowerCase() === 'true' || process.env.DEMO_MODE === '1',
  port: Number(process.env.PORT || 8000),
  host: process.env.HOST || '0.0.0.0',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:8000',
  webAppUrl: process.env.TELEGRAM_WEB_APP_URL || process.env.PUBLIC_URL || 'http://localhost:5173',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  botUsername: process.env.BOT_USERNAME || '',
  jwtSecret: required('JWT_SECRET', 'dev-only-change-me'),
  adminTelegramIds: (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://getrewards:password@127.0.0.1:5432/get_rewards',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379/0',
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  frontendDist: path.resolve(__dirname, '../../frontend_dist'),
};
