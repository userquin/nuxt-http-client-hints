import { lstat, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { eventHandler } from 'h3'
import { useNitro } from '@nuxt/kit'
import sharp from 'sharp'
import type { HttpClientHintsState } from '../../src/runtime/shared-types/types'
import { extractHTTPClientHints } from './utils/image'

export default eventHandler(async (event) => {
  console.log('dev-image:', event.path)
  await extractHTTPClientHints(event)
  const httpClientHintsState: HttpClientHintsState | undefined = event.context.httpClientHints
  const { widthAvailable = false, width = -1 } = httpClientHintsState?.critical ?? {}
  if (widthAvailable && width > -1) {
    const image = await convertImage(event.path, width)
    if (image) {
      console.log('dev-image:Sec-CH-Width:', width)
      event.node.res.setHeader('Vary', 'Sec-CH-Width')
      event.node.res.end(image)
    }
  }
})

async function convertImage(path: string, width: number) {
  if (path.startsWith('/')) {
    path = path.slice(1)
  }
  const nitro = useNitro()
  const folders = nitro.options.publicAssets
  let image: string
  for (const folder of folders) {
    try {
      console.log(folder.dir)
      image = resolve(folder.dir, path)
      const stats = await lstat(image)
      if (stats.isFile()) {
        return sharp(await readFile(image)).resize({ width }).toBuffer()
      }
    }
    catch (_) {}
  }
}
