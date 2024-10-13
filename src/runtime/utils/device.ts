import type { Browser, parseUserAgent } from 'detect-browser-es'
import type { DeviceHints, DeviceInfo, ResolvedHttpClientHintsOptions } from '../shared-types/types'
import type { GetHeaderType } from './headers'
import { lookupHeader, writeClientHintHeaders } from './headers'
import { browserFeatureAvailable } from './features'

const DeviceClientHintsHeaders: Record<DeviceHints, string> = {
  memory: 'Device-Memory',
}

const DeviceClientHintsHeadersTypes: Record<DeviceHints, GetHeaderType> = {
  memory: 'float',
}

type DeviceClientHintsHeadersKey = keyof typeof DeviceClientHintsHeaders

const AcceptClientHintsRequestHeaders = Object.entries(DeviceClientHintsHeaders).reduce((acc, [key, value]) => {
  acc[key as DeviceClientHintsHeadersKey] = value.toLowerCase() as Lowercase<string>
  return acc
}, {} as Record<DeviceClientHintsHeadersKey, Lowercase<string>>)

export const HttpRequestHeaders = Array.from(Object.values(DeviceClientHintsHeaders)).concat('user-agent')

export function extractDeviceHints(
  httpClientHints: ResolvedHttpClientHintsOptions,
  requestHeaders: { [key in Lowercase<string>]?: string },
  userAgent: ReturnType<typeof parseUserAgent>,
  writeHeaders?: (headers: Record<string, string[]>) => void,
): DeviceInfo {
  // 1. prepare client hints request
  const clientHintsRequest = collectClientHints(userAgent, httpClientHints.device!, requestHeaders)
  // 2. write client hints response headers
  if (writeHeaders) {
    writeClientHintsResponseHeaders(clientHintsRequest, httpClientHints.device!, writeHeaders)
  }

  return clientHintsRequest
}

type BrowserFeatureAvailable = (android: boolean, versions: number[]) => boolean
type BrowserFeatures = Record<DeviceClientHintsHeadersKey, BrowserFeatureAvailable>

// Tests for Browser compatibility
// https://developer.mozilla.org/en-US/docs/Web/API/Device_Memory_API
const chromiumBasedBrowserFeatures: BrowserFeatures = {
  memory: (_, v) => v[0] >= 63,
}
const allowedBrowsers: [browser: Browser, features: BrowserFeatures][] = [
  ['chrome', chromiumBasedBrowserFeatures],
  ['edge-chromium', {
    memory: (_, v) => v[0] >= 79,
  }],
  ['chromium-webview', chromiumBasedBrowserFeatures],
  ['opera', {
    memory: (android, v) => v[0] >= (android ? 50 : 46),
  }],
]

const ClientHeaders = ['Accept-CH']

function lookupClientHints(
  userAgent: ReturnType<typeof parseUserAgent>,
  deviceHints: DeviceHints[],
): DeviceInfo {
  const features: DeviceInfo = {
    memoryAvailable: false,
  }

  if (userAgent == null || userAgent.type !== 'browser')
    return features

  for (const hint of deviceHints) {
    features[`${hint}Available`] = browserFeatureAvailable(allowedBrowsers, userAgent, hint)
  }

  return features
}

function collectClientHints(
  userAgent: ReturnType<typeof parseUserAgent>,
  deviceHints: DeviceHints[],
  headers: { [key in Lowercase<string>]?: string | undefined },
) {
  // collect client hints
  const hints = lookupClientHints(userAgent, deviceHints)

  for (const hint of deviceHints) {
    if (hints[`${hint}Available`]) {
      const value = lookupHeader(
        DeviceClientHintsHeadersTypes[hint],
        AcceptClientHintsRequestHeaders[hint],
        headers,
      )
      if (typeof value !== 'undefined') {
        hints[hint] = value as typeof hints[typeof hint]
      }
    }
  }

  return hints
}

function writeClientHintsResponseHeaders(
  deviceInfo: DeviceInfo,
  deviceHints: DeviceHints[],
  writeHeaders: (headers: Record<string, string[]>) => void,
) {
  const headers: Record<string, string[]> = {}

  for (const hint of deviceHints) {
    if (deviceInfo[`${hint}Available`]) {
      writeClientHintHeaders(ClientHeaders, DeviceClientHintsHeaders[hint], headers)
    }
  }

  writeHeaders(headers)
}
