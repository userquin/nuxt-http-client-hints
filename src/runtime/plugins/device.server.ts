import type { parseUserAgent } from 'detect-browser-es'
import { extractDeviceHints, HttpRequestHeaders } from '../utils/device'
import { useHttpClientHintsState } from './state'
import { writeHeaders } from './headers'
import { defineNuxtPlugin, useRequestHeaders, useRuntimeConfig } from '#imports'
import type { Plugin } from '#app'
import type { ResolvedHttpClientHintsOptions } from '~/src/runtime/shared-types/types'

const plugin: Plugin = defineNuxtPlugin({
  name: 'http-client-hints:device-server:plugin',
  enforce: 'pre',
  parallel: true,
  // @ts-expect-error missing at build time
  dependsOn: ['http-client-hints:init-server:plugin'],
  setup(nuxtApp) {
    const state = useHttpClientHintsState()
    const userAgent = nuxtApp.ssrContext?._httpClientHintsUserAgent as ReturnType<typeof parseUserAgent>
    const httpClientHints = useRuntimeConfig().public.httpClientHints as ResolvedHttpClientHintsOptions
    const requestHeaders = useRequestHeaders<string>(HttpRequestHeaders)
    state.value.device = extractDeviceHints(httpClientHints, requestHeaders, userAgent, writeHeaders)
  },
})

export default plugin
