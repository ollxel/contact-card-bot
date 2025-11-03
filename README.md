# Contact‑router Telegram Bot

A tiny Node.js bot that asks every user for a **contact card** and forwards it
to a predefined admin username. The admin also runs the same bot and receives
the cards automatically.

## ✨ Features

* `/start` → “Send me a contact” prompt.
* Accepts only `contact` messages, ignores everything else.
* Forwards the received contact to the admin (`ADMIN_USERNAME`).
* Admin is recognised by his username (or by the chat id after first start).
* Simple health‑check HTTP endpoint (required by Render).
* Deployable on Render with a one‑line Dockerfile.

## 🛠️ Prerequisites

* Node 20 (the Docker image already contains it).
* A Telegram bot token from **@BotFather**.
* The Telegram **username** (without the `@`) of the admin who will receive contacts.

## 📁 Repository layout
.
├─ .env.example # example config
├─ Dockerfile # Render ready
├─ index.js # bot source
├─ package.json
└─ README.md

## 🚀 Local development

```bash
# 1️⃣ Clone the repo
git clone https://github.com/ollxel/contact-card-bot.git
cd contact-router-bot

# 2️⃣ Install dependencies
npm install

# 3️⃣ Create a .env file (copy from .env.example)
cp .env.example .env
# edit .env and put your values

# 4️⃣ Run the bot
npm start
