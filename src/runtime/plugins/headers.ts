import { appendHeader } from 'h3'
import { useNuxtApp, useRequestEvent } from '#imports'

export function writeHeaders(headers: Record<string, string[]>) {
  if (Object.keys(headers).length === 0)
    return

  const nuxtApp = useNuxtApp()
  const callback = () => {
    const event = useRequestEvent(nuxtApp)
    if (event) {
      for (const [key, value] of Object.entries(headers)) {
        appendHeader(event, key, value)
      }
    }
  }
  const unhook = nuxtApp.hooks.hookOnce('app:rendered', callback)
  nuxtApp.hooks.hookOnce('app:error', () => {
    unhook()
    return callback()
  })
}
