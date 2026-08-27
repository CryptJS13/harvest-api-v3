const { countFunctionCall } = require('../..')

const getToken0 = instance => countFunctionCall(instance.methods.token0().call())
const getToken1 = instance => countFunctionCall(instance.methods.token1().call())
const getTickSpacing = instance => countFunctionCall(instance.methods.tickSpacing().call())
const getSlot0 = instance => countFunctionCall(instance.methods.slot0().call())
const getStakedLiquidity = instance => countFunctionCall(instance.methods.stakedLiquidity().call())
const getGaugeFees = instance => countFunctionCall(instance.methods.gaugeFees().call())
const getLiquidity = instance => countFunctionCall(instance.methods.liquidity().call())
// Fee growth is cumulative per unit of in-range liquidity, so a swap-fee rate is only obtainable by
// sampling it at two heights. `blockNumber` therefore needs an archive-capable RPC; callers must
// treat a failure here as "no fee data" rather than letting it fail the whole APY.
const getFeeGrowthGlobal0 = (instance, blockNumber) =>
  countFunctionCall(instance.methods.feeGrowthGlobal0X128().call(undefined, blockNumber))
const getFeeGrowthGlobal1 = (instance, blockNumber) =>
  countFunctionCall(instance.methods.feeGrowthGlobal1X128().call(undefined, blockNumber))

module.exports = {
  getToken0,
  getToken1,
  getTickSpacing,
  getSlot0,
  getStakedLiquidity,
  getGaugeFees,
  getLiquidity,
  getFeeGrowthGlobal0,
  getFeeGrowthGlobal1,
}
