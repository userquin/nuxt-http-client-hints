import type { HttpClientHintsState } from '../shared-types/types'
import { useState } from '#imports'

export function useHttpClientHintsState() {
  return useState<HttpClientHintsState>('http-client-hints:state', () => ({}))
}
