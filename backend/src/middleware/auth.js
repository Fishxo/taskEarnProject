import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/pool.js';

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function validateTelegramInitData(initData) {
  if (!initData || !config.telegramBotToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(config.telegramBotToken)
    .digest();

  const calculated = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (!timingSafeEqual(calculated, hash)) return null;

  const authDate = Number(params.get('auth_date') || 0);
  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (authDate && ageSec > 86400) return null;

  let user = null;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return null;
  }

  return { user, authDate, startParam: params.get('start_param') || '' };
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      telegram_id: user.telegram_id,
      is_admin: user.is_admin,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

function makeReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function upsertTelegramUser(tgUser, startParam = '') {
  const isAdmin = config.adminTelegramIds.includes(String(tgUser.id));
  const existing = await query('SELECT * FROM users WHERE telegram_id = $1', [tgUser.id]);

  if (existing.rows[0]) {
    const result = await query(
      `UPDATE users SET
         username = $2,
         first_name = $3,
         last_name = $4,
         is_admin = users.is_admin OR $5,
         updated_at = NOW()
       WHERE telegram_id = $1
       RETURNING *`,
      [tgUser.id, tgUser.username || null, tgUser.first_name || null, tgUser.last_name || null, isAdmin]
    );
    return result.rows[0];
  }

  let referredBy = null;
  const ref = String(startParam || '');
  const code = ref.startsWith('ref_') ? ref.slice(4) : ref.startsWith('ref') ? ref.slice(3) : '';
  if (code) {
    const refUser = await query('SELECT id FROM users WHERE referral_code = $1', [code.toUpperCase()]);
    referredBy = refUser.rows[0]?.id || null;
  }

  const result = await query(
    `INSERT INTO users (
       telegram_id, username, first_name, last_name, is_admin, referral_code, referred_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      tgUser.id,
      tgUser.username || null,
      tgUser.first_name || null,
      tgUser.last_name || null,
      isAdmin,
      makeReferralCode(),
      referredBy,
    ]
  );

  const user = result.rows[0];

  // Welcome bonus (demo seed balance similar to screenshots)
  if (Number(user.balance_main) === 0 && Number(user.total_earned) === 0) {
    await query(
      `UPDATE users SET balance_bonus = balance_bonus + 100, total_earned = total_earned + 100, updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );
    const refreshed = await query('SELECT * FROM users WHERE id = $1', [user.id]);
    return refreshed.rows[0];
  }

  return user;
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ detail: 'Authentication required' });
  try {
    req.auth = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

export function adminRequired(req, res, next) {
  if (!req.auth?.is_admin) return res.status(403).json({ detail: 'Admin only' });
  return next();
}
