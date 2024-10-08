const axios = require('axios')
const { get } = require('lodash')
const { GAMMA_ENDPOINT } = require('../../../lib/constants')

const getTradingApy = async poolAddress => {
  let response, apy

  try {
    response = await axios.get(`${GAMMA_ENDPOINT}polygon/hypervisors/allData`)
    apy = get(response, `data.${poolAddress.toLowerCase()}.returns.daily.feeApr`, 0)
    apy = parseFloat(apy) * 100
  } catch (err) {
    console.error('Gamma API error: ', err)
    apy = 0
  }

  return apy.toFixed(2)
}

module.exports = {
  getTradingApy,
}
