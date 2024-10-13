import type {
  HttpClientHintsState,
  ResolvedHttpClientHintsOptions,
  ServerHttpClientHintsOptions,
} from '../shared-types/types'
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
