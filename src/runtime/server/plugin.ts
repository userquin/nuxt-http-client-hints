import { defineNitroPlugin, useAppConfig } from 'nitropack/runtime'
import { parseUserAgent } from 'detect-browser-es'
import type { HttpClientHintsState, ResolvedHttpClientHintsOptions } from '../shared-types/types'
import { extractBrowser } from '../utils/detect'
import { extractCriticalHints } from '../utils/critical'
import { extractDeviceHints } from '../utils/device'
import { extractNetworkHints } from '../utils/network'

interface ServerRuntimeConfig extends Omit<ResolvedHttpClientHintsOptions, 'serverImages'> {
  serverImages: string[]
}

export default defineNitroPlugin((nitroApp) => {
  const { serverImages, ...rest } = useAppConfig().httpClientHints as ServerRuntimeConfig
  const options: ResolvedHttpClientHintsOptions = {
    ...rest,
    serverImages: serverImages.map(r => new RegExp(r)),
  }
  console.log(options)
  nitroApp.hooks.hook('afterResponse', async (event) => {
    // we should add the vary header to the response
  })
  nitroApp.hooks.hook('request', async (event) => {
    // expose the client hints in the context
    const url = event.path
    console.log(url)
    try {
      const critical = !!options.critical
      const device = options.device.length > 0
      const network = options.network.length > 0
      const detect = options.detectOS || options.detectBrowser || options.userAgent.length > 0
      if (!critical && !device && !network && !detect) {
        return undefined
      }

      // expose the client hints in the context
      // const url = event.path
      if (options.serverImages?.some(r => url.match(r))) {
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
})
