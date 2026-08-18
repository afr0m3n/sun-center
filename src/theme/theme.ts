export const THEME_STORAGE_KEY = 'sun-center.theme-preference'
export const THEME_STORAGE_VERSION = 1

export type ThemePreference = 'system' | 'dark' | 'light'
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

interface ThemeStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export function parseThemePreference(stored: string | null): ThemePreference {
  if (!stored) return 'system'
  try {
    const value: unknown = JSON.parse(stored)
    if (
      typeof value === 'object'
      && value !== null
      && 'version' in value
      && value.version === THEME_STORAGE_VERSION
      && 'preference' in value
      && (value.preference === 'system' || value.preference === 'dark' || value.preference === 'light')
    ) return value.preference
  } catch {
    // Invalid persisted values intentionally fall through to System.
  }
  return 'system'
}

export function loadThemePreference(storage: Pick<ThemeStorage, 'getItem'> | null | undefined): ThemePreference {
  try {
    return parseThemePreference(storage?.getItem(THEME_STORAGE_KEY) ?? null)
  } catch {
    return 'system'
  }
}

export function saveThemePreference(storage: Pick<ThemeStorage, 'setItem'> | null | undefined, preference: ThemePreference): boolean {
  try {
    storage?.setItem(THEME_STORAGE_KEY, JSON.stringify({ version: THEME_STORAGE_VERSION, preference }))
    return Boolean(storage)
  } catch {
    return false
  }
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  return preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference
}

export function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}
