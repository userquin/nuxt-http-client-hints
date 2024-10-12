import { createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'
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

const NAME = 'http-client-hints'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: NAME,
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
    configure(
      {
        resolver: createResolver(import.meta.url),
        logger: useLogger(`nuxt:${NAME}`),
        options,
        resolvedOptions: {
          detectBrowser: false,
          detectOS: false,
          userAgent: [],
          network: [],
          device: [],
        },
        clientDependsOn: [],
        serverDependsOn: [],
      },
      nuxt,
    )
  },
})
