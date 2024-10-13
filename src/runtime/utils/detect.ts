import type { BrowserInfo } from 'detect-browser-es'
import { asyncDetect, detect, serverResponseHeadersForUserAgentHints } from 'detect-browser-es'
import type { ResolvedHttpClientHintsOptions } from '../shared-types/types'

export async function extractBrowser(
  httpClientHints: ResolvedHttpClientHintsOptions,
  requestHeaders: Record<string, string>,
  userAgentHeader?: string,
  writeHeaders?: (headers: Record<string, string[]>) => void,
): Promise<BrowserInfo | undefined> {
  if (httpClientHints.detectOS === 'windows-11') {
    const hintsSet = new Set(httpClientHints.userAgent)
    // Windows 11 detection requires platformVersion hint
    if (!hintsSet.has('platformVersion')) {
      hintsSet.add('platformVersion')
    }
    const hints = Array.from(hintsSet)
    // write headers
    if (typeof writeHeaders === 'function') {
      const headers = serverResponseHeadersForUserAgentHints(hints)
      if (headers) {
        const useHeader: Record<string, string[]> = {}
        for (const [n, value] of Object.entries(headers)) {
          if (value) {
            useHeader[n] = [value]
          }
        }
        writeHeaders(useHeader)
      }
    }
    // detect browser info
    return (await asyncDetect({
      hints,
      httpHeaders: requestHeaders,
    })) as BrowserInfo
  }
  else if (userAgentHeader) {
    return detect(userAgentHeader) as BrowserInfo
  }

  return undefined
}
