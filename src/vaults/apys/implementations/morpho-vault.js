const BigNumber = require('bignumber.js')
const { getVaultData, getV2VaultData } = require('../../../lib/third-party/morpho')
const logger = require('../../../lib/logger')

const getApy = async (morphoVault, factor, chain) => {
  let result

  try {
    const v1 = await getVaultData(morphoVault, chain)
    result = v1?.vaultByAddress?.state?.avgNetApy

    if (result === null || result === undefined) {
      const v2 = await getV2VaultData(morphoVault, chain)
      result = v2?.vaultV2ByAddress?.avgNetApy
    }
  } catch (e) {
    logger.error('Error getting Morpho APY:', e)
  }

  if (result === null || result === undefined) {
    return '0'
  }

  const apr = new BigNumber(result).times(100).times(factor)

  return apr.isFinite() && apr.gte(0) ? apr.toFixed(2) : '0'
}

module.exports = {
  getApy,
}
