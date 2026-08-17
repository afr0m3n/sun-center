import { getCivilDayBounds } from './civilTime'
import { getDayProfile } from './dayProfile'
import { getSolarMaximum } from './dayStatistics'
import { getSunEvents } from './sunEvents'
import type { CompareDayData, Location } from './types'

export function getCompareData(location: Location, dates: string[]): CompareDayData[] {
  if (dates.length < 2 || dates.length > 4) {
    throw new Error('Compare mode requires 2 to 4 dates')
  }

  return dates.map((date) => {
    const { start, end } = getCivilDayBounds(location, date)
    const events = getSunEvents(location, date)
    return {
      date,
      timezone: location.timezone,
      civilDayDurationSeconds: (end.toMillis() - start.toMillis()) / 1000,
      events,
      maximumSolarAltitudeDeg: getSolarMaximum(location, events.solarNoon)?.altitudeDeg ?? null,
      profile: getDayProfile(location, date),
    }
  })
}
