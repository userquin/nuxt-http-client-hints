export default defineNuxtConfig({
  modules: ['../src/module'],

  httpClientHints: {
    detectBrowser: true,
    detectOS: 'windows-11',
    http: {
      prefersColorScheme: true,
    },
  },

  devtools: { enabled: true },
  compatibilityDate: '2024-10-11',
})
