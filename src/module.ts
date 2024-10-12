import { createResolver, defineNuxtModule } from '@nuxt/kit'
import type { HookResult } from '@nuxt/schema'
import { version } from '../package.json'
import type { HttpClientHintsOptions as ModuleOptions } from './types'
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
    compatibility: {
      nuxt: '>=3.9.0',
    },
    version,
  },
  defaults: () => ({
    detectBrowser: false,
  }),
  setup(options, nuxt) {
    configure(createResolver(import.meta.url), options, nuxt)
  },
})
