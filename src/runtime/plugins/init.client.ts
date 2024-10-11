import { useHttpClientHintsState } from './state'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin({
  name: 'http-client-hints:init-client:plugin',
  enforce: 'pre',
  parallel: false,
  setup() {
    useHttpClientHintsState()
  },
})
