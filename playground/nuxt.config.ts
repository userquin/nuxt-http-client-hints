import DevImage from './server/dev-image'

export default defineNuxtConfig({
  compatibilityDate: '2024-10-11',
  devtools: { enabled: true },
  modules: ['../src/module'],

  httpClientHints: {
    detectBrowser: true,
    detectOS: 'windows-11',
    device: 'memory',
    network: true,
    userAgent: true,
    critical: {
      width: true,
      viewportSize: true,
      prefersColorScheme: true,
    },
    serverImages: true,
  },

  nitro: {
    handlers: [
      {
        middleware: true,
        handler: '~/server/image',
      },
    ],
    devHandlers: [{
      route: '',
      handler: DevImage,
    }],
  },

})
