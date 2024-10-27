import { addDevServerHandler, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  async setup(_, nuxt) {
    if (nuxt.options.dev) {
      addDevServerHandler({
        route: '',
        handler: await import('../server/dev-image').then(m => m.default),
      })
    }
    else {
      nuxt.hook('nitro:build:before', async (nitro) => {
        nitro.options.handlers.unshift({
          route: '',
          handler: '~~/server/image',
          middleware: true,
        })
      })
    }
  },
})
