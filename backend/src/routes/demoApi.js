import { Router } from 'express';
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
      title_am: 'የTelegram ቻናሉን ይቀላቀሉ',
      title_en: 'Join the Telegram channel',
      reward_etb: 100,
      url: 'https://t.me/GetRewardsChannel',
      once_label: 'አንድ ጊዜ ብቻ',
    },
  ],
  earnTasks: DEFAULT_EARN_TASKS,
  feed: buildLiveFeed(),
  leaderboard: buildLeaderboard(),
  feedback: buildFeedback(),
  withdrawals: [
    {
      id: 101,
      user_id: 1,
      user_name: 'Dev User',
      amount: 2000,
      method: 'Telebirr',
      account: '0911223344',
      status: 'pending',
      created_at: new Date().toISOString(),
      created_label: 'now',
    },
    {
      id: 102,
      user_id: 1,
      user_name: 'Saron Worku',
      amount: 3200,
      method: 'M-Pesa Ethiopia',
      account: '0911000001',
      status: 'paid',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      created_label: '1h ago',
    },
  ],
  deposits: [
    {
      id: 201,
      user_id: 1,
      user_name: 'Dev User',
      amount: 500,
      platform: 'Telebirr',
      text: 'pending receipt',
      status: 'pending',
      created_label: 'now',
      created_at: new Date().toISOString(),
    },
    {
      id: 202,
      user_id: 2,
      user_name: 'Abebe Kebede',
      amount: 300,
      platform: 'CBE Birr',
      reason: 'name mismatch',
      ref: 'FT12345',
      status: 'failed',
      created_label: '2h ago',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  settings: {
    telebirr_name: '',
    telebirr_number: '',
    cbe_name: '',
    cbe_number: '',
    boa_name: '',
    boa_number: '',
    telebirr_verify_api_key: '',
    cbe_use_proxy: false,
  },
  broadcasts: [],
  secondAdmin: { username: 'secondadmin', password: 'changeme' },
};

function publicUser(u = state.user) {
  return {
    ...u,
    balance_total: Number(u.balance_main) + Number(u.balance_bonus),
  };
}

function credit(amount) {
  state.user.balance_bonus += amount;
  state.user.total_earned += amount;
}

function authRequired(req, res, next) {
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

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'get-rewards', mode: 'demo' });
});

router.post('/auth/telegram', (_req, res) => {
  const token = jwt.sign(
    { sub: state.user.id, telegram_id: state.user.telegram_id, is_admin: true },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
  res.json({ token, user_id: state.user.id, user: publicUser() });
});

router.get('/me', authRequired, (_req, res) => res.json(publicUser()));

router.get('/tasks/social', authRequired, (_req, res) => {
  res.json(
    state.socialTasks.map((t) => ({
      ...t,
      claimed: state.socialClaims.has(t.id),
    }))
  );
});

router.post('/tasks/social/:id/claim', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const task = state.socialTasks.find((t) => t.id === id);
  if (!task) return res.status(404).json({ detail: 'Task not found' });
  if (state.socialClaims.has(id)) return res.status(400).json({ detail: 'Already claimed' });
  state.socialClaims.add(id);
  credit(task.reward_etb);
  res.json({ ok: true, reward_etb: task.reward_etb });
});

router.get('/tasks/earn', authRequired, (_req, res) => {
  let unlocked = true;
  const payload = state.earnTasks.map((t) => {
    let status = 'locked';
    if (state.earnCompleted.has(t.id)) status = 'completed';
    else if (unlocked) status = 'available';
    if (!state.earnCompleted.has(t.id)) unlocked = false;
    return { ...t, status };
  });
  res.json(payload);
});

router.post('/tasks/earn/:id/complete', authRequired, (req, res) => {
  const id = Number(req.params.id);
  let unlocked = true;
  let target = null;
  for (const t of state.earnTasks) {
    if (t.id === id) {
      target = { ...t, unlocked, completed: state.earnCompleted.has(t.id) };
      break;
    }
    if (!state.earnCompleted.has(t.id)) unlocked = false;
  }
  if (!target) return res.status(404).json({ detail: 'Task not found' });
  if (target.completed) return res.status(400).json({ detail: 'Already completed' });
  if (!target.unlocked) return res.status(400).json({ detail: 'Task is locked' });
  state.earnCompleted.add(id);
  credit(target.reward_etb);
  res.json({ ok: true, reward_etb: target.reward_etb });
});

router.get('/feed/withdrawals', authRequired, (_req, res) => res.json(state.feed));
router.get('/leaderboard', authRequired, (_req, res) => res.json(state.leaderboard));

router.get('/invite', authRequired, (_req, res) => {
  const bot = config.botUsername || 'YourBot';
  res.json({
    friends: state.friends,
    earned: state.inviteEarned,
    referral_code: state.user.referral_code,
    invite_url: `https://t.me/${bot}/app?startapp=ref_${state.user.referral_code}`,
    invite_reward: INVITE_REWARD,
  });
});

router.post('/withdrawals', authRequired, (req, res) => {
  const amount = Number(req.body?.amount || 0);
  const method = String(req.body?.method || '').trim();
  const account = String(req.body?.account || '').trim();
  if (!method || !account) return res.status(400).json({ detail: 'method and account required' });
  if (amount < MIN_WITHDRAW) {
    return res.status(400).json({ detail: `Minimum withdraw is ${MIN_WITHDRAW} ETB` });
  }
  const balance = state.user.balance_main + state.user.balance_bonus;
  if (balance < amount) return res.status(400).json({ detail: 'Insufficient balance' });

  let remain = amount;
  const fromBonus = Math.min(state.user.balance_bonus, remain);
  state.user.balance_bonus -= fromBonus;
  remain -= fromBonus;
  state.user.balance_main -= remain;

  const item = {
    id: Date.now(),
    name: 'Dev User',
    amount,
    method,
    ago: 'አሁን',
  };
  state.feed.unshift(item);
  const withdrawal = {
    id: item.id,
    user_id: state.user.id,
    user_name: 'Dev User',
    amount,
    method,
    account,
    status: 'pending',
    created_at: new Date().toISOString(),
    created_label: 'አሁን',
  };
  state.withdrawals.unshift(withdrawal);
  try {
    getIo()?.emit('live_withdrawal', item);
  } catch {
    /* ignore */
  }
  res.json({ ok: true, withdrawal });
});

router.get('/feedback', authRequired, (_req, res) => res.json(state.feedback));

function requireAdmin(req, res, next) {
  if (!req.auth) return res.status(401).json({ detail: 'Authentication required' });
  // demo user is always admin
  return next();
}

router.get('/admin/stats', authRequired, requireAdmin, (_req, res) => {
  res.json({
    users: 1 + state.leaderboard.length,
    pending_withdrawals: state.withdrawals.filter((w) => w.status === 'pending').length,
    paid_withdrawals: state.withdrawals.filter((w) => w.status === 'paid').length,
    total_paid: state.withdrawals
      .filter((w) => w.status === 'paid')
      .reduce((s, w) => s + Number(w.amount), 0),
  });
});

router.get('/admin/users', authRequired, requireAdmin, (_req, res) => {
  res.json([
    {
      ...publicUser(),
      created_at: new Date().toISOString(),
    },
    ...state.leaderboard.map((u, i) => ({
      id: 100 + i,
      telegram_id: 900000 + i,
      username: u.id,
      first_name: u.name,
      last_name: '',
      balance_main: 0,
      balance_bonus: 0,
      balance_total: Number(u.total_earned),
      total_earned: Number(u.total_earned),
      is_admin: false,
      created_at: new Date().toISOString(),
    })),
  ]);
});

router.get('/admin/withdrawals', authRequired, requireAdmin, (req, res) => {
  const status = String(req.query.status || 'pending');
  const rows =
    status === 'all' ? state.withdrawals : state.withdrawals.filter((w) => w.status === status);
  res.json(rows);
});

router.post('/admin/withdrawals/:id/review', authRequired, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || '');
  if (!['paid', 'rejected'].includes(status)) {
    return res.status(400).json({ detail: 'status must be paid or rejected' });
  }
  const w = state.withdrawals.find((x) => x.id === id);
  if (!w) return res.status(404).json({ detail: 'Withdrawal not found' });
  if (w.status !== 'pending') return res.status(400).json({ detail: 'Already reviewed' });

  if (status === 'rejected') {
    state.user.balance_main += Number(w.amount);
  }
  w.status = status;
  res.json({ ok: true, id, status });
});

function demoUsers() {
  return [
    {
      ...publicUser(),
      phone_number: state.user.phone_number,
      created_at: new Date().toISOString(),
    },
    ...state.leaderboard.map((u, i) => ({
      id: 100 + i,
      telegram_id: 900000 + i,
      username: u.id,
      first_name: u.name,
      last_name: '',
      phone_number: null,
      balance_main: 0,
      balance_bonus: Number(u.total_earned),
      balance_total: Number(u.total_earned),
      total_earned: Number(u.total_earned),
      is_admin: false,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    })),
  ];
}

router.get('/admin/dashboard', authRequired, requireAdmin, (_req, res) => {
  const users = demoUsers();
  const paid = state.withdrawals.filter((w) => w.status === 'paid');
  const pendingW = state.withdrawals.filter((w) => w.status === 'pending');
  const approvedD = state.deposits.filter((d) => d.status === 'approved');
  const pendingD = state.deposits.filter((d) => d.status === 'pending');
  const failedD = state.deposits.filter((d) => d.status === 'failed');
  const depositSum = approvedD.reduce((s, d) => s + Number(d.amount), 0);
  const withdrawSum = paid.reduce((s, w) => s + Number(w.amount), 0);

  res.json({
    stats: {
      tasks: {
        today: 3,
        yesterday: 5,
        week: 18,
        last_week: 12,
        month: 40,
        last_month: 28,
        total: state.earnTasks.length * 4,
      },
      revenue: {
        today: 150,
        yesterday: 220,
        week: 980,
        last_week: 760,
        month: 3200,
        last_month: 2800,
        total: depositSum || 4200,
      },
      mode: {
        social: state.socialClaims.size || 2,
        ads: state.earnCompleted.size || 6,
        users: users.length,
      },
      finance: {
        deposits: depositSum || 4200,
        withdrawals: withdrawSum,
        balance: users.reduce((s, u) => s + Number(u.balance_total || 0), 0),
      },
    },
    settings: state.settings,
    deposits: {
      pending: pendingD,
      failed: failedD,
      approved: approvedD,
    },
    withdrawals: {
      pending: pendingW,
      paid,
    },
    users,
    broadcasts: state.broadcasts,
    second_admin: { username: state.secondAdmin.username },
  });
});

router.get('/admin/users/search', authRequired, requireAdmin, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const users = demoUsers();
  const found = users.find(
    (u) =>
      String(u.id) === q ||
      String(u.telegram_id) === q ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.first_name || '').toLowerCase().includes(q) ||
      (u.phone_number || '').includes(q)
  );
  if (!found) return res.status(404).json({ detail: 'User not found' });
  res.json(found);
});

router.patch('/admin/users/:id/balance', authRequired, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === state.user.id) {
    state.user.balance_main = Number(req.body?.balance_main ?? state.user.balance_main);
    state.user.balance_bonus = Number(req.body?.balance_bonus ?? state.user.balance_bonus);
    return res.json(publicUser());
  }
  return res.json({ ok: true, id });
});

router.post('/admin/deposits/:id/review', authRequired, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || '');
  const d = state.deposits.find((x) => x.id === id);
  if (!d) return res.status(404).json({ detail: 'Deposit not found' });
  if (status === 'approved') {
    d.status = 'approved';
    state.user.balance_main += Number(d.amount);
  } else if (status === 'rejected') {
    d.status = 'failed';
    d.reason = d.reason || 'rejected by admin';
  }
  res.json({ ok: true, id, status: d.status });
});

router.put('/admin/settings', authRequired, requireAdmin, (req, res) => {
  Object.assign(state.settings, req.body || {});
  res.json({ ok: true, settings: state.settings });
});

router.post('/admin/broadcast', authRequired, requireAdmin, (req, res) => {
  const message = String(req.body?.message || '').trim();
  const amount = Number(req.body?.amount || 0);
  if (!message) return res.status(400).json({ detail: 'message required' });
  const row = {
    id: Date.now(),
    message,
    amount,
    sent_by: 'admin',
    recipients: req.body?.to === 'admins' ? 'admins' : 'all',
    created_at: new Date().toISOString(),
  };
  state.broadcasts.unshift(row);
  if (amount > 0) {
    state.user.balance_bonus += amount;
    state.user.total_earned += amount;
  }
  res.json({ ok: true, broadcast: row });
});

router.post('/admin/dm', authRequired, requireAdmin, (req, res) => {
  const target = String(req.body?.target || '').trim();
  const message = String(req.body?.message || '').trim();
  if (!target || !message) return res.status(400).json({ detail: 'target and message required' });
  res.json({ ok: true, queued: true, target, message });
});

router.put('/admin/second-admin', authRequired, requireAdmin, (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (username) state.secondAdmin.username = username;
  if (password) state.secondAdmin.password = password;
  res.json({ ok: true, username: state.secondAdmin.username });
});

export default router;
