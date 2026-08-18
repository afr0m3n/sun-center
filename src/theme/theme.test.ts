import { describe, expect, it } from 'vitest'
import {
  loadThemePreference,
  parseThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_STORAGE_KEY,
} from './theme'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

class UnavailableStorage {
  getItem(_key: string): never { throw new Error('storage unavailable') }
  setItem(_key: string, _value: string): never { throw new Error('storage unavailable') }
}

describe('theme preference persistence', () => {
  it.each(['system', 'dark', 'light'] as const)('loads a valid %s preference', (preference) => {
    const storage = new MemoryStorage()
    storage.setItem(THEME_STORAGE_KEY, JSON.stringify({ version: 1, preference }))
    expect(loadThemePreference(storage)).toBe(preference)
  })

  it.each([
    null,
    '',
    'not json',
    JSON.stringify({ version: 1, preference: 'sepia' }),
    JSON.stringify({ version: 2, preference: 'dark' }),
    JSON.stringify('dark'),
  ])('falls back to system for malformed or unknown persisted data', (stored) => {
    expect(parseThemePreference(stored)).toBe('system')
  })

  it('falls back to system when storage is unavailable', () => {
    expect(loadThemePreference(new UnavailableStorage())).toBe('system')
  })

  it('persists a versioned preference and ignores write failures', () => {
    const storage = new MemoryStorage()
    expect(saveThemePreference(storage, 'light')).toBe(true)
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe(JSON.stringify({ version: 1, preference: 'light' }))
    expect(saveThemePreference(new UnavailableStorage(), 'dark')).toBe(false)
  })
})

describe('theme resolution', () => {
  it('resolves system from the current operating-system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('keeps explicit dark and light choices regardless of the system', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })
})
