import type { Browser } from 'detect-browser-es'
import { parseUserAgent } from 'detect-browser-es'
import type {
  ResolvedHttpClientHintsOptions,
  CriticalClientHints,
  CriticalClientHintsConfiguration,
} from '../shared-types/types'
import { useHttpClientHintsState } from './state'
import { writeClientHintHeaders, writeHeaders } from './headers'
import {
  defineNuxtPlugin,
  useCookie,
  useRuntimeConfig,
  useRequestHeaders,
} from '#imports'

const AcceptClientHintsHeaders = {
  prefersColorScheme: 'Sec-CH-Prefers-Color-Scheme',
  prefersReducedMotion: 'Sec-CH-Prefers-Reduced-Motion',
  prefersReducedTransparency: 'Sec-CH-Prefers-Reduced-Transparency',
  viewportHeight: 'Sec-CH-Viewport-Height',
  viewportWidth: 'Sec-CH-Viewport-Width',
  width: 'Sec-CH-Width',
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
  name: 'http-client-hints:critical-server:plugin',
  enforce: 'pre',
  parallel: true,
  // @ts-expect-error missing at build time
  dependsOn: ['http-client-hints:init-server:plugin'],
  async setup() {
    const state = useHttpClientHintsState()
    const httpClientHints = useRuntimeConfig().public.httpClientHints as ResolvedHttpClientHintsOptions
    const requestHeaders = useRequestHeaders<string>(HttpRequestHeaders)
    const userAgentHeader = requestHeaders['user-agent']

    // 1. extract browser info
    const userAgent = userAgentHeader
      ? parseUserAgent(userAgentHeader)
      : null
    // 2. prepare client hints request
    const clientHintsRequest = collectClientHints(userAgent, httpClientHints.critical!, requestHeaders)
    // 3. write client hints response headers
    writeClientHintsResponseHeaders(clientHintsRequest, httpClientHints.critical!)
    state.value.clientHints = clientHintsRequest
    // 4. send the theme cookie to the client when required
    state.value.clientHints.colorSchemeCookie = writeThemeCookie(
      clientHintsRequest,
      httpClientHints.critical!,
    )
  },
})

type BrowserFeatureAvailable = (android: boolean, versions: number[]) => boolean
type BrowserFeatures = Record<AcceptClientHintsHeadersKey, BrowserFeatureAvailable>

// Tests for Browser compatibility
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Reduced-Motion#browser_compatibility
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Reduced-Transparency
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Color-Scheme#browser_compatibility
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/DPR#browser_compatibility
const chromiumBasedBrowserFeatures: BrowserFeatures = {
  prefersColorScheme: (_, v) => v[0] >= 93,
  prefersReducedMotion: (_, v) => v[0] >= 108,
  prefersReducedTransparency: (_, v) => v[0] >= 119,
  viewportHeight: (_, v) => v[0] >= 108,
  viewportWidth: (_, v) => v[0] >= 108,
  // TODO: check if this is correct, no entry in mozilla docs, using DPR
  width: (_, v) => v[0] >= 46,
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
    prefersReducedTransparency: (_, v) => v[0] >= 79,
    viewportHeight: (android, v) => v[0] >= (android ? 73 : 94),
    viewportWidth: (android, v) => v[0] >= (android ? 73 : 94),
    // TODO: check if this is correct, no entry in mozilla docs, using DPR
    width: (_, v) => v[0] >= 33,
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
  criticalClientHintsConfiguration: CriticalClientHintsConfiguration,
  headers: { [key in Lowercase<string>]?: string | undefined },
) {
  const features: CriticalClientHints = {
    firstRequest: true,
    prefersColorSchemeAvailable: false,
    prefersReducedMotionAvailable: false,
    prefersReducedTransparencyAvailable: false,
    viewportHeightAvailable: false,
    viewportWidthAvailable: false,
    widthAvailable: false,
    devicePixelRatioAvailable: false,
  }

  if (userAgent == null || userAgent.type !== 'browser')
    return features

  if (criticalClientHintsConfiguration.prefersColorScheme)
    features.prefersColorSchemeAvailable = browserFeatureAvailable(userAgent, 'prefersColorScheme')

  if (criticalClientHintsConfiguration.prefersReducedMotion)
    features.prefersReducedMotionAvailable = browserFeatureAvailable(userAgent, 'prefersReducedMotion')

  if (criticalClientHintsConfiguration.prefersReducedTransparency)
    features.prefersReducedMotionAvailable = browserFeatureAvailable(userAgent, 'prefersReducedTransparency')

  if (criticalClientHintsConfiguration.viewportSize) {
    features.viewportHeightAvailable = browserFeatureAvailable(userAgent, 'viewportHeight')
    features.viewportWidthAvailable = browserFeatureAvailable(userAgent, 'viewportWidth')
  }

  if (criticalClientHintsConfiguration.width) {
    features.widthAvailable = browserFeatureAvailable(userAgent, 'width')
  }

  if (features.viewportWidthAvailable || features.viewportHeightAvailable) {
    // We don't need to include DPR on desktop browsers.
    // Since sec-ch-ua-mobile is a low entropy header, we don't need to include it in Accept-CH,
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
  criticalClientHintsConfiguration: CriticalClientHintsConfiguration,
  headers: { [key in Lowercase<string>]?: string | undefined },
) {
  // collect client hints
  const hints: CriticalClientHints = lookupClientHints(userAgent, criticalClientHintsConfiguration, headers)

  if (criticalClientHintsConfiguration.prefersColorScheme) {
    if (criticalClientHintsConfiguration.prefersColorSchemeOptions) {
      const cookieName = criticalClientHintsConfiguration.prefersColorSchemeOptions.cookieName
      const cookieValue = headers.cookie?.split(';').find(c => c.trim().startsWith(`${cookieName}=`))
      if (cookieValue) {
        const value = cookieValue.split('=')?.[1].trim()
        if (criticalClientHintsConfiguration.prefersColorSchemeOptions.themeNames.includes(value)) {
          hints.colorSchemeFromCookie = value
          hints.firstRequest = false
        }
      }
    }
    if (!hints.colorSchemeFromCookie) {
      const value = hints.prefersColorSchemeAvailable
        ? headers[AcceptClientHintsRequestHeaders.prefersColorScheme]?.toLowerCase()
        : undefined
      if (value === 'dark' || value === 'light' || value === 'no-preference') {
        hints.prefersColorScheme = value
        hints.firstRequest = false
      }

      // update the color scheme cookie
      if (criticalClientHintsConfiguration.prefersColorSchemeOptions) {
        if (!value || value === 'no-preference') {
          hints.colorSchemeFromCookie = criticalClientHintsConfiguration.prefersColorSchemeOptions.defaultTheme
        }
        else {
          hints.colorSchemeFromCookie = value === 'dark'
            ? criticalClientHintsConfiguration.prefersColorSchemeOptions.darkThemeName
            : criticalClientHintsConfiguration.prefersColorSchemeOptions.lightThemeName
        }
      }
    }
  }

  if (hints.prefersReducedMotionAvailable && criticalClientHintsConfiguration.prefersReducedMotion) {
    const value = headers[AcceptClientHintsRequestHeaders.prefersReducedMotion]?.toLowerCase()
    if (value === 'no-preference' || value === 'reduce') {
      hints.prefersReducedMotion = value
      hints.firstRequest = false
    }
  }

  if (hints.prefersReducedTransparencyAvailable && criticalClientHintsConfiguration.prefersReducedTransparency) {
    const value = headers[AcceptClientHintsRequestHeaders.prefersReducedTransparency]?.toLowerCase()
    if (value) {
      hints.prefersReducedTransparency = value === 'reduce' ? 'reduce' : 'no-preference'
      hints.firstRequest = false
    }
  }

  if (hints.viewportHeightAvailable && criticalClientHintsConfiguration.viewportSize) {
    const header = headers[AcceptClientHintsRequestHeaders.viewportHeight]
    if (header) {
      hints.firstRequest = false
      try {
        hints.viewportHeight = Number.parseInt(header)
      }
      catch {
        hints.viewportHeight = criticalClientHintsConfiguration.clientHeight
      }
    }
  }
  else {
    hints.viewportHeight = criticalClientHintsConfiguration.clientHeight
  }

  if (hints.viewportWidthAvailable && criticalClientHintsConfiguration.viewportSize) {
    const header = headers[AcceptClientHintsRequestHeaders.viewportWidth]
    if (header) {
      hints.firstRequest = false
      try {
        hints.viewportWidth = Number.parseInt(header)
      }
      catch {
        hints.viewportWidth = criticalClientHintsConfiguration.clientWidth
      }
    }
  }
  else {
    hints.viewportWidth = criticalClientHintsConfiguration.clientWidth
  }

  if (hints.devicePixelRatioAvailable && criticalClientHintsConfiguration.viewportSize) {
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

  if (hints.widthAvailable && criticalClientHintsConfiguration.width) {
    const header = headers[AcceptClientHintsRequestHeaders.width]
    if (header) {
      hints.firstRequest = false
      try {
        hints.width = Number.parseInt(header)
      }
      catch {
        // just ignore
      }
    }
  }

  return hints
}

function writeClientHintsResponseHeaders(
  criticalClientHints: CriticalClientHints,
  criticalClientHintsConfiguration: CriticalClientHintsConfiguration,
) {
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Critical-CH
  // Each header listed in the Critical-CH header should also be present in the Accept-CH and Vary headers.
  const headers: Record<string, string[]> = {}

  if (criticalClientHintsConfiguration.prefersColorScheme && criticalClientHints.prefersColorSchemeAvailable)
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.prefersColorScheme, headers)

  if (criticalClientHintsConfiguration.prefersReducedMotion && criticalClientHints.prefersReducedMotionAvailable)
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.prefersReducedMotion, headers)

  if (criticalClientHintsConfiguration.prefersReducedTransparency && criticalClientHints.prefersReducedTransparencyAvailable)
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.prefersReducedTransparency, headers)

  if (criticalClientHintsConfiguration.viewportSize && criticalClientHints.viewportHeightAvailable && criticalClientHints.viewportWidthAvailable) {
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.viewportHeight, headers)
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.viewportWidth, headers)
    if (criticalClientHints.devicePixelRatioAvailable)
      writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.devicePixelRatio, headers)
  }

  if (criticalClientHintsConfiguration.width && criticalClientHints.widthAvailable)
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.width, headers)

  writeHeaders(headers)
}

function writeThemeCookie(
  criticalClientHints: CriticalClientHints,
  criticalClientHintsConfiguration: CriticalClientHintsConfiguration,
) {
  if (!criticalClientHintsConfiguration.prefersColorScheme || !criticalClientHintsConfiguration.prefersColorSchemeOptions)
    return

  const cookieName = criticalClientHintsConfiguration.prefersColorSchemeOptions.cookieName
  const themeName = criticalClientHints.colorSchemeFromCookie ?? criticalClientHintsConfiguration.prefersColorSchemeOptions.defaultTheme
  const path = criticalClientHintsConfiguration.prefersColorSchemeOptions.baseUrl

  const date = new Date()
  const expires = new Date(date.setDate(date.getDate() + 365))
  if (!criticalClientHints.firstRequest || !criticalClientHintsConfiguration.reloadOnFirstRequest) {
    useCookie(cookieName, {
      path,
      expires,
      sameSite: 'lax',
    }).value = themeName
  }

  return `${cookieName}=${themeName}; Path=${path}; Expires=${expires.toUTCString()}; SameSite=Lax`
}
