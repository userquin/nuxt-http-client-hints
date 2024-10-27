import type { H3Event } from 'h3'
import { parseUserAgent } from 'detect-browser-es'
import type {
  HttpClientHintsState,
  ResolvedHttpClientHintsOptions,
  ServerHttpClientHintsOptions,
} from '../shared-types/types'
import { extractBrowser } from '../utils/detect'
import { extractDeviceHints } from '../utils/device'
import { extractNetworkHints } from '../utils/network'
import { extractCriticalHints } from '../utils/critical'

export type { HttpClientHintsState, ResolvedHttpClientHintsOptions, ServerHttpClientHintsOptions }

export interface ServerImageClientHints {
  httpClientHintsOptions: ResolvedHttpClientHintsOptions
  httpClientHints: HttpClientHintsState
}

export async function extractImageClientHints(event: H3Event, options: ResolvedHttpClientHintsOptions): Promise<ServerImageClientHints | undefined> {
  const critical = !!options.critical
  const device = options.device.length > 0
  const network = options.network.length > 0
  const detect = options.detectOS || options.detectBrowser || options.userAgent.length > 0

  // expose the client hints in the context
  const url = event.path
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
    return {
      httpClientHintsOptions: options,
      httpClientHints: clientHints,
    } satisfies ServerImageClientHints
  }
}
