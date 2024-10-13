import type { parseUserAgent } from 'detect-browser-es'
import { CriticalHintsHeaders, extractCriticalHints } from '../utils/critical'
import { writeHeaders } from './headers'
import { useHttpClientHintsOptions, useHttpClientHintsState } from './utils'
import { defineNuxtPlugin, useCookie, useRequestHeaders } from '#imports'
import type { Plugin } from '#app'
import type { HttpClientHintsOptions } from '~/src/types'
import type { ResolvedHttpClientHintsOptions } from '~/src/runtime/shared-types/types'

const plugin: Plugin = defineNuxtPlugin({
  name: 'http-client-hints:critical-server:plugin',
  enforce: 'pre',
  parallel: true,
  // @ts-expect-error missing at build time
  dependsOn: ['http-client-hints:init-server:plugin'],
  async setup(nuxtApp) {
    const ssrContext = nuxtApp.ssrContext!
    const httpClientHints = ssrContext._httpClientHintsOptions as ResolvedHttpClientHintsOptions
    const userAgent = ssrContext._httpClientHintsUserAgent as ReturnType<typeof parseUserAgent>
    const state = useHttpClientHintsState()
    const requestHeaders = useRequestHeaders<string>(CriticalHintsHeaders)
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
