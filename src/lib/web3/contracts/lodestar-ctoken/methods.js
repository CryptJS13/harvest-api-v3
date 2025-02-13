const { countFunctionCall } = require('../..')

const getSupplyRate = instance => countFunctionCall(instance.methods.supplyRatePerBlock().call())
const getBorrowRate = instance => countFunctionCall(instance.methods.borrowRatePerBlock().call())
const totalSupply = instance => countFunctionCall(instance.methods.totalSupply().call())
const totalBorrows = instance => countFunctionCall(instance.methods.totalBorrows().call())
const getExchangeRate = instance => countFunctionCall(instance.methods.exchangeRateStored().call())
const getUnderlying = instance => countFunctionCall(instance.methods.underlying().call())
const getAccountSnapshot = (holder, instance) =>
  countFunctionCall(instance.methods.getAccountSnapshot(holder).call())
const getComptroller = instance => countFunctionCall(instance.methods.comptroller().call())

module.exports = {
  getSupplyRate,
  getBorrowRate,
  totalSupply,
  totalBorrows,
  getExchangeRate,
  getUnderlying,
  getAccountSnapshot,
  getComptroller,
}
