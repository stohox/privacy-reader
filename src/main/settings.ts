import fs from 'fs'
import path from 'path'
import { app, safeStorage } from 'electron'
import { AppSettings, DEFAULT_SETTINGS } from '../shared/types'

const settingsPath = (): string => path.join(app.getPath('userData'), 'settings.json')
const secretsPath = (): string => path.join(app.getPath('userData'), 'secrets.json')

let cache: AppSettings | null = null

export function loadSettings(): AppSettings {
  if (cache) return cache
  let data: AppSettings = { ...DEFAULT_SETTINGS }
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'))
    data = { ...data, ...raw }
  } catch {
    /* 首次运行 */
  }
  cache = data
  return cache
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const cur = loadSettings()
  cache = { ...cur, ...patch }
  fs.writeFileSync(settingsPath(), JSON.stringify(cache, null, 2))
  return cache
}

// API Key 单独存放，平台支持时静态加密（Windows DPAPI）
export function setApiKey(key: string): void {
  let store: Record<string, string> = {}
  try {
    store = JSON.parse(fs.readFileSync(secretsPath(), 'utf8'))
  } catch {
    /* ignore */
  }
  if (!key) {
    delete store.aiKey
  } else if (safeStorage.isEncryptionAvailable()) {
    store.aiKeyEnc = safeStorage.encryptString(key).toString('base64')
    delete store.aiKey
  } else {
    store.aiKey = key
  }
  fs.writeFileSync(secretsPath(), JSON.stringify(store), { mode: 0o600 })
}

export function getApiKey(): string {
  try {
    const store = JSON.parse(fs.readFileSync(secretsPath(), 'utf8')) as Record<string, string>
    if (store.aiKeyEnc && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(store.aiKeyEnc, 'base64'))
    }
    return store.aiKey ?? ''
  } catch {
    return ''
  }
}
