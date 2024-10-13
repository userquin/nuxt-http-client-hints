import type { parseUserAgent } from 'detect-browser-es'
import { extractDeviceHints, HttpRequestHeaders } from '../utils/device'
import type { ResolvedHttpClientHintsOptions } from '../shared-types/types'
import { useHttpClientHintsState } from './utils'
import { writeHeaders } from './headers'
import { defineNuxtPlugin, useRequestHeaders } from '#imports'
import type { Plugin } from '#app'

const plugin: Plugin = defineNuxtPlugin({
  name: 'http-client-hints:device-server:plugin',
  enforce: 'pre',
  parallel: true,
  // @ts-expect-error missing at build time
  dependsOn: ['http-client-hints:init-server:plugin'],
  setup(nuxtApp) {
    const ssrContext = nuxtApp.ssrContext!
    const httpClientHints = ssrContext._httpClientHintsOptions as ResolvedHttpClientHintsOptions
    const userAgent = ssrContext._httpClientHintsUserAgent as ReturnType<typeof parseUserAgent>
    const state = useHttpClientHintsState()
    const requestHeaders = useRequestHeaders<string>(HttpRequestHeaders)
    state.value.device = extractDeviceHints(httpClientHints, requestHeaders, userAgent, writeHeaders)
  },
})

export default plugin
