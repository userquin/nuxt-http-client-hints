import { useAppConfig } from 'nitropack/runtime'
import type { H3Event } from 'h3'
import { parseUserAgent } from 'detect-browser-es'
import { useNitro } from '@nuxt/kit'
import type {
  HttpClientHintsState,
  ResolvedHttpClientHintsOptions,
  ServerHttpClientHintsOptions,
} from '../../../src/runtime/shared-types/types'
import { extractBrowser } from '../../../src/runtime/utils/detect'
import { extractDeviceHints } from '../../../src/runtime/utils/device'
import { extractNetworkHints } from '../../../src/runtime/utils/network'
import { extractCriticalHints } from '../../../src/runtime/utils/critical'

export async function extractHTTPClientHints(event: H3Event) {
  const {
    serverImages,
    ...rest
  } = useNitro().options.appConfig.httpClientHints as ServerHttpClientHintsOptions
  const options: ResolvedHttpClientHintsOptions = {
    ...rest,
    serverImages: serverImages.map(r => new RegExp(r)),
  }
  const critical = !!options.critical
  const device = options.device.length > 0
  const network = options.network.length > 0
  const detect = options.detectOS || options.detectBrowser || options.userAgent.length > 0

  try {
    // expose the client hints in the context
    const url = event.path
    console.log('request', { url, match: options.serverImages?.some(r => url.match(r)) })
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
      if (device) {
        clientHints.device = extractDeviceHints(options, requestHeaders, userAgent)
      }
      if (network) {
        clientHints.network = extractNetworkHints(options, requestHeaders, userAgent)
      }
      if (critical) {
        clientHints.critical = extractCriticalHints(options, requestHeaders, userAgent)
      }
      event.context.httpClientHintsOptions = options
      event.context.httpClientHints = clientHints
    }
  }
  catch (err) {
    console.error(err)
  }
}
