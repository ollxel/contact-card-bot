/**
 * contact-router-bot – forward contacts to a predefined admin
 *
 * Run with:  npm start
 *
 * Environment variables (required):
 *   TELEGRAM_BOT_TOKEN – token from @BotFather
 *   ADMIN_USERNAME     – telegram username of the admin (without @)
 *   PORT               – http port for health‑check (Render sets this)
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.toLowerCase();
const PORT = process.env.PORT || 8080;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRA​M_BOT_TOKEN is missing in .env');
  process.exit(1);
}
if (!ADMIN_USERNAME) {
  console.error('❌ ADMIN_USERNAME is missing in .env');
  process.exit(1);
}

/* -------------------------------------------------
 *  Bot initialisation
 * ------------------------------------------------- */
const bot = new Telegraf(BOT_TOKEN);

// In‑memory store of the admin chat id (filled on first /start)
let adminChatId = null;

/* -------------------------------------------------
 *  Helper: obtain admin chat id (once)
 * ------------------------------------------------- */
async function ensureAdminChatId(ctx) {
  // If we already know it – nothing to do
  if (adminChatId) return adminChatId;

  // Try to fetch it via username (works if the admin has ever
  // started the bot, otherwise we get an error)
  try {
    const chat = await ctx.telegram.getChat(`@${ADMIN_USERNAME}`);
    adminChatId = chat.id;
    console.log(`✅ Got admin chat id: ${adminChatId}`);
    return adminChatId;
  } catch (err) {
    console.warn(
      `⚠️ Could not resolve @${ADMIN_USERNAME} to a chat id yet. ` +
        `Make sure the admin has started the bot at least once.`
    );
    return null;
  }
}

/* -------------------------------------------------
 *  /start – for everyone
 * ------------------------------------------------- */
bot.start(async (ctx) => {
  const fromUsername = ctx.from.username?.toLowerCase() || '';

  // If the user is the admin → store his chat id and give a simple greeting
  if (fromUsername === ADMIN_USERNAME) {
    adminChatId = ctx.chat.id;
    await ctx.reply(
      `👋 Привет, администратор! Я буду пересылать сюда все полученные от пользователей контакты.`
    );
    return;
  }

  // Normal user
  await ctx.reply(
    `🟢 Привет! Пожалуйста, отправьте мне карточку контакта, которую хотите передать администратору @${ADMIN_USERNAME}.`
  );
});

/* -------------------------------------------------
 *  Contact handler – only contacts are interesting
 * ------------------------------------------------- */
bot.on('contact', async (ctx) => {
  const fromUsername = ctx.from.username?.toLowerCase() || '';
  const contact = ctx.message.contact;

  // If the admin sends a contact we just acknowledge it
  if (fromUsername === ADMIN_USERNAME) {
    await ctx.reply('✅ Я получил вашу карточку, но вы — администратор, поэтому ничего не пересылаю.');
    return;
  }

  // Normal user → forward to admin
  const adminId = await ensureAdminChatId(ctx);

  if (!adminId) {
    // We couldn't resolve admin chat id – tell the user to try later
    await ctx.reply(
      `❗️ Не удалось доставить контакт. Администратор ещё не запустил бота. Пожалуйста, попробуйте позже.`
    );
    return;
  }

  try {
    // Forward the contact using sendContact (preserves phone & name)
    await ctx.telegram.sendContact(
      adminId,
      contact.phone_number,
      contact.first_name,
      {
        last_name: contact.last_name,
        vcard: contact.vcard,
        // Optional: add a caption with the sender's info
        caption: `📩 Новый контакт от @${ctx.from.username || ctx.from.id}`
      }
    );

    await ctx.reply('✅ Ваш контакт успешно отправлен администратору.');
  } catch (err) {
    console.error('❌ Ошибка при отправке контакта администратору:', err);
    await ctx.reply('❗️ Не удалось переслать контакт. Попробуйте позже.');
  }
});

/* -------------------------------------------------
 *  Any other message → politely decline
 * ------------------------------------------------- */
bot.on('message', async (ctx) => {
  // Ignore contacts (handled above)
  if (ctx.message.contact) return;

  await ctx.reply(
    `ℹ️ Пожалуйста, отправьте только карточку контакта. Нажмите /start, если хотите начать заново.`
  );
});

/* -------------------------------------------------
 *  Health‑check HTTP server (required by Render)
 * ------------------------------------------------- */
const app = express();

app.get('/', (req, res) => res.send('🟢 Contact‑router bot is alive'));

app.listen(PORT, () => {
  console.log(`🌐 HTTP health‑check listening on port ${PORT}`);
});

/* -------------------------------------------------
 *  Start the bot (long‑polling – works fine on Render)
 * ------------------------------------------------- */
bot.launch().then(() => console.log('🤖 Bot started (long‑polling)'));

/* -------------------------------------------------
 *  Graceful stop (Render sends SIGTERM on redeploy)
 * ------------------------------------------------- */
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
