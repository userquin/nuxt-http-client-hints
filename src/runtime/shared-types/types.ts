import type { Browser, DetectedInfoType, OperatingSystem, UserAgentDataInfo } from 'detect-browser-es'

/**
 * @see https://github.com/WICG/ua-client-hints
 */
export type UserAgentHints = 'architecture' | 'bitness' | 'model' | 'platformVersion' | 'fullVersionList'
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#client_hints
 */
export type NetworkHints = 'Save-Data' | 'Downlink' | 'ECT' | 'RTT'
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#client_hints
 */
export type DeviceHints = 'Device-Memory'
/**
 * @see https://wicg.github.io/responsive-image-client-hints
 */
export type ClientHints = 'Sec-CH-Width' | 'Sec-CH-Prefers-Color-Scheme' | 'Sec-CH-Prefers-Reduced-Motion' | 'Sec-CH-Viewport-Height' | 'Sec-CH-Viewport-Width' | 'Sec-CH-DPR'

export interface ClientHintRequestFeatures {
  firstRequest: boolean
  prefersColorSchemeAvailable: boolean
  prefersReducedMotionAvailable: boolean
  viewportHeightAvailable: boolean
  viewportWidthAvailable: boolean
  devicePixelRatioAvailable: boolean
}
export interface SSRClientHints extends ClientHintRequestFeatures {
  prefersColorScheme?: 'dark' | 'light' | 'no-preference'
  prefersReducedMotion?: 'no-preference' | 'reduce'
  viewportHeight?: number
  viewportWidth?: number
  devicePixelRatio?: number
  colorSchemeFromCookie?: string
  colorSchemeCookie?: string
}

export interface HttpClientHintsState {
  browserInfo?: {
    type: DetectedInfoType
    bot?: boolean
    name: Browser
    version?: string | null
    os: OperatingSystem | null
    ua?: UserAgentDataInfo | null
  }
  userAgentData?: UserAgentDataInfo
  clientHints?: SSRClientHints
}

export interface SSRClientHintsConfiguration {
  /**
   * Should the module reload the page on first request?
   *
   * @default false
   */
  reloadOnFirstRequest?: boolean
  /**
   * Enable `Sec-CH-Viewport-Width` and `Sec-CH-Viewport-Height` headers?
   *
   * @see https://wicg.github.io/responsive-image-client-hints/#sec-ch-viewport-width
   * @see https://wicg.github.io/responsive-image-client-hints/#sec-ch-viewport-height
   *
   * @default false
   */
  viewportSize?: boolean
  /**
   * Enable `Sec-CH-Prefers-Color-Scheme` header?
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Color-Scheme
   *
   * @default false
   */
  prefersColorScheme?: boolean
  /**
   * Enable `Sec-CH-Prefers-Reduced-Motion` header?
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Reduced-Motion
   *
   * @default false
   */
  prefersReducedMotion: boolean
  clientWidth?: number
  clientHeight?: number
  /**
   * The options for `prefersColorScheme`, `prefersColorScheme` must be enabled.
   *
   * If you want the module to handle the color scheme for you, you should configure this option, otherwise you'll need to add your custom implementation.
   */
  prefersColorSchemeOptions?: {
    baseUrl: string
    defaultTheme: string
    themeNames: string[]
    /**
     * The name for the cookie.
     *
     * @default 'color-scheme'
     */
    cookieName: string
    /**
     * The name for the dark theme.
     *
     * @default 'dark'
     */
    darkThemeName: string
    /**
     * The name for the light theme.
     *
     * @default 'light'
     */
    lightThemeName: string
    /**
     * Use the browser theme only?
     *
     * This flag can be used when your application provides a custom dark and light themes,
     * but will not provide a theme switcher, that's, using by default the browser theme.
     *
     * @default false
     */
    useBrowserThemeOnly: boolean
  }
}

export interface ResolvedConfigurationOptions {
  detectBrowser: boolean
  detectOS: boolean | 'windows-11'
  userAgent: UserAgentHints[]
  network: NetworkHints[]
  device: DeviceHints[]
  /**
   * Http Client Hints.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Client_hints
   */
  http?: SSRClientHintsConfiguration
}
