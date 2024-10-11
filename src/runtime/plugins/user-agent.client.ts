import { useHttpClientHintsState } from './state'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin({
  name: 'http-client-hints:user-agent-client:plugin',
  enforce: 'pre',
  parallel: true,
  // @ts-expect-error missing at build time
  dependsOn: ['http-client-hints:init-client:plugin'],
  setup() {
    const state = useHttpClientHintsState()
  },
})
