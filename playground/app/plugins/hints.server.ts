export default defineNuxtPlugin({
  setup(nuxt) {
    nuxt.hook('http-client-hints:ssr-client-hints', (ssrClientHints) => {
      console.log('http-client-hints:ssr-client-hints', ssrClientHints)
    })
  },
})
