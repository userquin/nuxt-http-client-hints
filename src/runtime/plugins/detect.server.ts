import {
  asyncDetect,
  browserName,
  detect,
  detectOS,
  parseUserAgent,
} from 'detect-browser-es'
import { appendHeader } from 'h3'
import type { ResolvedHttpClientHintsOptions, UserAgentHints } from '../shared-types/types'
import { extractBrowser } from '../utils/detect'
import { useHttpClientHintsState } from './state'
import {
  defineNuxtPlugin,
  useNuxtApp,
  useRequestEvent,
  useRequestHeaders, useRuntimeConfig,
} from '#imports'
import type { Plugin } from '#app'

const plugin: Plugin = defineNuxtPlugin({
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

    const browser = await extractBrowser(
      httpClientHints,
      requestHeaders,
      userAgentHeader,
      (headers) => {
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
      },
    )

    if (browser) {
      state.value.browser = JSON.parse(JSON.stringify(browser))
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

export default plugin
