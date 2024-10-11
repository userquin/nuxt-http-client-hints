import type { Browser } from 'detect-browser-es'
import { parseUserAgent } from 'detect-browser-es'
import { appendHeader } from 'h3'
import type { ResolvedConfigurationOptions, SSRClientHints, SSRClientHintsConfiguration } from '../shared-types/types'
import { useHttpClientHintsState } from './state'
import { defineNuxtPlugin, useCookie, useNuxtApp, useRuntimeConfig, useRequestEvent, useRequestHeaders } from '#imports'

const AcceptClientHintsHeaders = {
  prefersColorScheme: 'Sec-CH-Prefers-Color-Scheme',
  prefersReducedMotion: 'Sec-CH-Prefers-Reduced-Motion',
  viewportHeight: 'Sec-CH-Viewport-Height',
  viewportWidth: 'Sec-CH-Viewport-Width',
  devicePixelRatio: 'Sec-CH-DPR',
}

type AcceptClientHintsHeadersKey = keyof typeof AcceptClientHintsHeaders

const AcceptClientHintsRequestHeaders = Object.entries(AcceptClientHintsHeaders).reduce((acc, [key, value]) => {
  acc[key as AcceptClientHintsHeadersKey] = value.toLowerCase() as Lowercase<string>
  return acc
}, {} as Record<AcceptClientHintsHeadersKey, Lowercase<string>>)

const SecChUaMobile = 'Sec-CH-UA-Mobile'.toLowerCase() as Lowercase<string>
const HttpRequestHeaders = Array.from(Object.values(AcceptClientHintsRequestHeaders)).concat('user-agent', 'cookie', SecChUaMobile)

export default defineNuxtPlugin({
  name: 'http-client-hints:http-server:plugin',
  enforce: 'pre',
  parallel: true,
  // @ts-expect-error missing at build time
  dependsOn: ['http-client-hints:init-server:plugin'],
  async setup() {
    const state = useHttpClientHintsState()
    const httpClientHints = useRuntimeConfig().public.httpClientHints as ResolvedConfigurationOptions
    const requestHeaders = useRequestHeaders<string>(HttpRequestHeaders)
    const userAgentHeader = requestHeaders['user-agent']

    // 1. extract browser info
    const userAgent = userAgentHeader
      ? parseUserAgent(userAgentHeader)
      : null
    // 2. prepare client hints request
    const clientHintsRequest = collectClientHints(userAgent, httpClientHints.http!, requestHeaders)
    // 3. write client hints response headers
    writeClientHintsResponseHeaders(clientHintsRequest, httpClientHints.http!)
    state.value.clientHints = clientHintsRequest
    // 4. send the theme cookie to the client when required
    state.value.clientHints.colorSchemeCookie = writeThemeCookie(
      clientHintsRequest,
      httpClientHints.http!,
    )
  },
})

type BrowserFeatureAvailable = (android: boolean, versions: number[]) => boolean
type BrowserFeatures = Record<AcceptClientHintsHeadersKey, BrowserFeatureAvailable>

// Tests for Browser compatibility
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Reduced-Motion#browser_compatibility
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Color-Scheme#browser_compatibility
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/DPR#browser_compatibility
const chromiumBasedBrowserFeatures: BrowserFeatures = {
  prefersColorScheme: (_, v) => v[0] >= 93,
  prefersReducedMotion: (_, v) => v[0] >= 108,
  viewportHeight: (_, v) => v[0] >= 108,
  viewportWidth: (_, v) => v[0] >= 108,
  devicePixelRatio: (_, v) => v[0] >= 46,
}
const allowedBrowsers: [browser: Browser, features: BrowserFeatures][] = [
  // 'edge',
  // 'edge-ios',
  ['chrome', chromiumBasedBrowserFeatures],
  ['edge-chromium', {
    ...chromiumBasedBrowserFeatures,
    devicePixelRatio: (_, v) => v[0] >= 79,
  }],
  ['chromium-webview', chromiumBasedBrowserFeatures],
  ['opera', {
    prefersColorScheme: (android, v) => v[0] >= (android ? 66 : 79),
    prefersReducedMotion: (android, v) => v[0] >= (android ? 73 : 94),
    viewportHeight: (android, v) => v[0] >= (android ? 73 : 94),
    viewportWidth: (android, v) => v[0] >= (android ? 73 : 94),
    devicePixelRatio: (_, v) => v[0] >= 33,
  }],
]

const ClientHeaders = ['Accept-CH', 'Vary', 'Critical-CH']

function browserFeatureAvailable(userAgent: ReturnType<typeof parseUserAgent>, feature: AcceptClientHintsHeadersKey) {
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
  ssrClientHintsConfiguration: SSRClientHintsConfiguration,
  headers: { [key in Lowercase<string>]?: string | undefined },
) {
  const features: SSRClientHints = {
    firstRequest: true,
    prefersColorSchemeAvailable: false,
    prefersReducedMotionAvailable: false,
    viewportHeightAvailable: false,
    viewportWidthAvailable: false,
    devicePixelRatioAvailable: false,
  }

  if (userAgent == null || userAgent.type !== 'browser')
    return features

  if (ssrClientHintsConfiguration.prefersColorScheme)
    features.prefersColorSchemeAvailable = browserFeatureAvailable(userAgent, 'prefersColorScheme')

  if (ssrClientHintsConfiguration.prefersReducedMotion)
    features.prefersReducedMotionAvailable = browserFeatureAvailable(userAgent, 'prefersReducedMotion')

  if (ssrClientHintsConfiguration.viewportSize) {
    features.viewportHeightAvailable = browserFeatureAvailable(userAgent, 'viewportHeight')
    features.viewportWidthAvailable = browserFeatureAvailable(userAgent, 'viewportWidth')
    // We don't need to include DPR on desktop browsers.
    // Since sec-ch-ua-mobile is a low entropy header, we don't need to include it in Accept-CH
    // the user agent will send it always unless blocked by a user agent permission policy, check:
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Mobile
    const mobileHeader = headers[SecChUaMobile]
    if (mobileHeader === '?1')
      features.devicePixelRatioAvailable = browserFeatureAvailable(userAgent, 'devicePixelRatio')
  }

  return features
}

function collectClientHints(
  userAgent: ReturnType<typeof parseUserAgent>,
  ssrClientHintsConfiguration: SSRClientHintsConfiguration,
  headers: { [key in Lowercase<string>]?: string | undefined },
) {
  // collect client hints
  const hints: SSRClientHints = lookupClientHints(userAgent, ssrClientHintsConfiguration, headers)

  if (ssrClientHintsConfiguration.prefersColorScheme) {
    if (ssrClientHintsConfiguration.prefersColorSchemeOptions) {
      const cookieName = ssrClientHintsConfiguration.prefersColorSchemeOptions.cookieName
      const cookieValue = headers.cookie?.split(';').find(c => c.trim().startsWith(`${cookieName}=`))
      if (cookieValue) {
        const value = cookieValue.split('=')?.[1].trim()
        if (ssrClientHintsConfiguration.prefersColorSchemeOptions.themeNames.includes(value)) {
          hints.colorSchemeFromCookie = value
          hints.firstRequest = false
        }
      }
    }
    if (!hints.colorSchemeFromCookie) {
      const value = hints.prefersColorSchemeAvailable
        ? headers[AcceptClientHintsRequestHeaders.prefersColorScheme]?.toLowerCase()
        : undefined
      console.log({ value, headers })
      if (value === 'dark' || value === 'light' || value === 'no-preference') {
        hints.prefersColorScheme = value
        hints.firstRequest = false
      }

      // update the color scheme cookie
      if (ssrClientHintsConfiguration.prefersColorSchemeOptions) {
        if (!value || value === 'no-preference') {
          hints.colorSchemeFromCookie = ssrClientHintsConfiguration.prefersColorSchemeOptions.defaultTheme
        }
        else {
          hints.colorSchemeFromCookie = value === 'dark'
            ? ssrClientHintsConfiguration.prefersColorSchemeOptions.darkThemeName
            : ssrClientHintsConfiguration.prefersColorSchemeOptions.lightThemeName
        }
      }
    }
  }

  if (hints.prefersReducedMotionAvailable && ssrClientHintsConfiguration.prefersReducedMotion) {
    const value = headers[AcceptClientHintsRequestHeaders.prefersReducedMotion]?.toLowerCase()
    if (value === 'no-preference' || value === 'reduce') {
      hints.prefersReducedMotion = value
      hints.firstRequest = false
    }
  }

  if (hints.viewportHeightAvailable && ssrClientHintsConfiguration.viewportSize) {
    const header = headers[AcceptClientHintsRequestHeaders.viewportHeight]
    if (header) {
      hints.firstRequest = false
      try {
        hints.viewportHeight = Number.parseInt(header)
      }
      catch {
        hints.viewportHeight = ssrClientHintsConfiguration.clientHeight
      }
    }
  }
  else {
    hints.viewportHeight = ssrClientHintsConfiguration.clientHeight
  }

  if (hints.viewportWidthAvailable && ssrClientHintsConfiguration.viewportSize) {
    const header = headers[AcceptClientHintsRequestHeaders.viewportWidth]
    if (header) {
      hints.firstRequest = false
      try {
        hints.viewportWidth = Number.parseInt(header)
      }
      catch {
        hints.viewportWidth = ssrClientHintsConfiguration.clientWidth
      }
    }
  }
  else {
    hints.viewportWidth = ssrClientHintsConfiguration.clientWidth
  }

  if (hints.devicePixelRatioAvailable && ssrClientHintsConfiguration.viewportSize) {
    const header = headers[AcceptClientHintsRequestHeaders.devicePixelRatio]
    if (header) {
      hints.firstRequest = false
      try {
        hints.devicePixelRatio = Number.parseFloat(header)
        if (!Number.isNaN(hints.devicePixelRatio) && hints.devicePixelRatio > 0) {
          if (typeof hints.viewportWidth === 'number')
            hints.viewportWidth = Math.round(hints.viewportWidth / hints.devicePixelRatio)
          if (typeof hints.viewportHeight === 'number')
            hints.viewportHeight = Math.round(hints.viewportHeight / hints.devicePixelRatio)
        }
      }
      catch {
        // just ignore
      }
    }
  }

  return hints
}

function writeClientHintHeaders(key: string, headers: Record<string, string[]>) {
  ClientHeaders.forEach((header) => {
    headers[header] = (headers[header] ? headers[header] : []).concat(key)
  })
}

function writeClientHintsResponseHeaders(
  clientHintsRequest: SSRClientHints,
  ssrClientHintsConfiguration: SSRClientHintsConfiguration,
) {
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Critical-CH
  // Each header listed in the Critical-CH header should also be present in the Accept-CH and Vary headers.
  const headers: Record<string, string[]> = {}

  if (ssrClientHintsConfiguration.prefersColorScheme && clientHintsRequest.prefersColorSchemeAvailable)
    writeClientHintHeaders(AcceptClientHintsHeaders.prefersColorScheme, headers)

  if (ssrClientHintsConfiguration.prefersReducedMotion && clientHintsRequest.prefersReducedMotionAvailable)
    writeClientHintHeaders(AcceptClientHintsHeaders.prefersReducedMotion, headers)

  if (ssrClientHintsConfiguration.viewportSize && clientHintsRequest.viewportHeightAvailable && clientHintsRequest.viewportWidthAvailable) {
    writeClientHintHeaders(AcceptClientHintsHeaders.viewportHeight, headers)
    writeClientHintHeaders(AcceptClientHintsHeaders.viewportWidth, headers)
    if (clientHintsRequest.devicePixelRatioAvailable)
      writeClientHintHeaders(AcceptClientHintsHeaders.devicePixelRatio, headers)
  }

  if (Object.keys(headers).length === 0)
    return

  const nuxtApp = useNuxtApp()
  const callback = () => {
    const event = useRequestEvent(nuxtApp)
    Object.entries(headers).forEach(([key, value]) => {
      appendHeader(event, key, value)
    })
  }
  const unhook = nuxtApp.hooks.hookOnce('app:rendered', callback)
  nuxtApp.hooks.hookOnce('app:error', () => {
    unhook()
    return callback()
  })
}

function writeThemeCookie(
  clientHintsRequest: SSRClientHints,
  ssrClientHintsConfiguration: SSRClientHintsConfiguration,
) {
  if (!ssrClientHintsConfiguration.prefersColorScheme || !ssrClientHintsConfiguration.prefersColorSchemeOptions)
    return

  const cookieName = ssrClientHintsConfiguration.prefersColorSchemeOptions.cookieName
  const themeName = clientHintsRequest.colorSchemeFromCookie ?? ssrClientHintsConfiguration.prefersColorSchemeOptions.defaultTheme
  const path = ssrClientHintsConfiguration.prefersColorSchemeOptions.baseUrl

  const date = new Date()
  const expires = new Date(date.setDate(date.getDate() + 365))
  if (!clientHintsRequest.firstRequest || !ssrClientHintsConfiguration.reloadOnFirstRequest) {
    useCookie(cookieName, {
      path,
      expires,
      sameSite: 'lax',
    }).value = themeName
  }

  return `${cookieName}=${themeName}; Path=${path}; Expires=${expires.toUTCString()}; SameSite=Lax`
}
