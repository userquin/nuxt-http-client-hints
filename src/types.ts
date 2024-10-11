import type {
  DeviceHints,
  NetworkHints,
  SSRClientHintsConfiguration,
  UserAgentHints,
} from './runtime/shared-types/types'

export interface HttpClientHints {
  /**
   * Enable browser.
   *
   * This can be auto-enabled when enabling SSR and using some client hints like HTTP Client Hints.
   *
   * @default false
   */
  detectBrowser?: boolean
  /**
   * Include Windows 11 detection.
   */
  detectOS?: true | 'windows-11'
  /**
   * Enable User-Agent Client Hints.
   * @see https://github.com/WICG/ua-client-hints
   */
  userAgent?: true | UserAgentHints | UserAgentHints[]
  /**
   * Enable Network Hints.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#client_hints
   */
  network?: true | NetworkHints | NetworkHints[]
  /**
   * Enable Device Hints.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#client_hints
   */
  device?: true | DeviceHints | DeviceHints[]
  /**
   * Enable HTTP Client Hints.
   * @see https://wicg.github.io/responsive-image-client-hints
   */
  http?: SSRClientHintsConfiguration
}
