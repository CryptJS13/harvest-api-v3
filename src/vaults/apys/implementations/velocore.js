const BigNumber = require('bignumber.js')
const { web3ZKSYNC } = require('../../../lib/web3')
const { velocoreLens, token: tokenContractData } = require('../../../lib/web3/contracts')
const { getTokenPrice } = require('../../../prices')

const getApy = async (poolAddress, reduction) => {
  const { methods: lensMethods, contract: lensContract } = velocoreLens
  const {
    methods: { getDecimals },
    contract: { abi: tokenAbi },
  } = tokenContractData

  const secsPerYear = 3600 * 24 * 365.25
  const web3 = web3ZKSYNC
  const lensInstance = new web3.eth.Contract(lensContract.abi, lensContract.address.mainnet)

  const gaugeInfo = await lensMethods.queryGauge(
    poolAddress,
    '0x0000000000000000000000000000000000000000',
    lensInstance,
  )
  const rewardPrice = new BigNumber(
    await getTokenPrice('0x99bBE51be7cCe6C8b84883148fD3D12aCe5787F2'),
  )
  const lpTokenPrice = new BigNumber(await getTokenPrice(poolAddress))

  const lpTokenInstance = new web3.eth.Contract(tokenAbi, poolAddress)
  const lpTokenDecimals = await getDecimals(lpTokenInstance)

  const stakedAmount = new BigNumber(gaugeInfo.stakedAmounts[0]).div(10 ** lpTokenDecimals)
  const emissionRate = new BigNumber(gaugeInfo.emissionRate).div(1e18)

  const apr = emissionRate
    .times(secsPerYear)
    .times(rewardPrice)
    .div(stakedAmount.times(lpTokenPrice))
    .times(100)
    .times(reduction)

  return apr.toFixed()
}

module.exports = {
  getApy,
}
