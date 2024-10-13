import type { DeepReadonly, UnwrapNestedRefs } from '@vue/reactivity'
import type { Browser, asyncDetect, detect, detectOS, parseUserAgent } from 'detect-browser-es'
import type { HttpClientHintsState, UserAgentDataHints } from '../shared-types/types'

declare module '#app' {
  interface NuxtApp {
    $browserName?: () => Browser | null
    $detectBrowser?: () => ReturnType<typeof detect>
    $detectBrowserAsync?: (hints?: UserAgentDataHints[]) => ReturnType<typeof asyncDetect>
    $detectOS?: () => ReturnType<typeof detectOS>
    $parseUserAgent?: () => ReturnType<typeof parseUserAgent>
    $httpClientHints?: DeepReadonly<UnwrapNestedRefs<HttpClientHintsState>>
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $httpClientHints?: DeepReadonly<UnwrapNestedRefs<HttpClientHintsState>>
  }
}

export {}
