import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const p = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/db/migrate.js');
let s = fs.readFileSync(p, 'utf8');

const oldBlockStart = s.indexOf("const feed = await pool.query('SELECT COUNT(*)::int AS c FROM live_feed');");
const oldBlockEnd = s.indexOf('async function migrate');
if (oldBlockStart < 0 || oldBlockEnd < 0) {
  console.error('markers not found');
  process.exit(1);
}

const replacement = `const feed = await pool.query('SELECT COUNT(*)::int AS c FROM live_feed');
  if (feed.rows[0].c === 0) {
    const { SYSTEM_ACCOUNTS } = await import('../data/systemAccounts.js');
    for (const a of SYSTEM_ACCOUNTS) {
      await pool.query(
        \`INSERT INTO live_feed (name, amount, method, created_at)
         VALUES ($1, $2, $3, NOW() - ($4::text || ' minutes')::interval)\`,
        [a.full_name, a.last_withdraw.amount, a.last_withdraw.method, a.last_withdraw.minutes_ago]
      );
    }
  }

  const fb = await pool.query('SELECT COUNT(*)::int AS c FROM community_feedback');
  if (fb.rows[0].c === 0) {
    const { SYSTEM_ACCOUNTS } = await import('../data/systemAccounts.js');
    for (const a of SYSTEM_ACCOUNTS) {
      await pool.query(
        \`INSERT INTO community_feedback (name, message, rating, created_at)
         VALUES ($1, $2, $3, NOW() - ($4::text || ' minutes')::interval)\`,
        [a.full_name, a.feedback.message_am, a.feedback.rating, a.feedback.minutes_ago]
      );
    }
  }

  const sysUsers = await pool.query(\`SELECT COUNT(*)::int AS c FROM users WHERE username LIKE 'sys_%'\`);
  if (sysUsers.rows[0].c === 0) {
    const { SYSTEM_ACCOUNTS } = await import('../data/systemAccounts.js');
    for (const [i, a] of SYSTEM_ACCOUNTS.entries()) {
      const parts = a.full_name.split(' ');
      await pool.query(
        \`INSERT INTO users (
           telegram_id, username, first_name, last_name, referral_code,
           balance_main, balance_bonus, total_earned, is_admin
         ) VALUES ($1, $2, $3, $4, $5, 0, 0, $6, FALSE)
         ON CONFLICT (telegram_id) DO NOTHING\`,
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

`;

fs.writeFileSync(p, s.slice(0, oldBlockStart) + replacement + s.slice(oldBlockEnd), 'utf8');
console.log('migrate seed patched');
