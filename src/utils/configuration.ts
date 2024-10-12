import type { Nuxt } from '@nuxt/schema'
import type { Resolver } from '@nuxt/kit'
import { addPlugin, addPluginTemplate } from '@nuxt/kit'
import type { HttpClientHintsOptions } from '../types'
import type { ResolvedHttpClientHintsOptions } from '../runtime/shared-types/types'

type PluginType = 'detect' | 'user-agent' | 'network' | 'device' | 'critical'

export interface HttpClientHintsContext {
  resolver: Resolver
  logger: ReturnType<typeof import('@nuxt/kit')['useLogger']>
  options: HttpClientHintsOptions
  resolvedOptions: ResolvedHttpClientHintsOptions
  clientDependsOn: PluginType[]
  serverDependsOn: PluginType[]
}

export function configure(ctx: HttpClientHintsContext, nuxt: Nuxt) {
  const {
    options,
    resolvedOptions,
    resolver,
    logger,
    clientDependsOn,
    serverDependsOn,
  } = ctx

  const runtimeDir = resolver.resolve('./runtime')

  const {
    userAgent,
    network,
    device,
    critical,
  } = options
  if (userAgent) {
    if (userAgent === true) {
      resolvedOptions.userAgent.push(
        'architecture',
        'bitness',
        'model',
        'platformVersion',
        'fullVersionList',
      )
    }
    else if (Array.isArray(userAgent)) {
      resolvedOptions.userAgent.push(...userAgent)
    }
    else {
      resolvedOptions.userAgent.push(userAgent)
    }
  }

  const clientOnly = nuxt.options._generate || !nuxt.options.ssr

  // we register the client detector only if needed and not in SSR mode
  if ((options.detectBrowser || options.detectOS || resolvedOptions.userAgent.length) && clientOnly) {
    nuxt.options.build.transpile.push(runtimeDir)
    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ path: resolver.resolve(runtimeDir, 'plugins/types') })
    })
    addPlugin(resolver.resolve(runtimeDir, 'plugins/detect.client'))
    return
  }

  // servers plugin work only with SSR
  if (clientOnly) {
    logger.warn('http-client-hints module is only supported in SSR mode')
    return
  }

  nuxt.options.build.transpile.push(runtimeDir)

  if (network) {
    if (network === true) {
      resolvedOptions.network.push('savedata', 'downlink', 'ect', 'rtt')
    }
    else if (Array.isArray(network)) {
      resolvedOptions.network.push(...network)
    }
    else {
      resolvedOptions.network.push(network)
    }
    if (resolvedOptions.network.length) {
      serverDependsOn.push('network')
    }
  }
  if (device) {
    if (device === true) {
      resolvedOptions.device.push('memory')
    }
    else if (Array.isArray(device)) {
      resolvedOptions.device.push(...device)
    }
    else {
      resolvedOptions.device.push(device)
    }
    if (resolvedOptions.device.length) {
      serverDependsOn.push('device')
    }
  }
  if (critical) {
    resolvedOptions.critical = critical
    serverDependsOn.push('critical')
  }

  if (!serverDependsOn.length) {
    return
  }

  nuxt.hook('prepare:types', ({ references }) => {
    references.push({ path: resolver.resolve(runtimeDir, 'plugins/types') })
  })

  if (options.detectOS) {
    resolvedOptions.detectOS = options.detectOS
  }

  nuxt.options.runtimeConfig.public.httpClientHints = resolvedOptions

  addPlugin(resolver.resolve(runtimeDir, 'plugins/init.server'))

  if (options.detectBrowser || options.detectOS || resolvedOptions.userAgent.length) {
    clientDependsOn.push('detect')
    serverDependsOn.push('detect')
    addPlugin(resolver.resolve(runtimeDir, 'plugins/detect.client'))
    addPlugin(resolver.resolve(runtimeDir, 'plugins/detect.server'))
  }

  if (serverDependsOn.includes('network')) {
    addPlugin(resolver.resolve(runtimeDir, 'plugins/network.server'))
  }

  if (serverDependsOn.includes('device')) {
    addPlugin(resolver.resolve(runtimeDir, 'plugins/device.server'))
  }

  if (serverDependsOn.includes('critical')) {
    addPlugin(resolver.resolve(runtimeDir, 'plugins/critical.server'))
  }

  if (clientDependsOn.length) {
    // @ts-expect-error missing at build time
    addClientHintsPlugin('client', clientDependsOn.map(p => `http-client-hints:${p}-client:plugin`))
  }
  // @ts-expect-error missing at build time
  addClientHintsPlugin('server', serverDependsOn.map(p => `http-client-hints:${p}-server:plugin`))
}

function addClientHintsPlugin(
  mode: 'client' | 'server',
  dependsOn: import('#app').NuxtAppLiterals['pluginName'][],
) {
  const name = `http-client-hints:${mode}:plugin`
  addPluginTemplate({
    filename: `http-client-hints.${mode}.mjs`,
    name,
    mode: `${mode}`,
    write: false,
    getContents() {
      return `import { defineNuxtPlugin, readonly, useState } from '#imports'
export default defineNuxtPlugin({
  name: '${name}',
  order: 'pre',
  dependsOn: ${JSON.stringify(dependsOn)},
  parallel: false,
  async setup(nuxtApp) {
    const clientHints = useState('http-client-hints:state')
    await nuxtApp.hooks.callHook(
      'http-client-hints:${mode === 'server' ? 'ssr-' : ''}client-hints',
      clientHints.value
    )
    return {
      provide: {
        httpClientHints: readonly(clientHints),
      }
    }
  }
})
`
    },
  })
}
