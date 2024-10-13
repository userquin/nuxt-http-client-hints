import type { Browser, parseUserAgent } from 'detect-browser-es'
import type {
  CriticalClientHintsConfiguration,
  CriticalInfo,
  ResolvedHttpClientHintsOptions,
} from '../shared-types/types'
import { lookupHeader, writeClientHintHeaders } from './headers'
import { browserFeatureAvailable } from './features'

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
export const CriticalHintsHeaders = Array.from(Object.values(AcceptClientHintsRequestHeaders)).concat('user-agent', 'cookie', SecChUaMobile)

export function extractCriticalHints(
  httpClientHints: ResolvedHttpClientHintsOptions,
  requestHeaders: { [key in Lowercase<string>]?: string },
  userAgent: ReturnType<typeof parseUserAgent>,
  writeHeaders?: (headers: Record<string, string[]>) => void,
  writeCookie?: (cookieName: string, path: string, expires: Date, themeName: string) => void,
): CriticalInfo {
  // 1. prepare client hints request
  const clientHintsRequest = collectClientHints(userAgent, httpClientHints.critical!, requestHeaders)
  // 2. write client hints response headers
  if (writeHeaders) {
    writeClientHintsResponseHeaders(clientHintsRequest, httpClientHints.critical!, writeHeaders)
  }
  // 3. send the theme cookie to the client when required
  clientHintsRequest.colorSchemeCookie = writeThemeCookie(
    clientHintsRequest,
    httpClientHints.critical!,
    writeCookie,
  )

  return clientHintsRequest
}

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

function lookupClientHints(
  userAgent: ReturnType<typeof parseUserAgent>,
  criticalClientHintsConfiguration: CriticalClientHintsConfiguration,
  headers: { [key in Lowercase<string>]?: string | undefined },
) {
  const features: CriticalInfo = {
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
    features.prefersColorSchemeAvailable = browserFeatureAvailable(allowedBrowsers, userAgent, 'prefersColorScheme')

  if (criticalClientHintsConfiguration.prefersReducedMotion)
    features.prefersReducedMotionAvailable = browserFeatureAvailable(allowedBrowsers, userAgent, 'prefersReducedMotion')

  if (criticalClientHintsConfiguration.prefersReducedTransparency)
    features.prefersReducedMotionAvailable = browserFeatureAvailable(allowedBrowsers, userAgent, 'prefersReducedTransparency')

  if (criticalClientHintsConfiguration.viewportSize) {
    features.viewportHeightAvailable = browserFeatureAvailable(allowedBrowsers, userAgent, 'viewportHeight')
    features.viewportWidthAvailable = browserFeatureAvailable(allowedBrowsers, userAgent, 'viewportWidth')
  }

  if (criticalClientHintsConfiguration.width) {
    features.widthAvailable = browserFeatureAvailable(allowedBrowsers, userAgent, 'width')
  }

  if (features.viewportWidthAvailable || features.viewportHeightAvailable) {
    // We don't need to include DPR on desktop browsers.
    // Since sec-ch-ua-mobile is a low entropy header, we don't need to include it in Accept-CH,
    // the user agent will send it always unless blocked by a user agent permission policy, check:
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Mobile
    const mobileHeader = lookupHeader(
      'boolean',
      SecChUaMobile,
      headers,
    )
    if (mobileHeader)
      features.devicePixelRatioAvailable = browserFeatureAvailable(allowedBrowsers, userAgent, 'devicePixelRatio')
  }

  return features
}

function collectClientHints(
  userAgent: ReturnType<typeof parseUserAgent>,
  criticalClientHintsConfiguration: CriticalClientHintsConfiguration,
  headers: { [key in Lowercase<string>]?: string | undefined },
) {
  // collect client hints
  const hints = lookupClientHints(userAgent, criticalClientHintsConfiguration, headers)

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
    const viewportHeight = lookupHeader(
      'int',
      AcceptClientHintsRequestHeaders.viewportHeight,
      headers,
    )
    if (typeof viewportHeight === 'number') {
      hints.firstRequest = false
      hints.viewportHeight = viewportHeight
    }
    else {
      hints.viewportHeight = criticalClientHintsConfiguration.clientHeight
    }
  }
  else {
    hints.viewportHeight = criticalClientHintsConfiguration.clientHeight
  }

  if (hints.viewportWidthAvailable && criticalClientHintsConfiguration.viewportSize) {
    const viewportWidth = lookupHeader(
      'int',
      AcceptClientHintsRequestHeaders.viewportWidth,
      headers,
    )
    if (typeof viewportWidth === 'number') {
      hints.firstRequest = false
      hints.viewportWidth = viewportWidth
    }
    else {
      hints.viewportWidth = criticalClientHintsConfiguration.clientWidth
    }
  }
  else {
    hints.viewportWidth = criticalClientHintsConfiguration.clientWidth
  }

  if (hints.devicePixelRatioAvailable && criticalClientHintsConfiguration.viewportSize) {
    const devicePixelRatio = lookupHeader(
      'float',
      AcceptClientHintsRequestHeaders.devicePixelRatio,
      headers,
    )
    if (typeof devicePixelRatio === 'number') {
      hints.firstRequest = false
      try {
        hints.devicePixelRatio = devicePixelRatio
        if (!Number.isNaN(devicePixelRatio) && devicePixelRatio > 0) {
          if (typeof hints.viewportWidth === 'number')
            hints.viewportWidth = Math.round(hints.viewportWidth / devicePixelRatio)
          if (typeof hints.viewportHeight === 'number')
            hints.viewportHeight = Math.round(hints.viewportHeight / devicePixelRatio)
        }
      }
      catch {
        // just ignore
      }
    }
  }

  if (hints.widthAvailable && criticalClientHintsConfiguration.width) {
    const width = lookupHeader(
      'int',
      AcceptClientHintsRequestHeaders.width,
      headers,
    )
    if (typeof width === 'number') {
      hints.firstRequest = false
      hints.width = width
    }
  }

  return hints
}

function writeClientHintsResponseHeaders(
  criticalInfo: CriticalInfo,
  criticalClientHintsConfiguration: CriticalClientHintsConfiguration,
  writeHeaders: (headers: Record<string, string[]>) => void,
) {
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Critical-CH
  // Each header listed in the Critical-CH header should also be present in the Accept-CH and Vary headers.
  const headers: Record<string, string[]> = {}

  if (criticalClientHintsConfiguration.prefersColorScheme && criticalInfo.prefersColorSchemeAvailable)
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.prefersColorScheme, headers)

  if (criticalClientHintsConfiguration.prefersReducedMotion && criticalInfo.prefersReducedMotionAvailable)
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.prefersReducedMotion, headers)

  if (criticalClientHintsConfiguration.prefersReducedTransparency && criticalInfo.prefersReducedTransparencyAvailable)
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.prefersReducedTransparency, headers)

  if (criticalClientHintsConfiguration.viewportSize && criticalInfo.viewportHeightAvailable && criticalInfo.viewportWidthAvailable) {
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.viewportHeight, headers)
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.viewportWidth, headers)
    if (criticalInfo.devicePixelRatioAvailable)
      writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.devicePixelRatio, headers)
  }

  if (criticalClientHintsConfiguration.width && criticalInfo.widthAvailable)
    writeClientHintHeaders(ClientHeaders, AcceptClientHintsHeaders.width, headers)

  writeHeaders(headers)
}

function writeThemeCookie(
  criticalInfo: CriticalInfo,
  criticalClientHintsConfiguration: CriticalClientHintsConfiguration,
  writeCookie?: (cookieName: string, path: string, expires: Date, themeName: string) => void,
) {
  if (!criticalClientHintsConfiguration.prefersColorScheme || !criticalClientHintsConfiguration.prefersColorSchemeOptions)
    return

  const cookieName = criticalClientHintsConfiguration.prefersColorSchemeOptions.cookieName
  const themeName = criticalInfo.colorSchemeFromCookie ?? criticalClientHintsConfiguration.prefersColorSchemeOptions.defaultTheme
  const path = criticalClientHintsConfiguration.prefersColorSchemeOptions.baseUrl

  const date = new Date()
  const expires = new Date(date.setDate(date.getDate() + 365))
  if (writeCookie && (!criticalInfo.firstRequest || !criticalClientHintsConfiguration.reloadOnFirstRequest)) {
    writeCookie(cookieName, path, expires, themeName)
  }

  return `${cookieName}=${themeName}; Path=${path}; Expires=${expires.toUTCString()}; SameSite=Lax`
}
