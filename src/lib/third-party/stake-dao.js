const { STAKE_DAO_API_URL } = require('../constants')
const { getJson } = require('../http-tls')
const { client } = require('../http')
const { cache } = require('../cache')
const logger = require('../logger')

const CACHE_KEY = 'stake-dao-vaults'
const CACHE_TTL_SECONDS = 600

let inFlight

const fetchVaults = async () => {
  try {
    const data = await getJson(STAKE_DAO_API_URL, { timeout: 30 })
    return data?.data ?? data ?? []
  } catch (err) {
    logger.warn('Stake DAO TLS-impersonating fetch failed, falling back to plain client', {
      message: err.message,
    })
  }

  const response = await client.get(STAKE_DAO_API_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'PostmanRuntime/7.43.4',
    },
  })

  return response?.data?.data ?? response?.data ?? []
}

const getVaults = async () => {
  const cached = cache.get(CACHE_KEY)
  if (cached) {
    return cached
  }

  if (!inFlight) {
    inFlight = fetchVaults()
      .then(vaults => {
        const list = Array.isArray(vaults) ? vaults : []
        if (list.length) {
          cache.set(CACHE_KEY, list, CACHE_TTL_SECONDS)
        }
        return list
      })
      .catch(err => {
        logger.error('Stake DAO API error:', err)
        return []
      })
      .finally(() => {
        inFlight = undefined
      })
  }

  return inFlight
}

const getVaultAprDetails = async vaultAddress => {
  const vaults = await getVaults()
  const target = (vaultAddress ?? '').toLowerCase()
  const entry = vaults.find(v => (v?.vault ?? '').toLowerCase() === target)

  return entry?.apr?.current?.details ?? []
}

module.exports = { getVaultAprDetails }
