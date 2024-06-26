const { web3 } = require('./web3')
const axios = require('axios')
const https = require('https')
const { get, find, sum } = require('lodash')
const BigNumber = require('bignumber.js')
const uniswapContract = require('./web3/contracts/uniswap/contract.json')
const uniswapMethods = require('./web3/contracts/uniswap/methods')
const { pool: poolContractData } = require('./web3/contracts')
const addresses = require('./data/addresses.json')
const getPriceOnUniswap = require('../prices/implementations/uniswap-pair.js').getPrice
const {
  HARVEST_LAUNCH_DATE,
  HISTORICAL_AVERAGE_PROFIT_SHARING_APY_ENDPOINT,
  TOTAL_GAS_SAVED_ENDPOINT,
  MONTHLY_PROFITS_ENDPOINT,
  UI_DATA_FILES,
} = require('./constants')
const { getUIData } = require('./data')

const getTotalFARMSupply = () => {
  const earlyemissions = [57569.1, 51676.2, 26400.0, 24977.5]
  const weeksSinceLaunch = Math.floor(
    (new Date() - HARVEST_LAUNCH_DATE) / (7 * 24 * 60 * 60 * 1000),
  ) // Get number of weeks (including partial) between now, and the launch date
  let thisWeeksSupply = 690420

  if (weeksSinceLaunch <= 208) {
    const emissionsWeek5 = 23555.0
    const emissionsWeeklyScale = 0.95554375

    const totalOfEarlyEmissions = sum(earlyemissions)

    thisWeeksSupply =
      totalOfEarlyEmissions +
      (emissionsWeek5 * (1 - Math.pow(emissionsWeeklyScale, weeksSinceLaunch - 4))) /
        (1 - emissionsWeeklyScale)
  }

  return thisWeeksSupply
}

const getMonthlyProfits = async () => {
  const agent = new https.Agent({
    rejectUnauthorized: false, // Ignore SSL errors (this is ok since there is no sensitive data)
  })

  let resultETH, response

  try {
    response = await axios.get(`${MONTHLY_PROFITS_ENDPOINT}?network=eth`, {
      httpsAgent: agent,
    })

    resultETH = get(response, 'data.weeklyAllProfit')
  } catch (err) {
    console.error('Error getting monthly profits: ', err)
  }

  return new BigNumber(resultETH).dividedBy(7).times(30).times(1.6).toFixed(2)
}

const getHistoricalAverageProfitSharingAPY = async () => {
  const agent = new https.Agent({
    rejectUnauthorized: false, // Ignore SSL errors (this is ok since there is no sensitive data)
  })

  let result = null

  try {
    const response = await axios.get(HISTORICAL_AVERAGE_PROFIT_SHARING_APY_ENDPOINT, {
      httpsAgent: agent,
    })

    result = get(response, 'data.data')
  } catch (err) {
    console.error('Error getting historical FARM prices from dashboard API: ', err)
  }

  return result
}

const getTotalGasSaved = async () => {
  const agent = new https.Agent({
    rejectUnauthorized: false, // Ignore SSL errors (this is ok since there is no sensitive data)
  })

  let result = null

  try {
    const response = await axios.get(TOTAL_GAS_SAVED_ENDPOINT, {
      httpsAgent: agent,
    })

    result = get(response, 'data.data')
  } catch (err) {
    console.error('Error getting total gas saved by protocol: ', err)
  }

  return result
}

const getTotalMarketCap = async () => {
  const totalCirculatingSupply = getTotalFARMSupply()

  const currentFARMPrice = await getPriceOnUniswap(addresses.FARM, addresses.USDC)

  const totalMarketCap = new BigNumber(totalCirculatingSupply).times(currentFARMPrice).toFixed(2)

  return totalMarketCap
}

const getPercentOfFARMStaked = async () => {
  const pools = await getUIData(UI_DATA_FILES.POOLS)
  const farmPool = find(pools, pool => pool.id === 'profit-sharing-farm')

  const { methods: poolMethods, contract: poolContract } = poolContractData

  const totalSupply = getTotalFARMSupply()

  const farmPoolInstance = new web3.eth.Contract(poolContract.abi, farmPool.contractAddress)

  const farmPoolTotalSupply = await poolMethods.totalSupply(farmPoolInstance)

  const profitSharingPoolStakedFarm = new BigNumber(farmPoolTotalSupply)

  const result = BigNumber(profitSharingPoolStakedFarm)
    .dividedBy(new BigNumber(10).pow(18))
    .dividedBy(totalSupply)
    .times(100)
    .toString()

  return result
}

const getFARMPriceFromUniswap = async () => {
  const uniswapInstance = new web3.eth.Contract(
    uniswapContract.abi,
    uniswapContract.address.mainnet,
  )

  const result = await uniswapMethods.getAmountsOut(
    new BigNumber(10).pow(18).toString(),
    [addresses.FARM, addresses.USDC],
    uniswapInstance,
  )

  const price = new BigNumber(result[1]).dividedBy(new BigNumber(10).pow(6))

  return price.toString()
}

module.exports = {
  getFARMPriceFromUniswap,
  getPercentOfFARMStaked,
  getTotalFARMSupply,
  getHistoricalAverageProfitSharingAPY,
  getTotalGasSaved,
  getTotalMarketCap,
  getMonthlyProfits,
}
