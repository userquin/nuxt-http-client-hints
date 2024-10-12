import type {
  DeviceHints,
  NetworkHints,
  CriticalClientHintsConfiguration,
  UserAgentHints,
} from './runtime/shared-types/types'

export interface HttpClientHintsOptions {
  /**
   * Enable browser.
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
   * Enable Critical Client Hints.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Client_hints#critical_client_hints
   * @see https://wicg.github.io/responsive-image-client-hints
   */
  critical?: CriticalClientHintsConfiguration
}
