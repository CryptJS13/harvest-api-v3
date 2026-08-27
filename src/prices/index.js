const { AsyncLocalStorage } = require('async_hooks')
const { toArray, isArray } = require('lodash')
const { cache } = require('../lib/cache')
const { UI_DATA_FILES, GET_PRICE_TYPES, CHAIN_IDS } = require('../lib/constants')
const { getUIData } = require('../lib/data')
const {
  getTokenPriceByAddress,
  getTokenPriceById,
  priceByAddresses,
  priceByIds,
} = require('./coingecko')
const logger = require('../lib/logger')

const executePriceFunction = async (type, params) => {
  let implementation
  const transformedType = type.toLowerCase().replace(/_/g, '-')
  try {
    implementation = require(`./implementations/${transformedType}.js`)
  } catch (e) {
    logger.error(
      `executePriceFunction(...) implementation for '${transformedType}' [${type}] is not available`,
      e,
    )
    return Promise.resolve(0)
  }

  const price = await implementation.getPrice(...params)
  return Promise.resolve(price)
}

// Tracks price lookups on the CURRENT resolution chain. A price implementation may legitimately ask
// for another token's price, but if that chain leads back to where it started there is no base case
// and the promise never settles - which silently stalls the whole poller rather than surfacing an
// error. Detect the cycle, log it, and return 0 so the caller can carry on.
//
// This is per-async-chain, NOT global, and that distinction is the whole point. A global set cannot
// tell a genuine cycle apart from two INDEPENDENT callers asking for the same token at the same
// time - which happens constantly, e.g. two vaults sharing a pool token, or several potpools sharing
// iFARM. Under a global set the second caller was told it had cycled and handed back 0, silently
// poisoning whatever it fed. AsyncLocalStorage scopes the set to one call chain, so concurrent
// lookups no longer see each other and only true recursion is caught.
const resolutionChain = new AsyncLocalStorage()

const getTokenPrice = async (selectedToken, ourChainId = CHAIN_IDS.ETH) => {
  const currency = 'usd'
  const normalizedSelectedToken = selectedToken.toLowerCase()
  const cachedPriceKey1 = `tokenPrice${normalizedSelectedToken}${ourChainId}${currency}`
  const cachedPrice1 = cache.get(cachedPriceKey1)

  if (cachedPrice1 && !(selectedToken == 'IFARM')) {
    return cachedPrice1
  }

  const inFlightKey = `${normalizedSelectedToken}${ourChainId}`
  const currentChain = resolutionChain.getStore()
  if (currentChain && currentChain.has(inFlightKey)) {
    logger.error(
      `getTokenPrice(${selectedToken}, ${ourChainId}) re-entered while already resolving; ` +
        'breaking the price cycle and returning 0',
    )
    return 0
  }
  const nextChain = new Set(currentChain || [])
  nextChain.add(inFlightKey)
  return resolutionChain.run(nextChain, () =>
    resolveTokenPrice(selectedToken, ourChainId, currency, cachedPriceKey1),
  )
}

const resolveTokenPrice = async (selectedToken, ourChainId, currency, cachedPriceKey1) => {
  const tokens = await getUIData(UI_DATA_FILES.TOKENS)

  const tokenData =
    tokens[selectedToken] ||
    toArray(tokens).find(
      token =>
        token.tokenAddress &&
        !isArray(token.tokenAddress) &&
        // A CL vault's `tokenAddress` is one of the two tokens of its pool, but its
        // `priceFunction` prices the vault SHARE, not that token. Matching a bare token
        // address to a CL vault entry therefore returns the wrong price entirely, and
        // recurses forever: pricing the share calls back here for the same pool token
        // (getTokenPrice(EURC) -> aeroCL_EURC_USDC_1w -> cl-vault.getPrice -> getTokenPrice(EURC)).
        // CL vault entries are only ever addressed by their key, so skip them here.
        !token.isCLVault &&
        token.tokenAddress.toLowerCase() === selectedToken.toLowerCase(),
    )

  let cachedPriceKey2 = null
  let result
  if (
    tokenData &&
    tokenData.tokenAddress &&
    !isArray(tokenData.tokenAddress) &&
    tokenData.priceFunction?.type === GET_PRICE_TYPES.COINGECKO_CONTRACT
  ) {
    const normalizedTokenAddress = tokenData.tokenAddress.toLowerCase()
    cachedPriceKey2 = `tokenPrice${normalizedTokenAddress}${ourChainId}${currency}`
    const cachedPrice2 = cache.get(cachedPriceKey2)

    if (cachedPrice2) {
      return cachedPrice2
    }
  }

  if (tokenData) {
    result = await executePriceFunction(
      tokenData.priceFunction.type,
      tokenData.priceFunction.params,
    )
  } else {
    // first, checking if staking token is an f-token (vault)
    const vaultData =
      !tokens[selectedToken] &&
      toArray(tokens).find(
        token =>
          token.chain === ourChainId &&
          token.vaultAddress &&
          token.vaultAddress.toLowerCase() === selectedToken.toLowerCase(),
      )
    if (vaultData) {
      result = await executePriceFunction(GET_PRICE_TYPES.F_TOKEN, [
        vaultData.vaultAddress,
        vaultData.decimals,
        ourChainId,
      ])
    } else {
      // otherwise, just fallback to CoinGecko
      result = selectedToken.startsWith('0x')
        ? await getTokenPriceByAddress(selectedToken, ourChainId, currency)
        : await getTokenPriceById(selectedToken, ourChainId, currency)
    }
  }

  cache.set(cachedPriceKey1, result)
  if (cachedPriceKey2 && tokenData?.priceFunction?.type === GET_PRICE_TYPES.COINGECKO_CONTRACT) {
    cache.set(cachedPriceKey2, result)
  }
  return result
}

module.exports = {
  getTokenPrice,
  prefetchPriceByAddresses: priceByAddresses,
  prefetchPriceByIds: priceByIds,
}
