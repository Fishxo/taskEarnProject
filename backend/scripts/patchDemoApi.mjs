import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const p = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/routes/demoApi.js');
let s = fs.readFileSync(p, 'utf8');
const endMarker = 'function publicUser';
const after = s.slice(s.indexOf(endMarker));

const mid = `import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getIo } from '../realtime.js';
import {
  DEFAULT_EARN_TASKS,
  buildLiveFeed,
  buildLeaderboard,
  buildFeedback,
} from '../data/systemAccounts.js';

const router = Router();
const MIN_WITHDRAW = 2000;
const INVITE_REWARD = 100;

const state = {
  user: {
    id: 1,
    telegram_id: 1001,
    username: 'dev_user',
    first_name: 'Dev',
    last_name: 'User',
    phone_number: null,
    balance_main: 0,
    balance_bonus: 100,
    total_earned: 100,
    referral_code: 'DEMO1234',
    is_admin: true,
  },
  socialClaims: new Set(),
  earnCompleted: new Set(),
  friends: 0,
  inviteEarned: 0,
  socialTasks: [
    {
      id: 1,
      title_am: 'Telegram channel join',
      title_en: 'Join the Telegram channel',
      reward_etb: 100,
      url: 'https://t.me/GetRewardsChannel',
      once_label: 'once only',
    },
  ],
  earnTasks: DEFAULT_EARN_TASKS,
  feed: buildLiveFeed(),
  leaderboard: buildLeaderboard(),
  feedback: buildFeedback(),
};

`;

// restore Amharic strings for social task after write using unicode
const withAmharic = mid
  .replace("title_am: 'Telegram channel join'", "title_am: '\\u12e8Telegram \\u127b\\u1293\\u1209\\u1295 \\u12ed\\u1240\\u120b\\u1240\\u1209'")
  .replace("once_label: 'once only'", "once_label: '\\u12a0\\u1295\\u12f5 \\u130a\\u12dc \\u1265\\u127b'")
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

fs.writeFileSync(p, withAmharic + after, 'utf8');
console.log('patched', p);
