import { BigNumber, utils } from "ethers"
import { Token } from "./token"
import tronWeb from '../../connector'
import ITRC20ABI from '../../constants/abis/ITRC20_abi.json'

export function runScript(script: () => Promise<any>) {
    script()
        .then(() => process.exit(0))
        .catch(error => {
            console.log(error)
            process.exit(1)
        })
}

export function runApp(app: () => Promise<any>) {
    app()
        .then(() => process.stdin.resume())
        .catch(error => {
            console.log(error)
            process.exit(1)
        })
}

export function objectsToTokens(objects: any[]): Map<string, Token> {
    const tokens: Map<string, Token> = new Map()
    objects.forEach(function (o) {
        const token = new Token(o.address, o.name, o.symbol, o.decimals)
        tokens.set(o.address, token)
    })
    return tokens
}

export async function logBalance(address: string, ...tokens: string[]) {
    console.log(`Balance of ${address}:`)
    const ethBalance = await tronWeb.trx.getBalance(address)
    console.log(`--- ETH: ${utils.formatEther(ethBalance)}`)

    for (const tokenAddress of tokens) {
        const token = await tronWeb.contract(ITRC20ABI, tokenAddress)
        const decimals = await token.decimals()
        const symbol = await token.symbol()
        const balance = await token.balanceOf(address)
        console.log(`--- ${symbol}: ${utils.formatUnits(balance, decimals)}`)
    }
}

export function logMinProfits(tokens: Map<string, Token>, minProfits: Map<string, BigNumber>) {
    minProfits.forEach((profit, tokenAddress) => {
        const token = tokens.get(tokenAddress)
        console.log(`min profit of ${token?.symbol}: ${token?.format(profit, true)}`)
    })
}

export function addressEquals(address1: string, address2: string): boolean {
    return address1.toUpperCase() === address2.toUpperCase()
}

export const delay: (ms: number) => Promise<any> = ms => new Promise(resolve => setTimeout(resolve, ms, 0))