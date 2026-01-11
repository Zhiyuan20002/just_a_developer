import { getDatabase } from '../index'

export function getSetting(key: string): string | null {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value || null
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `).run(key, value, new Date().toISOString())
}

export function getSettingAsJson<T>(key: string): T | null {
  const value = getSetting(key)
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function setSettingAsJson(key: string, value: unknown): void {
  setSetting(key, JSON.stringify(value))
}
