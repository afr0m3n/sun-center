import { useEffect, useState } from 'react'
import {
  getBrowserStorage,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  type ThemePreference,
} from './theme'

const systemThemeQuery = '(prefers-color-scheme: dark)'

function applyResolvedTheme(preference: ThemePreference, media: MediaQueryList) {
  const resolved = resolveTheme(preference, media.matches)
  document.documentElement.dataset.theme = resolved
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#080b0f' : '#f4f2ed')
}

export function ThemeControl() {
  const [preference, setPreference] = useState<ThemePreference>(() => loadThemePreference(getBrowserStorage()))

  useEffect(() => {
    const media = window.matchMedia(systemThemeQuery)
    const apply = () => applyResolvedTheme(preference, media)
    apply()
    saveThemePreference(getBrowserStorage(), preference)
    if (preference !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [preference])

  return <label className="theme-control">
    <span>Theme</span>
    <select aria-label="Color theme" value={preference} onChange={(event) => setPreference(event.target.value as ThemePreference)}>
      <option value="system">System</option>
      <option value="dark">Dark</option>
      <option value="light">Light</option>
    </select>
  </label>
}
