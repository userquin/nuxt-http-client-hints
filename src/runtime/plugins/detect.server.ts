import {
  asyncDetect,
  browserName,
  detect,
  detectOS,
  parseUserAgent,
  serverResponseHeadersForUserAgentHints,
} from 'detect-browser-es'
import { appendHeader } from 'h3'
import type { ResolvedHttpClientHintsOptions, UserAgentHints } from '../shared-types/types'
import { useHttpClientHintsState } from './state'
import {
  defineNuxtPlugin,
  useNuxtApp,
  useRequestEvent,
  useRequestHeaders,
  useRuntimeConfig,
} from '#imports'

export default defineNuxtPlugin({
  name: 'http-client-hints:detect-server:plugin',
  enforce: 'pre',
  parallel: true,
  // @ts-expect-error missing at build time
  dependsOn: ['http-client-hints:init-server:plugin'],
  async setup() {
    const state = useHttpClientHintsState()
    const httpClientHints = useRuntimeConfig().public.httpClientHints as ResolvedHttpClientHintsOptions
    const requestHeaders = useRequestHeaders()

    const userAgentHeader = requestHeaders['user-agent']

    if (httpClientHints.detectOS === 'windows-11') {
      const hintsSet = new Set(httpClientHints.userAgent)
      // Windows 11 detection requires platformVersion hint
      if (!hintsSet.has('platformVersion')) {
        hintsSet.add('platformVersion')
      }
      const hints = Array.from(hintsSet)
      // write headers
      const headers = serverResponseHeadersForUserAgentHints(hints)
      if (headers) {
        const nuxtApp = useNuxtApp()
        const callback = () => {
          const event = useRequestEvent(nuxtApp)
          if (event) {
            for (const [key, value] of Object.entries(headers)) {
              if (value) {
                appendHeader(event, key, value)
              }
            }
          }
        }
        const unhook = nuxtApp.hooks.hookOnce('app:rendered', callback)
        nuxtApp.hooks.hookOnce('app:error', () => {
          unhook()
          return callback()
        })
      }
      // detect browser info
      const browserInfo = await asyncDetect({
        hints,
        httpHeaders: requestHeaders,
      })
      if (browserInfo) {
        state.value.browserInfo = JSON.parse(JSON.stringify(browserInfo))
      }
    }
    else if (userAgentHeader) {
      const browserInfo = detect(userAgentHeader)
      if (browserInfo) {
        state.value.browserInfo = JSON.parse(JSON.stringify(browserInfo))
      }
    }

    return {
      provide: {
        browserName: () => userAgentHeader ? browserName(userAgentHeader) : null,
        detectBrowser: () => detect(userAgentHeader),
        detectBrowserAsync: (hints?: UserAgentHints[]) => asyncDetect({
          httpHeaders: requestHeaders,
          hints,
        }),
        detectOS: () => userAgentHeader ? detectOS(userAgentHeader) : null,
        parseUserAgent: () => userAgentHeader ? parseUserAgent(userAgentHeader) : null,
      },
    }
  },
})
