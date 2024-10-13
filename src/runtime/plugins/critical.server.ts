import type { parseUserAgent } from 'detect-browser-es'
import { CriticalHintsHeaders, extractCriticalHints } from '../utils/critical'
import { writeHeaders } from './headers'
import { useHttpClientHintsOptions, useHttpClientHintsState } from './utils'
import { defineNuxtPlugin, useCookie, useRequestHeaders } from '#imports'
import type { Plugin } from '#app'

const plugin: Plugin = defineNuxtPlugin({
  name: 'http-client-hints:critical-server:plugin',
  enforce: 'pre',
  parallel: true,
  // @ts-expect-error missing at build time
  dependsOn: ['http-client-hints:init-server:plugin'],
  async setup(nuxtApp) {
    const state = useHttpClientHintsState()
    const httpClientHints = useHttpClientHintsOptions()
    const requestHeaders = useRequestHeaders<string>(CriticalHintsHeaders)
    const userAgent = nuxtApp.ssrContext?._httpClientHintsUserAgent as ReturnType<typeof parseUserAgent>
    state.value.critical = extractCriticalHints(
      httpClientHints,
      requestHeaders,
      userAgent,
      writeHeaders,
      (cookieName, path, expires, themeName) => {
        useCookie(cookieName, {
          path,
          expires,
          sameSite: 'lax',
        }).value = themeName
      },
    )
  },
})

export default plugin
