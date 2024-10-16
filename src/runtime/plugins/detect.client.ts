import { browserName, detect, asyncDetect, detectOS, parseUserAgent } from 'detect-browser-es'
import type { UserAgentHints } from '../shared-types/types'
import { defineNuxtPlugin } from '#imports'
import type { Plugin } from '#app'

const plugin: Plugin = defineNuxtPlugin({
  name: 'http-client-hints:detect-client:plugin',
  setup() {
    return {
      provide: {
        browserName: () => browserName(navigator.userAgent),
        detectBrowser: () => detect(navigator.userAgent),
        detectBrowserAsync: (hints?: UserAgentHints[]) => asyncDetect({
          userAgent: navigator.userAgent,
          hints,
        }),
        detectOS: () => detectOS(navigator.userAgent),
        parseUserAgent: () => parseUserAgent(navigator.userAgent),
      },
    }
  },
})

export default plugin
