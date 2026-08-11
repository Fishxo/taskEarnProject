console.log('[bot] loading...');
import { Telegraf, Markup } from 'telegraf';
import { config } from '../config.js';
import { upsertTelegramUser } from '../middleware/auth.js';

console.log('[bot] modules loaded');

if (!config.telegramBotToken) {
  console.error('TELEGRAM_BOT_TOKEN is required to run the bot');
  process.exit(1);
}

const bot = new Telegraf(config.telegramBotToken);

function isHttps(url) {
  return typeof url === 'string' && url.startsWith('https://');
}

async function sendOpenApp(ctx, prefix = '') {
  const webAppUrl = config.webAppUrl;
  const text =
    prefix ||
    `Welcome to Get Rewards!\n\nOpen the Mini App to earn from tasks, invite friends, and withdraw ETB.`;

  if (isHttps(webAppUrl)) {
    return ctx.reply(
      text,
      Markup.inlineKeyboard([Markup.button.webApp('Open Get Rewards', webAppUrl)])
    );
  }

  // Telegram only allows HTTPS for Mini App buttons (local http:// won't work)
  return ctx.reply(
    `${text}\n\nLocal mode: open this in your browser (Mini App button needs HTTPS):\n${webAppUrl}`
  );
}

bot.start(async (ctx) => {
  if (!config.demoMode) {
    try {
      const from = ctx.from;
      await upsertTelegramUser({
        id: from.id,
        username: from.username,
        first_name: from.first_name,
        last_name: from.last_name,
      });
    } catch (err) {
      console.error('upsert on /start', err.message);
    }
  }

  await sendOpenApp(ctx);
});

bot.command('app', async (ctx) => {
  await sendOpenApp(ctx, 'Open Get Rewards:');
});

bot.command('balance', async (ctx) => {
  if (config.demoMode) {
    return ctx.reply('Demo mode: open the web app to see your balance.\nhttp://localhost:5173');
  }
  try {
    const { query } = await import('../db/pool.js');
    const { rows } = await query(
      'SELECT balance_main, balance_bonus FROM users WHERE telegram_id = $1',
      [ctx.from.id]
    );
    if (!rows[0]) {
      return ctx.reply('You are not registered yet. Send /start first.');
    }
    const main = Number(rows[0].balance_main);
    const bonus = Number(rows[0].balance_bonus);
    return ctx.reply(`Balance\nMAIN: ${main}\nBONUS: ${bonus}\nTOTAL: ${main + bonus}`);
  } catch (err) {
    console.error(err);
    return ctx.reply('Could not fetch balance right now.');
  }
});

bot.catch((err, ctx) => {
  console.error('Bot error', ctx?.updateType, err.message || err);
});

console.log(`Starting bot… web app URL: ${config.webAppUrl}`);
bot
  .launch({ dropPendingUpdates: true })
  .then(() => console.log('Bot stopped'))
  .catch((err) => {
    console.error('Bot failed to start', err.message || err);
    process.exit(1);
  });

console.log('Get Rewards Telegram bot is running (long polling)');
console.log('Open @taskEarn_9bot and send /start');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
