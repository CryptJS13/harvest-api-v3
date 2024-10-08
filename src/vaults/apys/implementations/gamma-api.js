const axios = require('axios')
const { get } = require('lodash')
const { GAMMA_ENDPOINT } = require('../../../lib/constants')

const getApy = async (masterchef, poolAddress, reduction) => {
  let response, apy

  try {
    response = await axios.get(`${GAMMA_ENDPOINT}quickswap/polygon/allRewards2`)
    apy = get(
      response,
      `data.${masterchef.toLowerCase()}.pools.${poolAddress.toLowerCase()}.apr`,
      0,
    )
    apy = parseFloat(apy) * parseFloat(reduction) * 100
  } catch (err) {
    console.error('Gamma API error: ', err)
    apy = 0
  }

  return apy
}

module.exports = {
  getApy,
}
