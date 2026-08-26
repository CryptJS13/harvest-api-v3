const BigNumber = require('bignumber.js')
const { getVaultAprDetails } = require('../../../lib/third-party/stake-dao')

const isTradingFees = label => (label ?? '').toLowerCase().includes('trading fees')

const getTradingApy = async vaultAddress => {
  let apy

  try {
    const aprDetails = (await getVaultAprDetails(vaultAddress)) ?? []

    apy = aprDetails
      .filter(d => isTradingFees(d?.label))
      .reduce((sum, d) => {
        const values = Array.isArray(d?.value) ? d.value : [d?.value]
        return values.reduce((acc, v) => acc.plus(new BigNumber(v ?? 0)), sum)
      }, new BigNumber(0))
  } catch (err) {
    console.error('Stake DAO API error: ', err)
    apy = new BigNumber(0)
  }

  return apy.isNaN() ? '0' : apy.toFixed(2, 1)
}

module.exports = {
  getTradingApy,
}
