export default defineNuxtConfig({
  compatibilityDate: '2024-10-11',
  devtools: { enabled: true },
  modules: ['../src/module'],

  httpClientHints: {
    detectBrowser: true,
    detectOS: 'windows-11',
    device: 'memory',
    network: ['savedata', 'downlink', 'ect', 'rtt'],
    critical: {
      width: true,
      viewportSize: true,
      prefersColorScheme: true,
    },
  },

})
