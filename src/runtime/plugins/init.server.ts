import { useHttpClientHintsState } from './state'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin({
  name: 'http-client-hints:init-server:plugin',
  enforce: 'pre',
  parallel: false,
  setup() {
    useHttpClientHintsState()
  },
})
