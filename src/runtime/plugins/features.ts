import type { Browser, parseUserAgent } from 'detect-browser-es'

export function browserFeatureAvailable<T extends string>(
  allowedBrowsers: [browser: Browser, features: Record<T, (android: boolean, versions: number[]) => boolean>][],
  userAgent: ReturnType<typeof parseUserAgent>,
  feature: T,
) {
  if (userAgent == null || userAgent.type !== 'browser')
    return false

  try {
    const browserName = userAgent.name
    const android = userAgent.os?.toLowerCase().startsWith('android') ?? false
    const versions = userAgent.version.split('.').map(v => Number.parseInt(v))
    return allowedBrowsers.some(([name, check]) => {
      if (browserName !== name)
        return false

      try {
        return check[feature](android, versions)
      }
      catch {
        return false
      }
    })
  }
  catch {
    return false
  }
}
