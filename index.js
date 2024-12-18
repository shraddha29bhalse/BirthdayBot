const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');

// Use environment variables for sensitive data
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);
const app = express();
app.use(bodyParser.json());

let userBirthdays = {}; // Store user data in memory (use DB for production)

// Webhook endpoint for Telegram
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Bot Commands
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome! Use /setbirthday <MM-DD> to set your birthday.');
});

bot.onText(/\/setbirthday (\d{2}-\d{2})/, (msg, match) => {
  const chatId = msg.chat.id;
  const birthday = match[1];
  const name = msg.chat.first_name || 'User';

  const birthdayRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  if (!birthdayRegex.test(birthday)) {
    bot.sendMessage(chatId, 'Invalid date format! Please use MM-DD.');
    return;
  }

  userBirthdays[chatId] = { name, birthday };
  bot.sendMessage(chatId, `Your birthday has been set to ${birthday}`);
});

// Cron Job to Send Birthday Wishes at Midnight
cron.schedule('0 0 * * *', () => {
  console.log('Checking for birthdays...');
  const today = new Date();
  const currentDate = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  Object.keys(userBirthdays).forEach((chatId) => {
    const user = userBirthdays[chatId];
    if (user.birthday === currentDate) {
      bot.sendMessage(chatId, `🎉 Happy Birthday, ${user.name}! 🎉`);
    }
  });
});

// Start Express Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Set Webhook
const webhookURL = process.env.WEBHOOK_URL; // Render's live URL
bot.setWebHook(`${webhookURL}/bot${token}`);
