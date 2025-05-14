const BigNumber = require('bignumber.js')
const { web3BASE } = require('../../../lib/web3')
const { faVault, faLoan } = require('../../../lib/web3/contracts')

const getApy = async (faVaultAddress, reduction) => {
  const web3 = web3BASE
  const {
    contract: { abi: loanAbi },
    methods: loanMethods,
  } = faLoan
  const {
    contract: { abi: vaultAbi },
    methods: vaultMethods,
  } = faVault

  const vaultInstance = new web3.eth.Contract(vaultAbi, faVaultAddress)
  const totalAssets = new BigNumber(await vaultMethods.getTotalAssets(vaultInstance))
  const loanInstance = new web3.eth.Contract(
    loanAbi,
    await vaultMethods.getLoanContract(vaultInstance),
  )
  const epochReward = new BigNumber(await loanMethods.getLastEpochReward(loanInstance))

  let rate = epochReward.times(52).times(100).div(totalAssets)
  if (reduction) {
    rate = rate.multipliedBy(reduction)
  }
  return rate.toFixed(4)
}

module.exports = {
  getApy,
}
