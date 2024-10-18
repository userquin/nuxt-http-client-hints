import { eventHandler } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { parseUserAgent } from 'detect-browser-es'
import type { HttpClientHintsState, ResolvedHttpClientHintsOptions } from '../shared-types/types'
import { extractBrowser } from '../utils/detect'
import { extractCriticalHints } from '../utils/critical'
import { extractDeviceHints } from '../utils/device'
import { extractNetworkHints } from '../utils/network'

export default eventHandler(async (event) => {
  // expose the client hints in the context
  const url = event.path
  // console.log(`eventHandler: ${url}`)
  try {
    const runtimeConfig = useRuntimeConfig()
    // console.log(runtimeConfig)
    const options = runtimeConfig.public.httpClientHints as ResolvedHttpClientHintsOptions
    const critical = !!options.critical
    const device = options.device.length > 0
    const network = options.network.length > 0
    const detect = options.detectOS || options.detectBrowser || options.userAgent.length > 0
    if (!critical && !device && !network && !detect) {
      return undefined
    }

    // expose the client hints in the context
    // const url = event.path
    // console.log(url)
    if (options.serverImages?.some(r => r.test(url))) {
      const userAgentHeader = event.headers.get('user-agent')
      const requestHeaders: { [key in Lowercase<string>]?: string } = {}
      for (const [key, value] of event.headers.entries()) {
        requestHeaders[key.toLowerCase() as Lowercase<string>] = value
      }
      const userAgent = userAgentHeader
        ? parseUserAgent(userAgentHeader)
        : null
      const clientHints: HttpClientHintsState = {}
      if (detect) {
        clientHints.browser = await extractBrowser(options, requestHeaders as Record<string, string>, userAgentHeader ?? undefined)
      }
      if (critical) {
        clientHints.critical = extractCriticalHints(options, requestHeaders, userAgent)
      }
      if (device) {
        clientHints.device = extractDeviceHints(options, requestHeaders, userAgent)
      }
      if (network) {
        clientHints.network = extractNetworkHints(options, requestHeaders, userAgent)
      }
      event.context.httpClientHints = clientHints
    }
  }
  catch (err) {
    console.error(err)
  }
})
