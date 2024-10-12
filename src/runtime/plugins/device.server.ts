import type { Browser, parseUserAgent } from 'detect-browser-es'
import type {
  DeviceInfo,
  DeviceHints,
  ResolvedHttpClientHintsOptions,
} from '../shared-types/types'
import { useHttpClientHintsState } from './state'
import { type GetHeaderType, lookupHeader, writeClientHintHeaders, writeHeaders } from './headers'
import { browserFeatureAvailable } from './features'
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
  setup(nuxtApp) {
    const state = useHttpClientHintsState()
    const httpClientHints = useRuntimeConfig().public.httpClientHints as ResolvedHttpClientHintsOptions
    const requestHeaders = useRequestHeaders<string>(HttpRequestHeaders)

    // 1. extract browser info
    const userAgent = nuxtApp.ssrContext?._httpClientHintsUserAgent as ReturnType<typeof parseUserAgent>
    // 2. prepare client hints request
    const clientHintsRequest = collectClientHints(userAgent, httpClientHints.device!, requestHeaders)
    // 3. write client hints response headers
    writeClientHintsResponseHeaders(clientHintsRequest, httpClientHints.device!)
    state.value.device = clientHintsRequest
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
) {
  const headers: Record<string, string[]> = {}

  for (const hint of deviceHints) {
    if (deviceInfo[`${hint}Available`]) {
      writeClientHintHeaders(ClientHeaders, DeviceClientHintsHeaders[hint], headers)
    }
  }

  writeHeaders(headers)
}
