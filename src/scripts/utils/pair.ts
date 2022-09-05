import { BigNumber, Contract } from "ethers"
import { UniswapPairContract } from "./contracts"
import { DEX, Uniswap } from "./dex"
import { Token } from "./token"

export abstract class Pair {
    readonly id: string
    readonly dex: DEX
    readonly token0: Token
    readonly token1: Token
    readonly contract: Contract
    lastChangeBlock: number

    abstract hasValue: () => boolean
    abstract price0: () => BigNumber | undefined
    abstract price1: () => BigNumber | undefined

    constructor(dex: DEX, token0: Token, token1: Token, contract: Contract) {
        this.id = Pair.id(dex.name, token0.address, token1.address)
        this.dex = dex
        this.token0 = token0
        this.token1 = token1
        this.contract = contract
        this.lastChangeBlock = 0
    }

    static id: (dexName: string, token0: string, token1: string) => string
        = (d, t0, t1) => '_id_' + d + t0 + t1

    name(): string {
        return `${this.dex.name}-${this.token0.symbol}/${this.token1.symbol}`
    }
}


export class UniswapPair extends Pair {
    contract: UniswapPairContract
    balance0: BigNumber | undefined
    balance1: BigNumber | undefined

    constructor(dex: Uniswap, token0: Token, token1: Token, contract: UniswapPairContract) {
        super(dex, token0, token1, contract)

        this.contract = contract
    }

    print = () => {
        return "111"
    }

    hasValue = () => {
        return !!this.balance0 && !!this.balance1
    }

    price0 = () => {
        if (!this.hasValue) return
        return this.balance1!.mul(BigNumber.from(10).pow(this.token0.decimals)).div(this.balance0!)
    }

    price1 = () => {
        if (!this.hasValue) return
        return this.balance0!.mul(BigNumber.from(10).pow(this.token1.decimals)).div(this.balance1!)
    }

    updateReserves(balance0: BigNumber, balance1: BigNumber, block: number): void {
        this.balance0 = balance0
        this.balance1 = balance1
        this.lastChangeBlock = block
    }
}