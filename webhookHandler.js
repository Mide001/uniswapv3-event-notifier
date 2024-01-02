require('dotenv').config();
const ethers = require('ethers');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const { sharedEventsQueue } = require('./uniswapEventWatcher');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: true
});

const app = express();
app.use(express.json());

const { PORT } = process.env;

var store = require('store');
var subscribed_users = store.get("subscribed");

let types = ["uint256", "address"];

async function sendTelegramMessage(chatId, message) {
    try {
        await bot.sendMessage(chatId, message);
    } catch (e) {
        console.error("Error sending Telegram message:", e.message);
    }
}

app.get("/", (req, res) => {
    res.send("Uniswap V3 API Bot Is Running");
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    const introMessage = `
Welcome to the Uniswap V3 API Bot!

This bot provides real-time notifications about new liquidity pools on Uniswap V3. Stay informed about the latest updates and opportunities in the DeFi space.

Commands:
/subscribe - Subscribe to the newsletter for timely notifications.
/unsubscribe - Unsubscribe from the newsletter.

Feel free to use these commands and explore the features of this bot!`;

    bot.sendMessage(chatId, introMessage);
});

bot.onText(/\/subscribe/, (msg) => {
    if (!subscribed_users) {
        subscribed_users = []; 
    }
    const chatId = msg.chat.id;

    // Retrieve subscribed users array data
    if (subscribed_users.includes(chatId)) {
        bot.sendMessage(chatId, "You're already subscribed to the newsletter!");
        return;
    }

    // Push the new subscriber and update the store
    subscribed_users.push(chatId);
    store.set("subscribed", subscribed_users);

    bot.sendMessage(chatId, "You're subscribed to the newsletter!");
});

bot.onText(/\/unsubscribe/, (msg) => {
    const chatId = msg.chat.id;

    if (!subscribed_users || !subscribed_users.includes(chatId)) {
        bot.sendMessage(chatId, "You're not subscribed to the newsletter!");
        return;
    }

    // Filter out the user and update the store
    const newArr = subscribed_users.filter((userId) => userId !== chatId);
    store.set("subscribed", newArr);

    bot.sendMessage(chatId, "You're unsubscribed from the newsletter!");
});

app.post("/", async (req, res) => {
    const testMessage = "This is a test message.";

    // Send messages to all subscribed chat IDs
    for (const chatId of subscribed_users) {
        await sendTelegramMessage(chatId, testMessage);
    }

    res.send("Test message sent to all subscribed users.");
});

app.post("/webhook", async (req, res) => {
    // Pop events from the shared array
    while (sharedEventsQueue.length > 0) {
        const event = sharedEventsQueue.shift();
        const message = `
New Liquidity Pool found on Uniswap V3 Detected!
More info: https://dexscreener.com/ethereum/${event.pool}
Powered by Demeter-Labs
`;

        // Send messages to all subscribed chat IDs
        for (const chatId of subscribed_users) {
            await sendTelegramMessage(chatId, message);
        }
    }

    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Express server is listening on PORT ${PORT}...`);
});