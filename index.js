const { Telegraf, Markup } = require('telegraf');
const express = require('express');

// Создаем Express приложение для Render
const app = express();
app.use(express.json());

// Проверяем обязательные переменные окружения
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;

if (!BOT_TOKEN || !ADMIN_USERNAME) {
  console.error('Missing required environment variables: TELEGRAM_BOT_TOKEN or ADMIN_USERNAME');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Команда /start
bot.start((ctx) => {
  const username = ctx.from.username;
  const firstName = ctx.from.first_name || 'Пользователь';
  
  // Проверяем, является ли пользователь админом
  if (username === ADMIN_USERNAME) {
    return ctx.reply('👋 Привет, админ! Я буду пересылать тебе контакты от пользователей.');
  }
  
  // Для обычных пользователей - отправляем сообщение с кнопкой для отправки номера телефона
  ctx.reply(
    `👋 Привет, ${firstName}!\n\n` +
    'Это бот авторизации. Регистрация займет меньше минуты!\n\n' +
    'Сейчас мы попросим твой номер телефона. Он нужен, чтобы создать аккаунт и быстро разобраться в проблеме, если ты обратишься в поддержку.',
    Markup.keyboard([
      [Markup.button.contactRequest('📱 Отправить номер телефона')]
    ]).oneTime().resize()
  );
});

// Обработчик контактов (номеров телефона)
bot.on('contact', async (ctx) => {
  const user = ctx.from;
  const contact = ctx.message.contact;
  
  // Проверяем, что контакт принадлежит отправителю
  if (contact.user_id !== user.id) {
    return ctx.reply('❌ Пожалуйста, отправьте свой собственный номер телефона.');
  }
  
  try {
    // Пересылаем контакт админу
    await ctx.telegram.sendContact(
      ADMIN_USERNAME,
      contact.phone_number,
      contact.first_name || user.first_name,
      {
        last_name: contact.last_name || user.last_name,
        user_id: contact.user_id
      }
    );
    
    // Подтверждаем пользователю
    await ctx.reply(
      '✅ Спасибо! Ваш номер телефона успешно отправлен.\n\n' +
      'Теперь вы зарегистрированы в системе!',
      Markup.removeKeyboard() // Убираем клавиатуру
    );
    
    console.log(`Контакт от ${user.first_name} (ID: ${user.id}) переслан админу @${ADMIN_USERNAME}`);
    
  } catch (error) {
    console.error('Ошибка при пересылке контакта:', error);
    
    if (error.description && error.description.includes('user not found')) {
      await ctx.reply(
        '❌ Админ не найден. Пожалуйста, сообщите об этом администратору.',
        Markup.removeKeyboard()
      );
    } else {
      await ctx.reply(
        '❌ Произошла ошибка при отправке номера телефона. Попробуйте позже.',
        Markup.removeKeyboard()
      );
    }
  }
});

// Обработчик текстовых сообщений
bot.on('text', (ctx) => {
  const username = ctx.from.username;
  const text = ctx.message.text;
  
  if (username === ADMIN_USERNAME) {
    return ctx.reply('Я жду номера телефонов от пользователей для пересылки вам.');
  }
  
  // Если пользователь отправил текст вместо контакта, показываем подсказку
  if (text !== '/start') {
    ctx.reply(
      'Пожалуйста, используйте кнопку "📱 Отправить номер телефона" ниже, чтобы поделиться своим номером.',
      Markup.keyboard([
        [Markup.button.contactRequest('📱 Отправить номер телефона')]
      ]).oneTime().resize()
    );
  }
});

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Запуск бота через вебхук (для Render)
const PORT = process.env.PORT || 3000;

// В продакшене используем вебхук
if (process.env.NODE_ENV === 'production') {
  const WEBHOOK_PATH = `/webhook/${BOT_TOKEN}`;
  
  app.use(bot.webhookCallback(WEBHOOK_PATH));
  
  // Установка вебхука
  app.get('/', (req, res) => {
    res.send('Bot is running!');
  });
  
  const startServer = async () => {
    try {
      // Для Render получаем URL автоматически
      const renderUrl = process.env.RENDER_EXTERNAL_URL || `https://${process.env.RENDER_SERVICE_NAME}.onrender.com`;
      await bot.telegram.setWebhook(`${renderUrl}${WEBHOOK_PATH}`);
      console.log('Webhook set successfully:', `${renderUrl}${WEBHOOK_PATH}`);
      
      app.listen(PORT, () => {
        console.log(`Bot is running on port ${PORT}`);
        console.log(`Admin username: @${ADMIN_USERNAME}`);
      });
    } catch (error) {
      console.error('Error setting webhook:', error);
    }
  };
  
  startServer();
} else {
  // В разработке используем long polling
  bot.launch()
    .then(() => {
      console.log('Bot started in development mode');
      console.log(`Admin username: @${ADMIN_USERNAME}`);
    })
    .catch(console.error);
}

// Элегантное завершение работы
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = app;
