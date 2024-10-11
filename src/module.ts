import { createResolver, defineNuxtModule } from '@nuxt/kit'
import type { HookResult } from '@nuxt/schema'
import type { HttpClientHints as ModuleOptions } from './types'
import { configure } from './utils/configuration'
import type { HttpClientHintsState } from './runtime/shared-types/types'

export type { ModuleOptions }

export interface ModuleRuntimeHooks {
  'http-client-hints:client-hints': (clientHints: HttpClientHintsState) => HookResult
  'http-client-hints:ssr-client-hints': (clientHints: HttpClientHintsState) => HookResult
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'http-client-hints',
    configKey: 'httpClientHints',
  },
  defaults: () => ({
    detectBrowser: false,
  }),
  setup(options, nuxt) {
    configure(createResolver(import.meta.url), options, nuxt)
  },
})
