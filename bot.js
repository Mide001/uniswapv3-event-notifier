require("dotenv").config();
const express = require("express");
const ethers = require("ethers");
const uniswapV3 = require("./abis/Uniswap-V3.json");
const uniswapV2 = require("./abis/Uniswap-V2.json");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

const app = express();
const port = process.env.PORT;

var store = require("store");
var subscribed_users = store.get("subscribed");

let types = ["uint256", "address"];

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const uniswapV3ContractAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const uniswapV2ContractAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const provider = new ethers.providers.WebSocketProvider(
  `wss://eth-mainnet.g.alchemy.com/v2/wEwSmlha_J-gyLgXYUR1gUpikFiaeON2`
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Is Running");
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const introMessage = `
Welcome to the Uniswap API Bot!

This bot provides real-time notifications about new liquidity pools on Uniswap V3/V2. Stay informed about the latest updates and opportunities in the DeFi space.

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

  if (subscribed_users.includes(chatId)) {
    bot.sendMessage(
      chatId,
      "You are already subscribed to the notification system"
    );
    return;
  }

  subscribed_users.push(chatId);
  store.set("subscribed", subscribed_users);

  bot.sendMessage(chatId, "Notification On For Tracker Bot");
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

app.post("/poolCreated", async (req, res) => {
  try {
    const { token0, token1, fee, tickSpacing, pool, isV2 } = req.body;

    let info = {
      token0: token0,
      token1: token1,
      fee: fee,
      tickSpacing: tickSpacing,
      pool: pool,
    };

    console.log(JSON.stringify(info, null, 5));

    const now = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZoneName: "short",
    };

    const formattedDate = now.toLocaleString("en-US", options);

    const message = `
New Liquidity Pool found on ${isV2 ? "Uniswap V2" : "Uniswap V3"}  Detected!

Token A: ${info.token0}
Token B: ${info.token1}

Dexscreener info: [Dexscreener](https://dexscreener.com/ethereum/${info.pool})
Dextools info: [Dextools](https://www.dextools.io/app/en/ether/pair-explorer/${
      info.pool
    })

Date and Time: ${formattedDate}

Powered by Demeter-Labs
`;

    console.log(message);

    /* const message = `
New Liquidity Pool found on ${isV2 ? 'Uniswap V2' : 'Uniswap V3'}  Detected!

Token A: ${info.token0}
Token B: ${info.token1}

Dexscreener info: [Dexscreener](https://dexscreener.com/ethereum/${info.pool})
Dextools info: [Dextools](https://www.dextools.io/app/en/ether/pair-explorer/${info.pool})

Powered by Demeter-Labs
`; */

    await sendToTelegram(message);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error processing /poolCreated: ", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

async function sendToTelegram(message) {
    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
    // Check if subscribed_users is an array
    if (!Array.isArray(subscribed_users)) {
      console.error("subscribed_users is not an array:", subscribed_users);
      return;
    }
  
    // Iterate over all subscribed users and send the message
    for (const chatId of subscribed_users) {
      const params = {
        chat_id: chatId,
        text: message,
      };
  
      try {
        const response = await fetch(`${apiUrl}?${new URLSearchParams(params)}`, {
          method: "GET",
        });
  
        const data = await response.json();
  
        if (!data.ok) {
          console.error(
            `Failed to send message to Telegram user ${chatId}:`,
            data
          );
        }
      } catch (error) {
        console.error(`Error sending message to Telegram user ${chatId}:`, error);
      }
    }
  }
  

const uniswapV3Contract = new ethers.Contract(
  uniswapV3ContractAddress,
  uniswapV3,
  provider
);
const uniswapV2Contract = new ethers.Contract(
  uniswapV2ContractAddress,
  uniswapV2,
  provider
);
uniswapV3Contract.on(
  "PoolCreated",
  async (token0, token1, fee, tickSpacing, pool) => {
    const info = {
      token0: token0,
      token1: token1,
      fee: fee,
      tickSpacing: tickSpacing,
      pool: pool,
      isV2: false,
    };

    // Trigger the /poolCreated endpoint with the event data
    await fetch(`http://localhost:${port}/poolCreated`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(info),
    });
  }
);

uniswapV2Contract.on("PairCreated", async (token0, token1, pair, noname) => {
  let info = {
    token0: token0,
    token1: token1,
    fee: null,
    tickSpacing: null,
    pool: pair,
    isV2: true,
  };

  // Trigger the /poolCreated endpoint with the event data
  await fetch(`http://localhost:${port}/poolCreated`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(info),
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
