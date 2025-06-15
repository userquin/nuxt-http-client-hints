import type {
  HttpClientHintsState,
  ResolvedHttpClientHintsOptions,
} from 'http-client-hints'
import type { ServerHttpClientHintsOptions } from 'http-client-hints/h3'
import { useAppConfig, useState } from '#imports'

export function useHttpClientHintsState() {
  return useState<HttpClientHintsState>('http-client-hints:state', () => ({}))
}

export function useHttpClientHintsOptions(): ResolvedHttpClientHintsOptions {
  const { serverImages, ...rest } = useAppConfig().httpClientHints as ServerHttpClientHintsOptions
  return {
    ...rest,
    serverImages: serverImages.map(r => new RegExp(r)),
  }
}
