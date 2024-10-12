import type { Browser } from 'detect-browser-es'
import { parseUserAgent } from 'detect-browser-es'
import type {
  DeviceClientHints,
  DeviceHints,
  ResolvedHttpClientHintsOptions,
} from '../shared-types/types'
import { useHttpClientHintsState } from './state'
import { type GetHeaderType, lookupHeader, writeClientHintHeaders, writeHeaders } from './headers'
import { defineNuxtPlugin, useRequestHeaders, useRuntimeConfig } from '#imports'

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

const HttpRequestHeaders = Array.from(Object.values(DeviceClientHintsHeaders)).concat('user-agent')

export default defineNuxtPlugin({
  name: 'http-client-hints:device-server:plugin',
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
    const clientHintsRequest = collectClientHints(userAgent, httpClientHints.device!, requestHeaders)
    // 3. write client hints response headers
    writeClientHintsResponseHeaders(clientHintsRequest, httpClientHints.device!)
    state.value.deviceInfo = clientHintsRequest
  },
})

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

function browserFeatureAvailable(userAgent: ReturnType<typeof parseUserAgent>, feature: DeviceClientHintsHeadersKey) {
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
  deviceHints: DeviceHints[],
) {
  const features: DeviceClientHints = {
    memoryAvailable: false,
  }

  if (userAgent == null || userAgent.type !== 'browser')
    return features

  for (const hint of deviceHints) {
    features[`${hint}Available`] = browserFeatureAvailable(userAgent, hint)
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
      console.log({ hint, value })
      if (typeof value !== 'undefined') {
        hints[hint] = value as typeof hints[typeof hint]
      }
    }
  }

  return hints
}

function writeClientHintsResponseHeaders(
  deviceClientHints: DeviceClientHints,
  deviceHints: DeviceHints[],
) {
  const headers: Record<string, string[]> = {}

  for (const hint of deviceHints) {
    if (deviceClientHints[`${hint}Available`]) {
      writeClientHintHeaders(ClientHeaders, DeviceClientHintsHeaders[hint], headers)
    }
  }

  writeHeaders(headers)
}
