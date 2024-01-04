require("dotenv").config();
const express = require("express");
const ethers = require("ethers");
const uniswapV3 = require("./abis/Uniswap-V3.json");
const uniswapV2 = require("./abis/Uniswap-V2.json");
const fetch = require("node-fetch");

const app = express();
const port = process.env.PORT;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const uniswapV3ContractAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const uniswapV2ContractAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const provider = new ethers.providers.WebSocketProvider(
  `wss://eth-mainnet.g.alchemy.com/v2/wEwSmlha_J-gyLgXYUR1gUpikFiaeON2`
);

app.use(express.json());

app.post("/poolCreated", async (req, res) => {
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
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  timeZoneName: 'short',
};

const formattedDate = now.toLocaleString('en-US', options);

const message = `
New Liquidity Pool found on ${isV2 ? 'Uniswap V2' : 'Uniswap V3'}  Detected!

Token A: ${info.token0}
Token B: ${info.token1}

Dexscreener info: [Dexscreener](https://dexscreener.com/ethereum/${info.pool})
Dextools info: [Dextools](https://www.dextools.io/app/en/ether/pair-explorer/${info.pool})

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
});

async function sendToTelegram(message) {
  const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const params = {
    chat_id: CHAT_ID,
    text: message,
  };

  const response = await fetch(`${apiUrl}?${new URLSearchParams(params)}`, {
    method: "GET",
  });

  const data = await response.json();

  if (!data.ok) {
    console.error("Failed to send message to Telegram:", data);
  }
}

const uniswapV3Contract = new ethers.Contract(uniswapV3ContractAddress, uniswapV3, provider);
const uniswapV2Contract = new ethers.Contract(uniswapV2ContractAddress, uniswapV2, provider);
uniswapV3Contract.on("PoolCreated", async (token0, token1, fee, tickSpacing, pool) => {
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
});

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
