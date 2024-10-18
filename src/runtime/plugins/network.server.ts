import type { parseUserAgent } from 'detect-browser-es'
import { extractNetworkHints, NetworkHintsHeaders } from '../utils/network'
import type { ResolvedHttpClientHintsOptions } from '../shared-types/types'
import { useHttpClientHintsState } from './utils'
import { writeHeaders } from './headers'
import { defineNuxtPlugin, useRequestHeaders } from '#imports'
import type { Plugin } from '#app'

const plugin: Plugin = defineNuxtPlugin({
  name: 'http-client-hints:network-server:plugin',
  enforce: 'post',
  parallel: true,
  // @ts-expect-error missing at build time
  dependsOn: ['http-client-hints:init-server:plugin'],
  setup(nuxtApp) {
    const ssrContext = nuxtApp.ssrContext!
    const httpClientHints = ssrContext._httpClientHintsOptions as ResolvedHttpClientHintsOptions
    const userAgent = ssrContext._httpClientHintsUserAgent as ReturnType<typeof parseUserAgent>
    const state = useHttpClientHintsState()
    const requestHeaders = useRequestHeaders<string>(NetworkHintsHeaders)
    state.value.network = extractNetworkHints(httpClientHints, requestHeaders, userAgent, writeHeaders)
  },
})

export default plugin
