export default defineNuxtConfig({
  compatibilityDate: '2024-10-11',
  devtools: { enabled: true },
  modules: ['../src/module'],

  httpClientHints: {
    detectBrowser: true,
    detectOS: 'windows-11',
    critical: {
      width: true,
      prefersColorScheme: true,
    },
  },

})
