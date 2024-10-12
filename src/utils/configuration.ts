import type { Nuxt } from '@nuxt/schema'
import type { Resolver } from '@nuxt/kit'
import { addPlugin, addPluginTemplate } from '@nuxt/kit'
import type { HttpClientHintsOptions } from '../types'
import type { ResolvedHttpClientHintsOptions } from '../runtime/shared-types/types'

type PluginType = 'detect' | 'user-agent' | 'network' | 'device' | 'critical'

export function configure(resolver: Resolver, options: HttpClientHintsOptions, nuxt: Nuxt) {
  const runtimeDir = resolver.resolve('./runtime')

  nuxt.options.build.transpile.push(runtimeDir)

  if ((options.detectBrowser || options.detectOS) && !nuxt.options.ssr) {
    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ path: resolver.resolve(runtimeDir, 'plugins/types') })
    })
    addPlugin(resolver.resolve(runtimeDir, 'plugins/detect.client'))
  }

  if (!nuxt.options.ssr) {
    return
  }

  const resolvedOptions: ResolvedHttpClientHintsOptions = {
    detectBrowser: false,
    detectOS: false,
    userAgent: [],
    network: [],
    device: [],
  }

  const dependsOn: PluginType[] = []

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
    if (resolvedOptions.userAgent.length) {
      dependsOn.push('user-agent')
    }
  }

  if (network) {
    if (network === true) {
      resolvedOptions.network.push('Save-Data', 'Downlink', 'ECT', 'RTT')
    }
    else if (Array.isArray(network)) {
      resolvedOptions.network.push(...network)
    }
    else {
      resolvedOptions.network.push(network)
    }
    if (resolvedOptions.network.length) {
      dependsOn.push('network')
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
      dependsOn.push('device')
    }
  }
  if (critical) {
    resolvedOptions.critical = critical
    dependsOn.push('critical')
  }

  if (!dependsOn.length) {
    return
  }

  nuxt.hook('prepare:types', ({ references }) => {
    references.push({ path: resolver.resolve(runtimeDir, 'plugins/types') })
  })

  if (options.detectOS) {
    resolvedOptions.detectOS = options.detectOS
  }

  nuxt.options.runtimeConfig.public.httpClientHints = resolvedOptions

  addPlugin(resolver.resolve(runtimeDir, 'plugins/init.client'))
  addPlugin(resolver.resolve(runtimeDir, 'plugins/init.server'))

  if (options.detectBrowser || options.detectOS) {
    addPlugin(resolver.resolve(runtimeDir, 'plugins/detect.client'))
    addPlugin(resolver.resolve(runtimeDir, 'plugins/detect.server'))
  }

  if (dependsOn.includes('user-agent')) {
    addPlugin(resolver.resolve(runtimeDir, 'plugins/user-agent.client'))
    addPlugin(resolver.resolve(runtimeDir, 'plugins/user-agent.server'))
  }

  if (dependsOn.includes('network')) {
    addPlugin(resolver.resolve(runtimeDir, 'plugins/network.client'))
    addPlugin(resolver.resolve(runtimeDir, 'plugins/network.server'))
  }

  if (dependsOn.includes('device')) {
    addPlugin(resolver.resolve(runtimeDir, 'plugins/device.client'))
    addPlugin(resolver.resolve(runtimeDir, 'plugins/device.server'))
  }

  if (dependsOn.includes('critical')) {
    addPlugin(resolver.resolve(runtimeDir, 'plugins/critical.client'))
    addPlugin(resolver.resolve(runtimeDir, 'plugins/critical.server'))
  }

  // @ts-expect-error missing at build time
  addClientHintsPlugin('client', dependsOn.map(p => `http-client-hints:${p}-client:plugin`))
  // @ts-expect-error missing at build time
  addClientHintsPlugin('server', dependsOn.map(p => `http-client-hints:${p}-server:plugin`))
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
