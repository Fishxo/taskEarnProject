import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const accounts = [
  {
    id: 'sys_1',
    full_name: 'Saron Worku',
    masked_name: 'Sa***u',
    initial: 'S',
    total_earned: 15200,
    withdrawals: 12,
    last_withdraw: { amount: 3200, method: 'M-Pesa Ethiopia', minutes_ago: 2 },
    feedback: {
      message_am: '3,200 ETB \u1260 M-Pesa Ethiopia \u1270\u1240\u1265\u12eb\u1208\u1201 \uD83C\uDF89\u2705 \u1260\u134d\u1325\u1290\u1275 \u12f0\u1228\u1230\u129d \uD83D\uDCAF',
      rating: 5,
      minutes_ago: 12,
    },
  },
  {
    id: 'sys_2',
    full_name: 'Abebe Kebede',
    masked_name: 'Ab***e',
    initial: 'A',
    total_earned: 14800,
    withdrawals: 11,
    last_withdraw: { amount: 2600, method: 'M-Pesa Ethiopia', minutes_ago: 6 },
    feedback: {
      message_am: '2,600 ETB \u1260 M-Pesa Ethiopia \u12c8\u1323\u120d\u129d \u2705 \u12a0\u1308\u120d\u130d\u120e\u1271 \u1325\u1229 \u1290\u12cd!',
      rating: 5,
      minutes_ago: 25,
    },
  },
  {
    id: 'sys_3',
    full_name: 'Rahel Alemayehu',
    masked_name: 'Ra***u',
    initial: 'R',
    total_earned: 14100,
    withdrawals: 10,
    last_withdraw: { amount: 2400, method: 'Telebirr', minutes_ago: 5 },
    feedback: {
      message_am: '5,400 ETB \u1260 CBE Birr \u1270\u1240\u1265\u12eb\u1208\u1201 \uD83C\uDF89\u2705 \u1260\u134d\u1325\u1290\u1275 \u12f0\u1228\u1230\u129d \uD83D\uDCAF',
      rating: 5,
      minutes_ago: 18,
    },
  },
  {
    id: 'sys_4',
    full_name: 'Michael Gebre',
    masked_name: 'Mi***e',
    initial: 'M',
    total_earned: 13600,
    withdrawals: 9,
    last_withdraw: { amount: 2000, method: 'Amole', minutes_ago: 5 },
    feedback: {
      message_am: '2,000 ETB \u1260 Amole \u12f0\u1228\u1230\u129d \uD83C\uDF89 \u121d\u1235\u130b\u1293\u12ee \u1275\u120d\u1245 \u1290\u12cd!',
      rating: 5,
      minutes_ago: 40,
    },
  },
  {
    id: 'sys_5',
    full_name: 'Hana Tesfaye',
    masked_name: 'Ha***e',
    initial: 'H',
    total_earned: 12900,
    withdrawals: 9,
    last_withdraw: { amount: 2800, method: 'Telebirr', minutes_ago: 9 },
    feedback: {
      message_am: '2,800 ETB \u1260 Telebirr \u1270\u1240\u1265\u12eb\u1208\u1201 \u2705',
      rating: 5,
      minutes_ago: 55,
    },
  },
  {
    id: 'sys_6',
    full_name: 'Daniel Hailu',
    masked_name: 'Da***u',
    initial: 'D',
    total_earned: 12100,
    withdrawals: 8,
    last_withdraw: { amount: 3000, method: 'CBE Birr', minutes_ago: 14 },
    feedback: {
      message_am: '3,000 ETB \u1260 CBE Birr \u12c8\u1323\u120d\u129d \uD83D\uDCAF',
      rating: 5,
      minutes_ago: 70,
    },
  },
  {
    id: 'sys_7',
    full_name: 'Mekdes Bekele',
    masked_name: 'Me***e',
    initial: 'M',
    total_earned: 11800,
    withdrawals: 7,
    last_withdraw: { amount: 2200, method: 'Awash Bank', minutes_ago: 18 },
    feedback: {
      message_am: 'Awash Bank \u1260\u12a9\u120d 2,200 ETB \u12f0\u1228\u1230\u129d \uD83C\uDF89',
      rating: 5,
      minutes_ago: 90,
    },
  },
  {
    id: 'sys_8',
    full_name: 'Natnael Demissie',
    masked_name: 'Na***e',
    initial: 'N',
    total_earned: 11200,
    withdrawals: 7,
    last_withdraw: { amount: 5100, method: 'Telebirr', minutes_ago: 22 },
    feedback: {
      message_am: '5,100 ETB \u1260 Telebirr \u12c8\u1323\u120d\u129d \u2705 \u12a0\u1308\u120d\u130d\u120e\u1271 \u1325\u1229 \u1290\u12cd!',
      rating: 5,
      minutes_ago: 60,
    },
  },
  {
    id: 'sys_9',
    full_name: 'Selam Abebe',
    masked_name: 'Se***e',
    initial: 'S',
    total_earned: 10900,
    withdrawals: 6,
    last_withdraw: { amount: 2500, method: 'HelloCash', minutes_ago: 28 },
    feedback: {
      message_am: '2,500 ETB \u1260 HelloCash \u1270\u1240\u1265\u12eb\u1208\u1201 \u2705',
      rating: 5,
      minutes_ago: 110,
    },
  },
  {
    id: 'sys_10',
    full_name: 'Kidist Mulugeta',
    masked_name: 'Ki***a',
    initial: 'K',
    total_earned: 10400,
    withdrawals: 5,
    last_withdraw: { amount: 2100, method: 'Dashen Bank', minutes_ago: 35 },
    feedback: {
      message_am: '2,100 ETB \u1260 Dashen Bank \u12f0\u1228\u1230\u129d \uD83C\uDF89',
      rating: 5,
      minutes_ago: 140,
    },
  },
];

const earnTitle = 'Ad \u12ed\u1218\u120d\u12a8\u1271';
const earn = [15, 15, 20, 20, 25, 25, 30, 30].map((reward_etb, i) => ({
  id: i + 1,
  order_index: i + 1,
  title_am: earnTitle,
  title_en: 'Watch Ad',
  reward_etb,
}));

const backendCode = `export const SYSTEM_ACCOUNTS = ${JSON.stringify(accounts, null, 2)};

export const DEFAULT_EARN_TASKS = ${JSON.stringify(earn, null, 2)};

export function minutesAgoLabel(mins) {
  if (mins < 1) return '\\u12a0\\u1201\\u1295';
  if (mins < 60) return mins + ' \\u12f0\\u1242\\u1243 \\u1260\\u134a\\u1275';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' \\u1230\\u12d3\\u1275 \\u1260\\u134a\\u1275';
  return Math.floor(hours / 24) + ' \\u1240\\u1295 \\u1260\\u134a\\u1275';
}

export function buildLiveFeed() {
  return [...SYSTEM_ACCOUNTS]
    .sort((a, b) => a.last_withdraw.minutes_ago - b.last_withdraw.minutes_ago)
    .map((a, i) => ({
      id: i + 1,
      name: a.full_name,
      amount: a.last_withdraw.amount,
      method: a.last_withdraw.method,
      ago: minutesAgoLabel(a.last_withdraw.minutes_ago),
    }));
}

export function buildLeaderboard() {
  return [...SYSTEM_ACCOUNTS]
    .sort((a, b) => b.total_earned - a.total_earned)
    .map((a, i) => ({
      id: a.id,
      rank: i + 1,
      name: a.masked_name,
      initial: a.initial,
      total_earned: a.total_earned,
      withdrawals: a.withdrawals,
    }));
}

export function buildFeedback() {
  return [...SYSTEM_ACCOUNTS]
    .sort((a, b) => a.feedback.minutes_ago - b.feedback.minutes_ago)
    .map((a, i) => ({
      id: i + 1,
      name: a.full_name,
      message: a.feedback.message_am,
      rating: a.feedback.rating,
      ago: minutesAgoLabel(a.feedback.minutes_ago),
      initial: a.initial,
    }));
}
`;

const feEarn = earn.map((t, i) => ({ ...t, status: i === 0 ? 'available' : 'locked' }));

const frontendCode = `export const SYSTEM_ACCOUNTS = ${JSON.stringify(accounts, null, 2)};

export const FALLBACK_EARN_TASKS = ${JSON.stringify(feEarn, null, 2)};

function ago(mins) {
  if (mins < 60) return mins + ' \\u12f0\\u1242\\u1243 \\u1260\\u134a\\u1275';
  return Math.floor(mins / 60) + ' \\u1230\\u12d3\\u1275 \\u1260\\u134a\\u1275';
}

export function fallbackLiveFeed() {
  return [...SYSTEM_ACCOUNTS]
    .sort((a, b) => a.last_withdraw.minutes_ago - b.last_withdraw.minutes_ago)
    .map((a, i) => ({
      id: i + 1,
      name: a.full_name,
      amount: a.last_withdraw.amount,
      method: a.last_withdraw.method,
      ago: ago(a.last_withdraw.minutes_ago),
    }));
}

export function fallbackLeaderboard() {
  return [...SYSTEM_ACCOUNTS]
    .sort((a, b) => b.total_earned - a.total_earned)
    .map((a, i) => ({
      id: a.id,
      rank: i + 1,
      name: a.masked_name,
      initial: a.initial,
      total_earned: a.total_earned,
      withdrawals: a.withdrawals,
    }));
}

export function fallbackFeedback() {
  return [...SYSTEM_ACCOUNTS]
    .sort((a, b) => a.feedback.minutes_ago - b.feedback.minutes_ago)
    .map((a, i) => ({
      id: i + 1,
      name: a.full_name,
      message: a.feedback.message_am,
      rating: a.feedback.rating,
      ago: ago(a.feedback.minutes_ago),
      initial: a.initial,
    }));
}
`;

// decode unicode escapes in minutesAgoLabel strings written as \\uXXXX literally - fix by writing real chars
function decodeEscapes(code) {
  return code.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

fs.mkdirSync(path.join(root, 'backend/src/data'), { recursive: true });
fs.mkdirSync(path.join(root, 'frontend/src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'backend/src/data/systemAccounts.js'), decodeEscapes(backendCode), 'utf8');
fs.writeFileSync(path.join(root, 'frontend/src/data/systemAccounts.js'), decodeEscapes(frontendCode), 'utf8');
console.log('OK', accounts.length, 'accounts');
