import { lstat, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { lazyEventHandler, eventHandler, sendStream } from 'h3'
import sharp from 'sharp'
import { extractImageClientHints } from '../../src/runtime/server/utils'
import type { ResolvedHttpClientHintsOptions, ServerHttpClientHintsOptions } from '../../src/runtime/server/utils'
// import { readAsset } from '#internal/nitro/virtual/public-assets-data'

export default lazyEventHandler(() => {
  const appConfig = useAppConfig()
  const nitroApp = useNitroApp()
  const {
    serverImages,
    ...rest
  } = appConfig.httpClientHints as ServerHttpClientHintsOptions
  const options: ResolvedHttpClientHintsOptions = {
    ...rest,
    serverImages: serverImages.map(r => new RegExp(r)),
  }

  const publicFolder = resolve(fileURLToPath(import.meta.url), '../../public')

  const handler = eventHandler(async (event) => {
    console.log('dev-image', event.path)
    const clientHints = await extractImageClientHints(event, options)
    console.log('dev-image', event.path, clientHints?.httpClientHints.critical)
    if (clientHints) {
      const {
        widthAvailable = false,
        width = -1,
      } = clientHints.httpClientHints.critical ?? {}
      if (widthAvailable && width > -1) {
        const image = await convertImage(event.path, width)
        if (image) {
          console.log('dev-image:Sec-CH-Width:', width)
          event.node.res.setHeader('Vary', 'Sec-CH-Width')
          return sendStream(event, Readable.from(image))
        }
      }
    }
  })

  async function convertImage(path: string, width: number) {
    /* try {
      const image = await readAsset(path)
      if (image) {
        return await sharp(image).resize({ width }).toBuffer()
      }
    }
    catch (e) {
      // just ignore
      console.error('WTF', e)
    } */

    // return undefined
    if (path.startsWith('/')) {
      path = path.slice(1)
    }
    // const folders = appConfig.publicAssets
    // let image: string
    // for (const folder of folders) {
    try {
      const image = resolve(publicFolder, path)
      const stats = await lstat(image)
      if (stats.isFile()) {
        return await sharp(await readFile(image)).resize({ width }).toBuffer()
      }
    }
    catch {
      // just ignore
    }
  }
  // }

  nitroApp.h3App.stack.unshift({
    route: '',
    handler,
  })

  return eventHandler(() => {})
})
