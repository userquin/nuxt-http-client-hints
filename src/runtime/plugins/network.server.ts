import type { Browser } from 'detect-browser-es'
import { parseUserAgent } from 'detect-browser-es'
import type { NetworkInfo, NetworkHints, ResolvedHttpClientHintsOptions } from '../shared-types/types'
import { useHttpClientHintsState } from './state'
import type { GetHeaderType } from './headers'
import { lookupHeader, writeClientHintHeaders, writeHeaders } from './headers'
import { defineNuxtPlugin, useRequestHeaders, useRuntimeConfig } from '#imports'

const NetworkClientHintsHeaders: Record<NetworkHints, string> = {
  savedata: 'Save-Data',
  downlink: 'Downlink',
  ect: 'ECT',
  rtt: 'RTT',
}

const NetworkClientHintsHeadersTypes: Record<NetworkHints, GetHeaderType> = {
  savedata: 'string',
  downlink: 'float',
  ect: 'string',
  rtt: 'int',
}

type NetworkClientHintsHeadersKey = keyof typeof NetworkClientHintsHeaders

const AcceptClientHintsRequestHeaders = Object.entries(NetworkClientHintsHeaders).reduce((acc, [key, value]) => {
  acc[key as NetworkClientHintsHeadersKey] = value.toLowerCase() as Lowercase<string>
  return acc
}, {} as Record<NetworkClientHintsHeadersKey, Lowercase<string>>)

const HttpRequestHeaders = Array.from(Object.values(NetworkClientHintsHeaders)).concat('user-agent')

export default defineNuxtPlugin({
  name: 'http-client-hints:network-server:plugin',
  enforce: 'pre',
  parallel: true,
  // @ts-expect-error missing at build time
  dependsOn: ['http-client-hints:init-server:plugin'],
  setup() {
    const state = useHttpClientHintsState()
    const httpClientHints = useRuntimeConfig().public.httpClientHints as ResolvedHttpClientHintsOptions
    const requestHeaders = useRequestHeaders<string>(HttpRequestHeaders)
    const userAgentHeader = requestHeaders['user-agent']

    // 1. extract browser info
    const userAgent = userAgentHeader
      ? parseUserAgent(userAgentHeader)
      : null
    // 2. prepare client hints request
    const clientHintsRequest = collectClientHints(userAgent, httpClientHints.network!, requestHeaders)
    // 3. write client hints response headers
    writeClientHintsResponseHeaders(clientHintsRequest, httpClientHints.network!)
    state.value.network = clientHintsRequest
  },
})

type BrowserFeatureAvailable = (android: boolean, versions: number[]) => boolean
type BrowserFeatures = Record<NetworkClientHintsHeadersKey, BrowserFeatureAvailable>

// Tests for Browser compatibility
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Save-Data
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Downlink
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ECT
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/RTT
const chromiumBasedBrowserFeatures: BrowserFeatures = {
  savedata: (android, v) => v[0] >= 49,
  downlink: (_, v) => v[0] >= 67,
  ect: (_, v) => v[0] >= 67,
  rtt: (_, v) => v[0] >= 67,
}
const allowedBrowsers: [browser: Browser, features: BrowserFeatures][] = [
  ['chrome', chromiumBasedBrowserFeatures],
  ['edge-chromium', {
    savedata: (_, v) => v[0] >= 79,
    downlink: (_, v) => v[0] >= 79,
    ect: (_, v) => v[0] >= 79,
    rtt: (_, v) => v[0] >= 79,
  }],
  ['chromium-webview', chromiumBasedBrowserFeatures],
  ['opera', {
    savedata: (_, v) => v[0] >= 35,
    downlink: (android, v) => v[0] >= (android ? 48 : 54),
    ect: (android, v) => v[0] >= (android ? 48 : 54),
    rtt: (android, v) => v[0] >= (android ? 48 : 54),
  }],
]

const ClientHeaders = ['Accept-CH', 'Vary']

function browserFeatureAvailable(userAgent: ReturnType<typeof parseUserAgent>, feature: NetworkClientHintsHeadersKey) {
  if (userAgent == null || userAgent.type !== 'browser')
    return false

  try {
    const browserName = userAgent.name
    const android = userAgent.os?.toLowerCase().startsWith('android') ?? false
    const versions = userAgent.version.split('.').map(v => Number.parseInt(v))
    return allowedBrowsers.some(([name, check]) => {
      if (browserName !== name)
        return false

      try {
        return check[feature](android, versions)
      }
      catch {
        return false
      }
    })
  }
  catch {
    return false
  }
}

function lookupClientHints(
  userAgent: ReturnType<typeof parseUserAgent>,
  networkHints: NetworkHints[],
) {
  const features: NetworkInfo = {
    savedataAvailable: false,
    downlinkAvailable: false,
    ectAvailable: false,
    rttAvailable: false,
  }

  if (userAgent == null || userAgent.type !== 'browser')
    return features

  for (const hint of networkHints) {
    features[`${hint}Available`] = browserFeatureAvailable(userAgent, hint)
  }

  return features
}

function collectClientHints(
  userAgent: ReturnType<typeof parseUserAgent>,
  networkHints: NetworkHints[],
  headers: { [key in Lowercase<string>]?: string | undefined },
) {
  // collect client hints
  const hints = lookupClientHints(userAgent, networkHints)

  for (const hint of networkHints) {
    if (hints[`${hint}Available`]) {
      const value = lookupHeader(
        NetworkClientHintsHeadersTypes[hint],
        AcceptClientHintsRequestHeaders[hint],
        headers,
      )
      console.log({ hint, value })
      if (typeof value !== 'undefined') {
        // @ts-expect-error Type 'number | "on" | NetworkECT | undefined' is not assignable to type 'undefined'.
        hints[hint] = value as typeof hints[typeof hint]
      }
    }
  }

  return hints
}

function writeClientHintsResponseHeaders(
  networkInfo: NetworkInfo,
  networkHints: NetworkHints[],
) {
  const headers: Record<string, string[]> = {}

  for (const hint of networkHints) {
    if (networkInfo[`${hint}Available`]) {
      writeClientHintHeaders(ClientHeaders, NetworkClientHintsHeaders[hint], headers)
    }
  }

  writeHeaders(headers)
}
