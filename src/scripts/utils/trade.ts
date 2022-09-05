import { BigNumber } from "ethers"
import { UniswapPair } from "./pair"
import { Uniswap } from "./dex"
import { UniswapPairContract } from "./contracts"
import { Token } from "./token"

export interface Trade {
    amountBorrow: BigNumber
    firstToken: boolean
    profit: BigNumber
}

// Returns maximum potential profit of flashswap: borrowing amountBorrow tokens on DEX0,
// swapping it on another tokens on DEX1 to return debt, and leaving rest of borrowed tokens as a profit.
// Actual profit could be different due to frontrunning.
export function flashswapProfitUniToUni(pair0: UniswapPair, pair1: UniswapPair, amountBorrow: BigNumber, isFirstToken: boolean): BigNumber {
    let tPair0 = Object.assign(new UniswapPair({} as Uniswap, {} as Token, {} as Token, {} as UniswapPairContract), { balance0: pair0.balance0, balance1: pair0.balance1 });
    let tPair1 = Object.assign(new UniswapPair({} as Uniswap, {} as Token, {} as Token, {} as UniswapPairContract), { balance0: pair1.balance0, balance1: pair1.balance1 });
    pair0 = tPair0;
    pair1 = tPair1;
    if (!pair0.hasValue() || !pair1.hasValue()) return BigNumber.from(0)
    if (pair0.token0.address !== pair1.token0.address ||
        pair0.token1.address !== pair1.token1.address) return BigNumber.from(0)

    if (isFirstToken) {
        const amountRequiredB = getAmountInUni(amountBorrow, pair0.balance1!, pair0.balance0!)
        const minSwapAmountIn = getAmountInUni(amountRequiredB, pair1.balance0!, pair1.balance1!)
        return amountBorrow.sub(minSwapAmountIn)
    } else {
        console.log(amountBorrow, pair0.balance0!, pair0.balance1!);
        const amountRequiredA = getAmountInUni(amountBorrow, pair0.balance0!, pair0.balance1!)
        const minSwapAmountIn = getAmountInUni(amountRequiredA, pair1.balance1!, pair1.balance0!)
        return amountBorrow.sub(minSwapAmountIn)
    }
}

// Calculates amount of tokens to borrow.
// Returns amount of token B if Uniswap price of token B is larger,
// otherwise amount of token A. Trade size is half of required amount to 
// move less liquid market to more luquid market.
// 
// trade_size(PI%) ~= (pool_size * PI%) / 2
export function tradeSizeUniToUni(pair0: UniswapPair, pair1: UniswapPair) {
    let tPair0 = Object.assign(new UniswapPair({} as Uniswap, {} as Token, {} as Token, {} as UniswapPairContract), { balance0: pair0.balance0, balance1: pair0.balance1 });
    let tPair1 = Object.assign(new UniswapPair({} as Uniswap, {} as Token, {} as Token, {} as UniswapPairContract), { balance0: pair1.balance0, balance1: pair1.balance1 });
    pair0 = tPair0;
    pair1 = tPair1;
    console.log(tPair0.balance0, tPair0.balance1)
    console.log(tPair1.balance0, tPair1.balance1)

    if (!pair0.hasValue() || !pair1.hasValue()) return BigNumber.from(0)

    const ONE = BigNumber.from('10').pow(18)

    // price0/price1
    const priceDiff = ONE.mul(pair0.balance0!).mul(pair1.balance1!).div(pair0.balance1!).div(pair1.balance0!).sub(ONE)
    console.log(priceDiff, "priceDiff")

    var amountBorrowA
    var amountBorrowB

    // calc based on half of price impact of less liquid market
    if (pair0.balance0!.mul(pair0.balance1!).lt(pair1.balance0!.mul(pair1.balance1!))) {
        amountBorrowA = priceDiff.gte(0) ? pair0.balance0!.mul(priceDiff).div(2).div(ONE).div(2) : undefined
        amountBorrowB = priceDiff.gte(0) ? undefined : pair0.balance1!.mul(-1).mul(priceDiff).div(2).div(ONE).div(2)
    } else {
        amountBorrowA = priceDiff.gte(0) ? pair1.balance0!.mul(priceDiff).div(2).div(ONE).div(2) : undefined
        amountBorrowB = priceDiff.gte(0) ? undefined : pair1.balance1!.mul(-1).mul(priceDiff).div(2).div(ONE).div(2)
    }

    console.log(amountBorrowA, amountBorrowB, "Borrow")

    // check max borrow reserves
    if (amountBorrowA && amountBorrowA.gte(pair0.balance0!)) {
        amountBorrowA = pair0.balance0
    }
    if (amountBorrowB && amountBorrowB.gte(pair0.balance1!)) {
        amountBorrowB = pair0.balance1
    }

    const amountBorrow = amountBorrowA ? amountBorrowA : amountBorrowB!
    const firstToken = !!amountBorrowA
    const profit = flashswapProfitUniToUni(pair0, pair1, amountBorrow, firstToken)
    console.log(amountBorrow, firstToken, profit)
    return { amountBorrowA: amountBorrowA, amountBorrowB: amountBorrowB, firstToken: firstToken, profit: profit }
}

// Returns a required input amount of the other asset, 
// given an output amount of an asset and pair reserves.
export function getAmountInUni(amountOut: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber): BigNumber {
    const numerator = reserveIn.mul(amountOut).mul(1000)
    const denominator = reserveOut.sub(amountOut).mul(997)
    return numerator.div(denominator).add(1)
}

// Returns the maximum output amount of the other asset, 
// given an input amount of an asset and pair reserves.
export function getAmountOutUni(amountIn: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber): BigNumber {
    const amountInWithFee = amountIn.mul(997)
    const numerator = amountInWithFee.mul(reserveOut)
    const denominator = reserveIn.mul(1000).add(amountInWithFee)
    return numerator.div(denominator)
}