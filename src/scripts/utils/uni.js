import { utils } from 'ethers'
import tronWeb from '../../connector'
import FactoryABI from '../../constants/abis/factory_abi.json'
import PairABI from '../../constants/abis/pair_abi.json'
import ITRC20ABI from '../../constants/abis/ITRC20_abi.json'

// returns Uniswap pair contract
export async function getPairContract(factoryAddress, tokenAAddress, tokenBAddress) {
    var factory = await tronWeb.contract(FactoryABI, factoryAddress)
    var pairAddress = await factory.getPair(tokenAAddress, tokenBAddress).call()
    var pairTronAddress = await tronWeb.address.fromHex(pairAddress)
    console.log(pairTronAddress, "pairAddress")
    return { contract: await tronWeb.contract(PairABI, pairAddress), address: pairTronAddress }
}

// returns token info object
export async function tokenInfo(tokenAddress) {
    console.log(tokenAddress);
    const token = await tronWeb.contract(ITRC20ABI, tokenAddress)
    return {
        address: tokenAddress,
        name: await token.name().call(),
        symbol: await token.symbol().call(),
        decimals: await token.decimals().call(),
        format: function (amount, withSymbol) {
            const s = utils.formatUnits(amount, this.decimals)
            if (withSymbol) return `${s} ${this.symbol}`
            return s
        }
    }
}