require('dotenv').config();
const express = require('express');
const ethers = require('ethers');
const uniswapV3 = require('./abis/Uniswap-V3.json');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const uniswapV3Contract = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const provider = new ethers.providers.WebSocketProvider(
    `wss://eth-mainnet.g.alchemy.com/v2/wEwSmlha_J-gyLgXYUR1gUpikFiaeON2`
);

app.use(express.json());

app.post('/poolCreated', async (req, res) => {
    const { token0, token1, fee, tickSpacing, pool } = req.body;

    let info = {
        token0: token0,
        token1: token1,
        fee: fee,
        tickSpacing: tickSpacing,
        pool: pool,
    }

    console.log(JSON.stringify(info, null, 5));


    await sendToTelegram(JSON.stringify(info, null, 5));


    res.status(200).json({ success: true });
});

async function sendToTelegram(message) {
    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const params = {
        chat_id: CHAT_ID,
        text: message,
    };

    const response = await fetch(`${apiUrl}?${new URLSearchParams(params)}`, {
        method: 'GET'
    });

    const data = await response.json();

    if (!data.ok) {
        console.error('Failed to send message to Telegram:', data);
    }
}

const contract = new ethers.Contract(uniswapV3Contract, uniswapV3, provider);
contract.on("PoolCreated", async (token0, token1, fee, tickSpacing, pool) => {
    const info = {
        token0,
        token1,
        fee,
        tickSpacing,
        pool,
    };

    // Trigger the /poolCreated endpoint with the event data
    await fetch(`https://uniswapv3-event-notifier.onrender.com/poolCreated`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(info),
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});