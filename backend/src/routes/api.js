import { Router } from 'express';
import {
  authRequired,
  adminRequired,
  validateTelegramInitData,
  upsertTelegramUser,
  signToken,
} from '../middleware/auth.js';
import { pool, query } from '../db/pool.js';
import { config } from '../config.js';
import { getIo } from '../realtime.js';

const router = Router();
const MIN_WITHDRAW = 2000;
const INVITE_REWARD = 100;

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'get-rewards' });
});

router.post('/auth/telegram', async (req, res) => {
  try {
    const { initData, start_param } = req.body || {};
    const parsed = validateTelegramInitData(initData);
    let user;

    if (!parsed) {
      if (process.env.NODE_ENV === 'production' && config.telegramBotToken) {
        return res.status(401).json({ detail: 'Invalid Telegram initData' });
      }
      const demoId = Number(req.body?.demo_telegram_id || 1001);
      user = await upsertTelegramUser(
        { id: demoId, username: 'dev_user', first_name: 'Dev', last_name: 'User' },
        start_param || ''
      );
    } else {
      user = await upsertTelegramUser(parsed.user, start_param || parsed.startParam || '');
    }

    // Pay referrer once when new user was created with referred_by and no prior invite payout
    await maybePayReferrer(user);

    return res.json({ token: signToken(user), user_id: user.id, user: publicUser(user) });
  } catch (err) {
    console.error('auth/telegram', err);
    return res.status(500).json({ detail: 'Auth failed' });
  }
});

router.get('/me', authRequired, async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.auth.sub]);
  if (!rows[0]) return res.status(404).json({ detail: 'User not found' });
  return res.json(publicUser(rows[0]));
});

router.get('/tasks/social', authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT t.*,
      EXISTS(
        SELECT 1 FROM social_task_claims c WHERE c.user_id = $1 AND c.task_id = t.id
      ) AS claimed
     FROM social_tasks t
     WHERE t.is_active = TRUE
     ORDER BY t.id ASC`,
    [req.auth.sub]
  );
  res.json(
    rows.map((t) => ({
      id: t.id,
      title_am: t.title_am,
      title_en: t.title_en,
      reward_etb: Number(t.reward_etb),
      url: t.url,
      once_label: t.once_only ? 'አንድ ጊዜ ብቻ' : 'በየቀኑ',
      claimed: t.claimed,
    }))
  );
});

router.post('/tasks/social/:id/claim', authRequired, async (req, res) => {
  const taskId = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const taskRes = await client.query(
      'SELECT * FROM social_tasks WHERE id = $1 AND is_active = TRUE FOR UPDATE',
      [taskId]
    );
    const task = taskRes.rows[0];
    if (!task) {
      await client.query('ROLLBACK');
      return res.status(404).json({ detail: 'Task not found' });
    }

    const exists = await client.query(
      'SELECT 1 FROM social_task_claims WHERE user_id = $1 AND task_id = $2',
      [req.auth.sub, taskId]
    );
    if (exists.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ detail: 'Already claimed' });
    }

    const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.auth.sub]);
    const user = userRes.rows[0];
    const reward = Number(task.reward_etb);
    const newBonus = Number(user.balance_bonus) + reward;
    const newEarned = Number(user.total_earned) + reward;

    await client.query(
      `UPDATE users SET balance_bonus = $1, total_earned = $2, updated_at = NOW() WHERE id = $3`,
      [newBonus, newEarned, user.id]
    );
    await client.query(
      `INSERT INTO social_task_claims (user_id, task_id) VALUES ($1, $2)`,
      [user.id, taskId]
    );
    await client.query(
      `INSERT INTO wallet_transactions (user_id, kind, amount, balance_after, meta)
       VALUES ($1, 'social_task', $2, $3, $4::jsonb)`,
      [user.id, reward, newBonus, JSON.stringify({ task_id: taskId })]
    );
    await client.query('COMMIT');
    res.json({ ok: true, reward_etb: reward });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ detail: 'Claim failed' });
  } finally {
    client.release();
  }
});

router.get('/tasks/earn', authRequired, async (req, res) => {
  const tasks = await query(
    `SELECT t.*,
      EXISTS(SELECT 1 FROM earn_task_completions c WHERE c.user_id = $1 AND c.task_id = t.id) AS completed
     FROM earn_tasks t
     WHERE t.is_active = TRUE
     ORDER BY t.order_index ASC`,
    [req.auth.sub]
  );

  let unlocked = true;
  const payload = tasks.rows.map((t) => {
    let status = 'locked';
    if (t.completed) status = 'completed';
    else if (unlocked) status = 'available';
    if (!t.completed) unlocked = false;
    return {
      id: t.id,
      order_index: t.order_index,
      title_am: t.title_am,
      title_en: t.title_en,
      reward_etb: Number(t.reward_etb),
      status,
    };
  });
  res.json(payload);
});

router.post('/tasks/earn/:id/complete', authRequired, async (req, res) => {
  const taskId = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tasks = await client.query(
      `SELECT t.*,
        EXISTS(SELECT 1 FROM earn_task_completions c WHERE c.user_id = $1 AND c.task_id = t.id) AS completed
       FROM earn_tasks t
       WHERE t.is_active = TRUE
       ORDER BY t.order_index ASC`,
      [req.auth.sub]
    );

    let unlocked = true;
    let target = null;
    for (const t of tasks.rows) {
      if (t.id === taskId) {
        target = { ...t, unlocked };
        break;
      }
      if (!t.completed) unlocked = false;
    }

    if (!target) {
      await client.query('ROLLBACK');
      return res.status(404).json({ detail: 'Task not found' });
    }
    if (target.completed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ detail: 'Already completed' });
    }
    if (!target.unlocked) {
      await client.query('ROLLBACK');
      return res.status(400).json({ detail: 'Task is locked' });
    }

    const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.auth.sub]);
    const user = userRes.rows[0];
    const reward = Number(target.reward_etb);
    const newBonus = Number(user.balance_bonus) + reward;
    const newEarned = Number(user.total_earned) + reward;

    await client.query(
      `UPDATE users SET balance_bonus = $1, total_earned = $2, updated_at = NOW() WHERE id = $3`,
      [newBonus, newEarned, user.id]
    );
    await client.query(
      `INSERT INTO earn_task_completions (user_id, task_id) VALUES ($1, $2)`,
      [user.id, taskId]
    );
    await client.query(
      `INSERT INTO wallet_transactions (user_id, kind, amount, balance_after, meta)
       VALUES ($1, 'earn_task', $2, $3, $4::jsonb)`,
      [user.id, reward, newBonus, JSON.stringify({ task_id: taskId })]
    );
    await client.query('COMMIT');
    res.json({ ok: true, reward_etb: reward });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ detail: 'Complete failed' });
  } finally {
    client.release();
  }
});

router.get('/feed/withdrawals', authRequired, async (_req, res) => {
  const { rows } = await query(
    `SELECT id, name, amount, method, created_at
     FROM live_feed
     ORDER BY created_at DESC
     LIMIT 20`
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      amount: Number(r.amount),
      method: r.method,
      ago: relativeTime(r.created_at),
    }))
  );
});

router.get('/leaderboard', authRequired, async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.first_name, u.username, u.total_earned,
      (SELECT COUNT(*)::int FROM withdrawals w WHERE w.user_id = u.id AND w.status = 'paid') AS withdrawals
     FROM users u
     ORDER BY u.total_earned DESC, u.id ASC
     LIMIT 20`
  );

  // If empty/demo, synthesize masked rows from live_feed style names
  const list =
    rows.length > 0
      ? rows
      : [
          { id: 1, first_name: 'Abebe', username: 'abe', total_earned: 15000, withdrawals: 12 },
          { id: 2, first_name: 'Hana', username: 'hana', total_earned: 14000, withdrawals: 9 },
          { id: 3, first_name: 'Daniel', username: 'dan', total_earned: 13000, withdrawals: 8 },
          { id: 4, first_name: 'Mekdes', username: 'mek', total_earned: 12000, withdrawals: 7 },
          { id: 5, first_name: 'Selam', username: 'sel', total_earned: 11000, withdrawals: 6 },
        ];

  res.json(
    list.map((u, i) => ({
      id: u.id,
      rank: i + 1,
      name: maskName(u.first_name || u.username || 'User'),
      total_earned: Number(u.total_earned),
      withdrawals: Number(u.withdrawals || 0),
    }))
  );
});

router.get('/invite', authRequired, async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.auth.sub]);
  const user = rows[0];
  if (!user) return res.status(404).json({ detail: 'User not found' });

  const friends = await query('SELECT COUNT(*)::int AS c FROM users WHERE referred_by = $1', [
    user.id,
  ]);
  const earned = await query(
    `SELECT COALESCE(SUM(amount),0)::float AS s
     FROM wallet_transactions
     WHERE user_id = $1 AND kind = 'invite'`,
    [user.id]
  );

  const bot = config.botUsername || 'YourBot';
  const invite_url = `https://t.me/${bot}/app?startapp=ref_${user.referral_code}`;

  res.json({
    friends: friends.rows[0].c,
    earned: Number(earned.rows[0].s || 0),
    referral_code: user.referral_code,
    invite_url,
    invite_reward: INVITE_REWARD,
  });
});

router.post('/withdrawals', authRequired, async (req, res) => {
  const amount = Number(req.body?.amount || 0);
  const method = String(req.body?.method || '').trim();
  const account = String(req.body?.account || '').trim();

  if (!method || !account) return res.status(400).json({ detail: 'method and account required' });
  if (amount < MIN_WITHDRAW) {
    return res.status(400).json({ detail: `Minimum withdraw is ${MIN_WITHDRAW} ETB` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.auth.sub]);
    const user = userRes.rows[0];
    const balance = Number(user.balance_main) + Number(user.balance_bonus);
    if (balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ detail: 'Insufficient balance' });
    }

    // Deduct bonus first, then main
    let remain = amount;
    let bonus = Number(user.balance_bonus);
    let main = Number(user.balance_main);
    const fromBonus = Math.min(bonus, remain);
    bonus -= fromBonus;
    remain -= fromBonus;
    main -= remain;

    await client.query(
      `UPDATE users SET balance_main = $1, balance_bonus = $2, updated_at = NOW() WHERE id = $3`,
      [main, bonus, user.id]
    );
    const w = await client.query(
      `INSERT INTO withdrawals (user_id, amount, method, account, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [user.id, amount, method, account]
    );
    await client.query(
      `INSERT INTO wallet_transactions (user_id, kind, amount, balance_after, meta)
       VALUES ($1, 'withdraw', $2, $3, $4::jsonb)`,
      [user.id, -amount, main + bonus, JSON.stringify({ method, account })]
    );

    const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
    const feed = await client.query(
      `INSERT INTO live_feed (name, amount, method) VALUES ($1, $2, $3) RETURNING *`,
      [displayName, amount, method]
    );
    await client.query('COMMIT');

    const item = {
      id: feed.rows[0].id,
      name: displayName,
      amount,
      method,
      ago: 'አሁን',
    };
    try {
      getIo()?.emit('live_withdrawal', item);
    } catch {
      /* ignore */
    }

    res.json({ ok: true, withdrawal: w.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ detail: 'Withdraw failed' });
  } finally {
    client.release();
  }
});

router.get('/feedback', authRequired, async (_req, res) => {
  const { rows } = await query(
    `SELECT id, name, message, rating, created_at
     FROM community_feedback
     ORDER BY created_at DESC
     LIMIT 30`
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      message: r.message,
      rating: r.rating,
      ago: relativeTime(r.created_at),
    }))
  );
});

router.get('/admin/stats', authRequired, adminRequired, async (_req, res) => {
  const users = await query(`SELECT COUNT(*)::int AS c FROM users`);
  const pending = await query(`SELECT COUNT(*)::int AS c FROM withdrawals WHERE status = 'pending'`);
  const paid = await query(`SELECT COUNT(*)::int AS c FROM withdrawals WHERE status = 'paid'`);
  const totalPaid = await query(
    `SELECT COALESCE(SUM(amount),0)::float AS s FROM withdrawals WHERE status = 'paid'`
  );
  res.json({
    users: users.rows[0].c,
    pending_withdrawals: pending.rows[0].c,
    paid_withdrawals: paid.rows[0].c,
    total_paid: Number(totalPaid.rows[0].s || 0),
  });
});

router.get('/admin/users', authRequired, adminRequired, async (_req, res) => {
  const { rows } = await query(
    `SELECT id, telegram_id, username, first_name, last_name, balance_main, balance_bonus,
            total_earned, is_admin, created_at
     FROM users
     ORDER BY id DESC
     LIMIT 200`
  );
  res.json(
    rows.map((u) => ({
      id: u.id,
      telegram_id: u.telegram_id,
      username: u.username,
      first_name: u.first_name,
      last_name: u.last_name,
      balance_main: Number(u.balance_main),
      balance_bonus: Number(u.balance_bonus),
      balance_total: Number(u.balance_main) + Number(u.balance_bonus),
      total_earned: Number(u.total_earned),
      is_admin: u.is_admin,
      created_at: u.created_at,
    }))
  );
});

router.get('/admin/withdrawals', authRequired, adminRequired, async (req, res) => {
  const status = String(req.query.status || 'pending');
  const params = [];
  let where = '';
  if (status !== 'all') {
    params.push(status);
    where = 'WHERE w.status = $1';
  }
  const { rows } = await query(
    `SELECT w.*, u.first_name, u.last_name, u.username, u.telegram_id
     FROM withdrawals w
     JOIN users u ON u.id = w.user_id
     ${where}
     ORDER BY w.created_at DESC
     LIMIT 200`,
    params
  );
  res.json(
    rows.map((w) => ({
      id: w.id,
      user_id: w.user_id,
      user_name: [w.first_name, w.last_name].filter(Boolean).join(' ') || w.username || String(w.telegram_id),
      amount: Number(w.amount),
      method: w.method,
      account: w.account,
      status: w.status,
      created_at: w.created_at,
      created_label: relativeTime(w.created_at),
    }))
  );
});

router.post('/admin/withdrawals/:id/review', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || '');
  if (!['paid', 'rejected'].includes(status)) {
    return res.status(400).json({ detail: 'status must be paid or rejected' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const wRes = await client.query('SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE', [id]);
    const w = wRes.rows[0];
    if (!w) {
      await client.query('ROLLBACK');
      return res.status(404).json({ detail: 'Withdrawal not found' });
    }
    if (w.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ detail: 'Already reviewed' });
    }

    if (status === 'rejected') {
      const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [w.user_id]);
      const user = userRes.rows[0];
      const refund = Number(w.amount);
      const newMain = Number(user.balance_main) + refund;
      await client.query(
        `UPDATE users SET balance_main = $1, updated_at = NOW() WHERE id = $2`,
        [newMain, user.id]
      );
      await client.query(
        `INSERT INTO wallet_transactions (user_id, kind, amount, balance_after, meta)
         VALUES ($1, 'withdraw_refund', $2, $3, $4::jsonb)`,
        [user.id, refund, newMain + Number(user.balance_bonus), JSON.stringify({ withdrawal_id: id })]
      );
    }

    await client.query(`UPDATE withdrawals SET status = $1 WHERE id = $2`, [status, id]);
    await client.query('COMMIT');
    res.json({ ok: true, id, status });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ detail: 'Review failed' });
  } finally {
    client.release();
  }
});

router.get('/admin/dashboard', authRequired, adminRequired, async (_req, res) => {
  const usersRes = await query(
    `SELECT id, telegram_id, username, first_name, last_name, phone_number,
            balance_main, balance_bonus, total_earned, is_admin, created_at
     FROM users ORDER BY id DESC LIMIT 200`
  );
  const users = usersRes.rows.map((u) => ({
    id: u.id,
    telegram_id: u.telegram_id,
    username: u.username,
    first_name: u.first_name,
    last_name: u.last_name,
    phone_number: u.phone_number,
    balance_main: Number(u.balance_main),
    balance_bonus: Number(u.balance_bonus),
    balance_total: Number(u.balance_main) + Number(u.balance_bonus),
    total_earned: Number(u.total_earned),
    is_admin: u.is_admin,
    created_at: u.created_at,
  }));

  const pendingW = await query(
    `SELECT w.*, u.first_name, u.last_name, u.username, u.telegram_id
     FROM withdrawals w JOIN users u ON u.id = w.user_id
     WHERE w.status = 'pending' ORDER BY w.created_at DESC LIMIT 100`
  );
  const paidW = await query(
    `SELECT w.*, u.first_name, u.last_name, u.username, u.telegram_id
     FROM withdrawals w JOIN users u ON u.id = w.user_id
     WHERE w.status = 'paid' ORDER BY w.created_at DESC LIMIT 100`
  );

  const mapW = (rows) =>
    rows.map((w) => ({
      id: w.id,
      user_id: w.user_id,
      user_name: [w.first_name, w.last_name].filter(Boolean).join(' ') || w.username || String(w.telegram_id),
      amount: Number(w.amount),
      method: w.method,
      account: w.account,
      status: w.status,
      created_at: w.created_at,
      created_label: relativeTime(w.created_at),
    }));

  const totalPaid = paidW.rows.reduce((s, w) => s + Number(w.amount), 0);
  const balance = users.reduce((s, u) => s + u.balance_total, 0);

  res.json({
    stats: {
      tasks: { today: 0, yesterday: 0, week: 0, last_week: 0, month: 0, last_month: 0, total: 0 },
      revenue: { today: 0, yesterday: 0, week: 0, last_week: 0, month: 0, last_month: 0, total: 0 },
      mode: { social: 0, ads: 0, users: users.length },
      finance: { deposits: 0, withdrawals: totalPaid, balance },
    },
    settings: {},
    deposits: { pending: [], failed: [], approved: [] },
    withdrawals: { pending: mapW(pendingW.rows), paid: mapW(paidW.rows) },
    users,
    broadcasts: [],
    second_admin: { username: '' },
  });
});

router.get('/admin/users/search', authRequired, adminRequired, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { rows } = await query(
    `SELECT * FROM users
     WHERE id::text = $1 OR telegram_id::text = $1 OR username ILIKE $2 OR first_name ILIKE $2 OR phone_number ILIKE $2
     LIMIT 1`,
    [q, `%${q}%`]
  );
  if (!rows[0]) return res.status(404).json({ detail: 'User not found' });
  res.json(publicUser(rows[0]));
});

router.patch('/admin/users/:id/balance', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const main = Number(req.body?.balance_main);
  const bonus = Number(req.body?.balance_bonus);
  const { rows } = await query(
    `UPDATE users SET balance_main = $1, balance_bonus = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [main, bonus, id]
  );
  if (!rows[0]) return res.status(404).json({ detail: 'User not found' });
  res.json(publicUser(rows[0]));
});

router.post('/admin/deposits/:id/review', authRequired, adminRequired, async (_req, res) => {
  res.status(501).json({ detail: 'Deposits table not enabled yet' });
});

router.put('/admin/settings', authRequired, adminRequired, async (req, res) => {
  res.json({ ok: true, settings: req.body || {} });
});

router.post('/admin/broadcast', authRequired, adminRequired, async (req, res) => {
  res.json({ ok: true, queued: true, message: req.body?.message || '' });
});

router.post('/admin/dm', authRequired, adminRequired, async (req, res) => {
  res.json({ ok: true, queued: true, target: req.body?.target || '' });
});

router.put('/admin/second-admin', authRequired, adminRequired, async (req, res) => {
  res.json({ ok: true, username: req.body?.username || '' });
});

async function maybePayReferrer(user) {
  if (!user.referred_by) return;
  const already = await query(
    `SELECT 1 FROM wallet_transactions
     WHERE user_id = $1 AND kind = 'invite' AND meta->>'referred_user_id' = $2
     LIMIT 1`,
    [user.referred_by, String(user.id)]
  );
  if (already.rowCount) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ref = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [user.referred_by]);
    if (!ref.rows[0]) {
      await client.query('ROLLBACK');
      return;
    }
    const reward = INVITE_REWARD;
    const newBonus = Number(ref.rows[0].balance_bonus) + reward;
    const newEarned = Number(ref.rows[0].total_earned) + reward;
    await client.query(
      `UPDATE users SET balance_bonus = $1, total_earned = $2, updated_at = NOW() WHERE id = $3`,
      [newBonus, newEarned, ref.rows[0].id]
    );
    await client.query(
      `INSERT INTO wallet_transactions (user_id, kind, amount, balance_after, meta)
       VALUES ($1, 'invite', $2, $3, $4::jsonb)`,
      [ref.rows[0].id, reward, newBonus, JSON.stringify({ referred_user_id: user.id })]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('referrer payout', err);
  } finally {
    client.release();
  }
}

function publicUser(user) {
  return {
    id: user.id,
    telegram_id: user.telegram_id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    phone_number: user.phone_number,
    balance_main: Number(user.balance_main),
    balance_bonus: Number(user.balance_bonus),
    balance_total: Number(user.balance_main) + Number(user.balance_bonus),
    total_earned: Number(user.total_earned),
    referral_code: user.referral_code,
    is_admin: user.is_admin,
  };
}

function maskName(name) {
  const s = String(name || 'User');
  if (s.length <= 2) return s[0] + '***';
  return s.slice(0, 2) + '***' + s.slice(-1);
}

function relativeTime(date) {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'አሁን';
  if (mins < 60) return `${mins} ደቂቃ በፊት`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ሰዓት በፊት`;
  return `${Math.floor(hours / 24)} ቀን በፊት`;
}

export default router;
