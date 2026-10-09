import type { ReaderApi } from '../../preload/index'

declare global {
  interface Window {
    reader: ReaderApi
  }
}

export {}
