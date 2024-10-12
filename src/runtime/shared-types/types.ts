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
export type DeviceHints = 'memory'

export interface CriticalClientHintsRequestFeatures {
  firstRequest: boolean
  prefersColorSchemeAvailable: boolean
  prefersReducedMotionAvailable: boolean
  prefersReducedTransparencyAvailable: boolean
  viewportHeightAvailable: boolean
  viewportWidthAvailable: boolean
  widthAvailable: boolean
  devicePixelRatioAvailable: boolean
}
export interface CriticalClientHints extends CriticalClientHintsRequestFeatures {
  prefersColorScheme?: 'dark' | 'light' | 'no-preference'
  prefersReducedMotion?: 'no-preference' | 'reduce'
  prefersReducedTransparency?: 'no-preference' | 'reduce'
  viewportHeight?: number
  viewportWidth?: number
  width?: number
  devicePixelRatio?: number
  colorSchemeFromCookie?: string
  colorSchemeCookie?: string
}

export interface DeviceClientHintsRequestFeatures {
  memoryAvailable: boolean
}
export interface DeviceClientHints extends DeviceClientHintsRequestFeatures {
  memory?: number
}

export interface BrowserInfo {
  type: DetectedInfoType
  bot?: boolean
  name: Browser
  version?: string | null
  os: OperatingSystem | null
  ua?: UserAgentDataInfo | null
}

export interface DeviceInfo {
  memory?: number
}

export interface HttpClientHintsState {
  browserInfo?: BrowserInfo
  deviceInfo?: DeviceInfo
  userAgentData?: UserAgentDataInfo
  clientHints?: CriticalClientHints
}

export interface CriticalClientHintsConfiguration {
  /**
   * Should the module reload the page on first request?
   *
   * @default false
   */
  reloadOnFirstRequest?: boolean
  /**
   * Enable `Sec-CH-Width` for images?
   * @see https://wicg.github.io/responsive-image-client-hints/#sec-ch-width
   * @default false
   */
  width?: boolean
  /**
   * Enable `Sec-CH-Viewport-Width` and `Sec-CH-Viewport-Height` headers?
   * @see https://wicg.github.io/responsive-image-client-hints/#sec-ch-viewport-width
   * @see https://wicg.github.io/responsive-image-client-hints/#sec-ch-viewport-height
   * @default false
   */
  viewportSize?: boolean
  /**
   * Enable `Sec-CH-Prefers-Color-Scheme` header?
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Color-Scheme
   * @default false
   */
  prefersColorScheme?: boolean
  /**
   * Enable `Sec-CH-Prefers-Reduced-Motion` header?
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Reduced-Motion
   * @default false
   */
  prefersReducedMotion?: boolean
  /**
   * Enable `Sec-CH-Prefers-Reduced-Transparency` header?
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Reduced-Transparency
   * @default false
   */
  prefersReducedTransparency?: boolean
  /**
   * Default client width when missing headers.
   */
  clientWidth?: number
  /**
   * Default client height when missing headers.
   */
  clientHeight?: number
  /**
   * The options for `prefersColorScheme`, `prefersColorScheme` must be enabled.
   *
   * If you want the module to handle the color scheme for you, you should configure this option, otherwise you'll need to add your custom implementation.
   */
  prefersColorSchemeOptions?: {
    /**
     * The default base URL for the theme cookie.
     * @default '/'
     */
    baseUrl: string
    /**
     * The default theme name.
     */
    defaultTheme: string
    /**
     * The available theme names.
     */
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

export interface ResolvedHttpClientHintsOptions {
  detectBrowser: boolean
  detectOS: boolean | 'windows-11'
  userAgent: UserAgentHints[]
  network: NetworkHints[]
  device: DeviceHints[]
  /**
   * Critical Client Hints.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Client_hints#critical_client_hints
   */
  critical?: CriticalClientHintsConfiguration
}
