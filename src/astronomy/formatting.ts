import { DateTime } from 'luxon'

export function formatClock(event: Date | null, timezone: string): string {
  if (!event) return '—'
  const local = DateTime.fromJSDate(event, { zone: timezone })
  const clock = local.toFormat('HH:mm:ss')
  return local.getPossibleOffsets().length > 1 ? `${clock} UTC${local.toFormat('ZZ')}` : clock
}

export function formatDuration(seconds: number | null, includeSeconds = false): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  const rounded = Math.round(Math.abs(seconds))
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const remainder = rounded % 60
  const parts = []
  if (hours) parts.push(`${hours}h`)
  if (minutes || hours) parts.push(`${minutes}m`)
  if (includeSeconds || (!hours && !minutes)) parts.push(`${remainder}s`)
  return parts.join(' ')
}

export function formatSignedDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  const sign = seconds < 0 ? '−' : '+'
  return `${sign}${formatDuration(Math.abs(seconds), Math.abs(seconds) < 3600)}`
}

export function formatSignedRate(secondsPerDay: number | null): string {
  const value = formatSignedDuration(secondsPerDay)
  return value === '—' ? value : `${value}/day`
}

export function formatDegrees(value: number | null, digits = 2): string {
  return value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)}°`
}

export function formatSignedDegrees(value: number | null, digits = 2, unit = '°'): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(digits)}${unit}`
}
