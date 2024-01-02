const ethers = require('ethers');
const uniswapV3 = require('./abis/Uniswap-V3.json');

const sharedEventsQueue = [];

async function main() {
    const uniswapV3Contract = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    const provider = new ethers.providers.WebSocketProvider(
        `wss://eth-mainnet.g.alchemy.com/v2/wEwSmlha_J-gyLgXYUR1gUpikFiaeON2`
    );

    const contract = new ethers.Contract(uniswapV3Contract, uniswapV3, provider);
    contract.on("PoolCreated", (token0, token1, fee, tickSpacing, pool) => {
        let info = {
            token0: token0,
            token1: token1,
            fee: fee,
            tickSpacing: tickSpacing,
            pool: pool,
        };

        sharedEventsQueue.push(info);
    });

    console.log("API is running...");
}


main();

module.exports = {
    sharedEventsQueue
};