import { parseUserAgent } from 'detect-browser-es'
import { useHttpClientHintsState } from './state'
import { defineNuxtPlugin, useRequestHeaders } from '#imports'
import type { Plugin } from '#app'

const plugin: Plugin = defineNuxtPlugin({
  name: 'http-client-hints:init-server:plugin',
  enforce: 'pre',
  parallel: false,
  setup(nuxtApp) {
    useHttpClientHintsState()
    const ssrContext = nuxtApp.ssrContext!
    const requestHeaders = useRequestHeaders<string>(['user-agent'])
    const userAgentHeader = requestHeaders['user-agent']
    ssrContext._httpClientHintsUserAgent = userAgentHeader
      ? parseUserAgent(userAgentHeader)
      : null
  },
})

export default plugin
