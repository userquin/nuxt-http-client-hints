import { lstat, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Readable } from 'node:stream'
import { lazyEventHandler, eventHandler, sendStream } from 'h3'
import sharp from 'sharp'
import { useNitro } from '@nuxt/kit'
import { extractImageClientHints } from 'http-client-hints/h3'
import type { ResolvedHttpClientHintsOptions, ServerHttpClientHintsOptions } from 'http-client-hints/h3'

export default lazyEventHandler(async () => {
  const nitroOptions = useNitro().options
  const {
    serverImages,
    ...rest
  } = nitroOptions.appConfig.httpClientHints as ServerHttpClientHintsOptions
  const options: ResolvedHttpClientHintsOptions = {
    ...rest,
    serverImages: serverImages.map(r => new RegExp(r)),
  }

  return eventHandler(async (event) => {
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
    catch {
      // just ignore
    }

    // return undefined */
    if (path.startsWith('/')) {
      path = path.slice(1)
    }
    const folders = nitroOptions.publicAssets
    let image: string
    for (const folder of folders) {
      try {
        console.log(folder.dir)
        image = resolve(folder.dir, path)
        const stats = await lstat(image)
        if (stats.isFile()) {
          return await sharp(await readFile(image)).resize({ width }).toBuffer()
        }
      }
      catch {
        // just ignore
      }
    }
  }
})
