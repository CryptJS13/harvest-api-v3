const BigNumber = require('bignumber.js')
const { web3ZKSYNC } = require('../../lib/web3')
const { velocoreLens, token: tokenContractData } = require('../../lib/web3/contracts')
const { getTokenPrice } = require('..')

const getPrice = async poolAddress => {
  const { methods: lensMethods, contract: lensContract } = velocoreLens
  const {
    methods: { getDecimals },
    contract: { abi: tokenAbi },
  } = tokenContractData

  const web3 = web3ZKSYNC
  const lensInstance = new web3.eth.Contract(lensContract.abi, lensContract.address.mainnet)

  const poolInfo = await lensMethods.queryPool(poolAddress, lensInstance)
  let token0 =
    '0x' +
    poolInfo.listedTokens[0].substr(
      poolInfo.listedTokens[0].length - 40,
      poolInfo.listedTokens[0].length - 1,
    )
  if (token0 == '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    token0 = '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91' //WETH
  }
  let token1 =
    '0x' +
    poolInfo.listedTokens[1].substr(
      poolInfo.listedTokens[1].length - 40,
      poolInfo.listedTokens[1].length - 1,
    )
  if (token1 == '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    token1 = '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91' //WETH
  }
  const token0Price = new BigNumber(await getTokenPrice(token0))
  const token1Price = new BigNumber(await getTokenPrice(token1))

  const token0Instance = new web3.eth.Contract(tokenAbi, token0)
  const token0Decimals = await getDecimals(token0Instance)
  const token1Instance = new web3.eth.Contract(tokenAbi, token1)
  const token1Decimals = await getDecimals(token1Instance)
  const lpTokenInstance = new web3.eth.Contract(tokenAbi, poolAddress)
  const lpTokenDecimals = await getDecimals(lpTokenInstance)

  const token0Amount = new BigNumber(poolInfo.reserves[0]).div(10 ** token0Decimals)
  const token1Amount = new BigNumber(poolInfo.reserves[1]).div(10 ** token1Decimals)

  const totalSupply = new BigNumber(poolInfo.mintedLPTokens[0]).div(10 ** lpTokenDecimals)
  const totalValue = token0Amount.times(token0Price).plus(token1Amount.times(token1Price))
  return totalValue.div(totalSupply).toFixed()
}

module.exports = {
  getPrice,
}
