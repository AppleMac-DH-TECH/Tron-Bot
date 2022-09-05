import { addressEquals, logBalance } from "./utils/utils"
import cfg from "../config.json"
import { BigNumber, utils } from "ethers"
import { getPairContract, tokenInfo } from "./utils/uni"
import { flashswapProfitUniToUni, tradeSizeUniToUni } from "./utils/trade"
import tronWeb from '../connector'
import ITRC20ABI from '../constants/abis/ITRC20_abi.json'

// deployed FlashSwap.sol contract
const flashswapAddress = 'TTLtbytaYGVm5TEVZKkTL8Vvp1GoLFZu8r'
const routeAddresses = [
    // WETH
    // [cfg.WETH, cfg.USDT],
    // [cfg.WETH, cfg.USDC],
    [cfg.ICR, cfg.WTRX],
    // [cfg.WETH, cfg.DAI],
    // [cfg.WETH, cfg.WBTC],
    // // WBTC
    // // [cfg.WBTC, cfg.USDT], // empty pool on sushi
    // // [cfg.WBTC, cfg.USDC], // no pair on sushi
    // // [cfg.WBTC, cfg.DAI], // no pair on sushi
    // // other
    // // [cfg.FNK, cfg.USDT], // no pair on sushi
    // // [cfg.FEI, cfg.WETH], // no pair on sushi    
    // [cfg.SHIB, cfg.WETH],
    // [cfg.UNI, cfg.WETH],
    // // [cfg.SAND, cfg.WETH], // no pair on sushi
    // [cfg.AAVE, cfg.WETH],
    // [cfg.LINK, cfg.WETH],
    // [cfg.SNX, cfg.WETH],
    // [cfg.CRV, cfg.WETH],
    // [cfg.COMP, cfg.WETH]
]
const dex0 = {
    name: "Uniswap",
    factory: cfg.uni.factory,
    router: cfg.uni.router
}
const dex1 = {
    name: "Sushiswap",
    factory: cfg.sushi.factory,
    router: cfg.sushi.router
}

var senderAddress
var isSwapping = false
var routes = []

// Flashswaps by borrowing amountBorrow of borrowTokenAddress on dex0, 
// swapping it for another token required to return a loan on dex1,
// and sending the rest of borrowed token to a sender.
async function flashswap(pair, tokenAAddress, tokenBAddress, borrowTokenAddress, amountBorrow) {
    const amount0 = addressEquals(tokenAAddress, borrowTokenAddress) ? amountBorrow : BigNumber.from(0)
    const amount1 = addressEquals(tokenBAddress, borrowTokenAddress) ? amountBorrow : BigNumber.from(0)

    let ethAddr = tronWeb.address.toHex(dex1.router);
    ethAddr = ethAddr.replace('41', '0x');
    console.log(ethAddr)

    const data = utils.defaultAbiCoder.encode(['address'], [ethAddr])

    try {
        console.log(`\n[flashswap] executing flashswap...`)
        console.log(pair)
        console.log(amount0, amount1, flashswapAddress, data, 'parameters')
        const receipt = await pair.swap(amount0, amount1, flashswapAddress, data).send()
        console.log(receipt)
        // console.log(`[flashswap] flashswap success: blockNumber = ${receipt.blockNumber}, status = ${receipt.status}, tx = ${receipt.transactionHash}, gasUsed = ${receipt.gasUsed.toString()}\n`)
        return true
    } catch (error) {
        console.log(`[flashswap] flashswap failed: ${error}\n`)
        return false
    }
}

async function checkRoute(blockNumber, route) {
    const _reserves0 = await route.reserve0
    const _reserves1 = await route.reserve1
    const pair0 = { balance0: _reserves0[0], balance1: _reserves0[1] }
    const pair1 = { balance0: _reserves1[0], balance1: _reserves1[1] }

    // calc how much token should be borrowed to balance prices between two DEXes
    const trade = tradeSizeUniToUni(pair0, pair1)
    const amountBorrow = trade.amountBorrowA ? trade.amountBorrowA : trade.amountBorrowB
    const tokenBorrowInfo = trade.amountBorrowA ? route.tokenAInfo : route.tokenBInfo

    // calculate max potential profit by flashswapping amountBorrow tokens
    const profit = flashswapProfitUniToUni(pair0, pair1, trade.amountBorrowA ? trade.amountBorrowA : trade.amountBorrowB, Boolean(trade.amountBorrowA))

    // console.log(blockNumber, dex0, dex1, route.tokenAInfo, route.tokenBInfo, _reserves0, _reserves1, tokenBorrowInfo, amountBorrow, profit, true)
    console.log(profit, "profit")
    console.log(cfg.watchOnly, profit.gte(0), isSwapping)

    // swap if Uniswap price is higher than Sushiswap and there is an opportunity for profit
    if (!cfg.watchOnly && profit.gte(0) && !isSwapping) {
        isSwapping = true
        const success = await flashswap(route.pair0, route.tokenAInfo.address, route.tokenBInfo.address, tokenBorrowInfo.address, amountBorrow)
        isSwapping = false
        if (success) {
            console.log("success")
            await logBalance(senderAddress, route.tokenAInfo.address, route.tokenBInfo.address)
        }
    }
    console.log(blockNumber, "finsihed")
}

async function buildRoute(tokenAAddress, tokenBAddress) {
    const pair0 = await getPairContract(dex0.factory, tokenAAddress, tokenBAddress)
    const pair1 = await getPairContract(dex1.factory, tokenAAddress, tokenBAddress)
    if (pair0.address === 0 || pair1.address === 0) {
        console.error(`No pair for route [${tokenAAddress}, ${tokenBAddress}]: dex0 = ${pair0.address}, dex1 = ${pair1.address}`)
        process.exit(1)
    }

    // get sorted from uniswap pair contract
    const tokenAInfo = await tokenInfo(tokenAAddress)
    const tokenBInfo = await tokenInfo(tokenBAddress)

    const tokenA = await tronWeb.contract(ITRC20ABI, tokenAAddress)
    const tokenB = await tronWeb.contract(ITRC20ABI, tokenBAddress)

    const reserve0 = [ await tokenA.balanceOf(pair0.address).call(), await tokenB.balanceOf(pair0.address).call() ]
    const reserve1 = [ await tokenA.balanceOf(pair1.address).call(), await tokenB.balanceOf(pair1.address).call() ]

    console.log(reserve0, reserve1, "reserve")

    return {
        tokenAInfo: tokenAInfo,
        tokenBInfo: tokenBInfo,
        pair0: pair0.contract,
        pair1: pair1.contract,
        reserve0: reserve0,
        reserve1: reserve1,
    }
}

export async function checkAllRoutes() {
    console.log('Hello')
    routes.forEach(route => checkRoute(1, route))
}

export async function buildAllRoutes() {
    senderAddress = await tronWeb.address.fromPrivateKey(process.env.REACT_APP_Private_Key)
    console.log(senderAddress)

    for (var i = 0; i < routeAddresses.length; i++) {
        const [tokenAAddress, tokenBAddress] = routeAddresses[i]
        const route = await buildRoute(tokenAAddress, tokenBAddress)
        routes.push(route)
        // console.log(`route[${i}]: [${route.tokenAInfo.symbol}/${route.tokenBInfo.symbol}]`)
    }

    // const poolId = bal.getPoolId(cfg.WETH, cfg.DAI)
    // const pool = bal.getPoolContract(poolId)

    /*
    ethers.provider.on('block', async function (blockNumber) {
        console.log(blockNumber)
        routes.forEach(route => checkRoute(blockNumber, route))

        // TODO: take vault

    })
    */
}