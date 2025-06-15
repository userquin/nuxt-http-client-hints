export default defineNuxtPlugin({
  setup(nuxt) {
    nuxt.hook('http-client-hints:client-hints', (ssrClientHints) => {
      console.log('http-client-hints:client-hints', ssrClientHints)
    })
  },
})
