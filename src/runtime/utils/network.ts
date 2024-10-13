import type { Browser, parseUserAgent } from 'detect-browser-es'
import type { NetworkHints, NetworkInfo, ResolvedHttpClientHintsOptions } from '../shared-types/types'
import type { GetHeaderType } from './headers'
import { lookupHeader, writeClientHintHeaders } from './headers'
import { browserFeatureAvailable } from './features'

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

export const NetworkHintsHeaders = Array.from(Object.values(NetworkClientHintsHeaders)).concat('user-agent')

export function extractNetworkHints(
  httpClientHints: ResolvedHttpClientHintsOptions,
  requestHeaders: { [key in Lowercase<string>]?: string },
  userAgent: ReturnType<typeof parseUserAgent>,
  writeHeaders?: (headers: Record<string, string[]>) => void,
): NetworkInfo {
  // 1. prepare client hints request
  const clientHintsRequest = collectClientHints(userAgent, httpClientHints.network!, requestHeaders)
  // 2. write client hints response headers
  if (writeHeaders) {
    writeClientHintsResponseHeaders(clientHintsRequest, httpClientHints.network!, writeHeaders)
  }

  return clientHintsRequest
}

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
    features[`${hint}Available`] = browserFeatureAvailable(allowedBrowsers, userAgent, hint)
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
  writeHeaders: (headers: Record<string, string[]>) => void,
) {
  const headers: Record<string, string[]> = {}

  for (const hint of networkHints) {
    if (networkInfo[`${hint}Available`]) {
      writeClientHintHeaders(ClientHeaders, NetworkClientHintsHeaders[hint], headers)
    }
  }

  writeHeaders(headers)
}
