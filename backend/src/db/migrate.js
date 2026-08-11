import crypto from 'crypto';
import { pool } from './pool.js';

const SQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by INTEGER REFERENCES users(id),
  balance_main NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_earned NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_tasks (
  id SERIAL PRIMARY KEY,
  title_am TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  reward_etb NUMERIC(12, 2) NOT NULL DEFAULT 100,
  url TEXT NOT NULL,
  once_only BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_task_claims (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES social_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

CREATE TABLE IF NOT EXISTS earn_tasks (
  id SERIAL PRIMARY KEY,
  order_index INTEGER NOT NULL UNIQUE,
  title_am TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  reward_etb NUMERIC(12, 2) NOT NULL DEFAULT 10,
  task_type TEXT NOT NULL DEFAULT 'ad',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS earn_task_completions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES earn_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  method TEXT NOT NULL,
  account TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_feed (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_feedback (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
`;

async function seed() {
  const social = await pool.query('SELECT COUNT(*)::int AS c FROM social_tasks');
  if (social.rows[0].c === 0) {
    await pool.query(
      `INSERT INTO social_tasks (title_am, title_en, reward_etb, url) VALUES
       ('የTelegram ቻናሉን ይቀላቀሉ', 'Join the Telegram channel', 100, 'https://t.me/GetRewardsChannel')`
    );
  }

  const earn = await pool.query('SELECT COUNT(*)::int AS c FROM earn_tasks');
  if (earn.rows[0].c === 0) {
    const { DEFAULT_EARN_TASKS } = await import('../data/systemAccounts.js');
    for (const t of DEFAULT_EARN_TASKS) {
      await pool.query(
        `INSERT INTO earn_tasks (order_index, title_am, title_en, reward_etb, task_type)
         VALUES ($1, $2, $3, $4, 'ad')`,
        [t.order_index, t.title_am, t.title_en, t.reward_etb]
      );
    }
  }

  const feed = await pool.query('SELECT COUNT(*)::int AS c FROM live_feed');
  if (feed.rows[0].c === 0) {
    const { SYSTEM_ACCOUNTS } = await import('../data/systemAccounts.js');
    for (const a of SYSTEM_ACCOUNTS) {
      await pool.query(
        `INSERT INTO live_feed (name, amount, method, created_at)
         VALUES ($1, $2, $3, NOW() - ($4::text || ' minutes')::interval)`,
        [a.full_name, a.last_withdraw.amount, a.last_withdraw.method, a.last_withdraw.minutes_ago]
      );
    }
  }

  const fb = await pool.query('SELECT COUNT(*)::int AS c FROM community_feedback');
  if (fb.rows[0].c === 0) {
    const { SYSTEM_ACCOUNTS } = await import('../data/systemAccounts.js');
    for (const a of SYSTEM_ACCOUNTS) {
      await pool.query(
        `INSERT INTO community_feedback (name, message, rating, created_at)
         VALUES ($1, $2, $3, NOW() - ($4::text || ' minutes')::interval)`,
        [a.full_name, a.feedback.message_am, a.feedback.rating, a.feedback.minutes_ago]
      );
    }
  }

  const sysUsers = await pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE username LIKE 'sys_%'`);
  if (sysUsers.rows[0].c === 0) {
    const { SYSTEM_ACCOUNTS } = await import('../data/systemAccounts.js');
    for (const [i, a] of SYSTEM_ACCOUNTS.entries()) {
      const parts = a.full_name.split(' ');
      await pool.query(
        `INSERT INTO users (
           telegram_id, username, first_name, last_name, referral_code,
           balance_main, balance_bonus, total_earned, is_admin
         ) VALUES ($1, $2, $3, $4, $5, 0, 0, $6, FALSE)
         ON CONFLICT (telegram_id) DO NOTHING`,
        [
          900000 + i + 1,
          a.id,
          parts[0],
          parts.slice(1).join(' '),
          'SYS' + String(i + 1).padStart(4, '0'),
          a.total_earned,
        ]
      );
    }
  }
}

async function migrate() {
  await pool.query(SQL);
  await seed();
  console.log('Migrations complete');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

export function makeReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}
