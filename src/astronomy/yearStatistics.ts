import { Seasons } from 'astronomy-engine'
import { DateTime } from 'luxon'
import { localClockSeconds } from './civilTime'
import { getSolarMaximum } from './dayStatistics'
import { getSunEvents } from './sunEvents'
import type {
  EventTimeChange,
  Location,
  SeasonEvents,
  SeasonalContext,
  YearSolarDay,
  YearSolarStatistics,
} from './types'

interface BasicDay {
  date: string
  sunrise: Date | null
  solarNoon: Date | null
  sunset: Date | null
  dayLengthSeconds: number | null
  maximumSolarAltitudeDeg: number | null
  astronomicalDawn: Date | null
  astronomicalDusk: Date | null
}

function basicDay(location: Location, date: string): BasicDay {
  const events = getSunEvents(location, date)
  return {
    date,
    sunrise: events.sunrise,
    solarNoon: events.solarNoon,
    sunset: events.sunset,
    dayLengthSeconds: events.dayLengthSeconds,
    maximumSolarAltitudeDeg: getSolarMaximum(location, events.solarNoon)?.altitudeDeg ?? null,
    astronomicalDawn: events.astronomicalDawn,
    astronomicalDusk: events.astronomicalDusk,
  }
}

function difference(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : current - previous
}

function eventChange(
  current: Date | null,
  previous: Date | null,
  timezone: string,
): EventTimeChange | null {
  if (!current || !previous) return null
  const rawClockDifference = localClockSeconds(current, timezone) - localClockSeconds(previous, timezone)
  return {
    localClock: ((rawClockDifference + 129_600) % 86_400) - 43_200,
    absoluteSolar: (current.getTime() - previous.getTime()) / 1000 - 86_400,
  }
}

function dateForEvent(event: Date, timezone: string) {
  return DateTime.fromJSDate(event, { zone: timezone }).toISODate()!
}

export function getSeasonEvents(location: Location, year: number): SeasonEvents {
  const seasons = Seasons(year)
  if (location.latitude >= 0) {
    return {
      springEquinox: seasons.mar_equinox.date,
      summerSolstice: seasons.jun_solstice.date,
      autumnEquinox: seasons.sep_equinox.date,
      winterSolstice: seasons.dec_solstice.date,
    }
  }
  return {
    springEquinox: seasons.sep_equinox.date,
    summerSolstice: seasons.dec_solstice.date,
    autumnEquinox: seasons.mar_equinox.date,
    winterSolstice: seasons.jun_solstice.date,
  }
}

function requireDay(days: Map<string, BasicDay>, date: string): BasicDay {
  const day = days.get(date)
  if (!day) throw new Error(`Missing season reference day ${date}`)
  return day
}

interface EquinoxReference {
  name: 'spring' | 'autumn'
  instant: Date
  day: BasicDay
}

function contextFor(
  day: BasicDay,
  summer: BasicDay,
  winter: BasicDay,
  equinoxes: EquinoxReference[],
): SeasonalContext {
  const dayTime = day.solarNoon?.getTime() ?? Date.parse(`${day.date}T12:00:00Z`)
  const previousEquinox = equinoxes
    .filter((equinox) => equinox.instant.getTime() <= dayTime)
    .reduce((latest, equinox) => equinox.instant > latest.instant ? equinox : latest)

  return {
    daylightFromSummerSolsticeSeconds: difference(day.dayLengthSeconds, summer.dayLengthSeconds),
    daylightFromWinterSolsticeSeconds: difference(day.dayLengthSeconds, winter.dayLengthSeconds),
    daylightFromPreviousEquinoxSeconds: difference(day.dayLengthSeconds, previousEquinox.day.dayLengthSeconds),
    previousEquinox: previousEquinox.name,
  }
}

/**
 * Builds one record per local civil date. Day length and altitude changes are physical
 * differences. Sunrise/sunset expose both wall-clock changes (including DST) and UTC
 * event-to-event shifts relative to 24 hours (the astronomical daily shift).
 */
export function getYearSolarStatistics(location: Location, year: number): YearSolarStatistics {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new Error('year must be an integer from 1 to 9999')

  const seasons = getSeasonEvents(location, year)
  const previousSeasons = getSeasonEvents(location, year - 1)
  const first = DateTime.fromObject({ year, month: 1, day: 1 }, { zone: location.timezone })
  const nextYear = first.plus({ years: 1 })
  const basics = new Map<string, BasicDay>()
  const previousDate = first.minus({ days: 1 }).toISODate()!
  basics.set(previousDate, basicDay(location, previousDate))

  for (let date = first; date < nextYear; date = date.plus({ days: 1 })) {
    const isoDate = date.toISODate()!
    basics.set(isoDate, basicDay(location, isoDate))
  }

  const seasonDates = {
    summer: dateForEvent(seasons.summerSolstice, location.timezone),
    winter: dateForEvent(seasons.winterSolstice, location.timezone),
    spring: dateForEvent(seasons.springEquinox, location.timezone),
    autumn: dateForEvent(seasons.autumnEquinox, location.timezone),
  }
  const summer = requireDay(basics, seasonDates.summer)
  const winter = requireDay(basics, seasonDates.winter)
  const spring = requireDay(basics, seasonDates.spring)
  const autumn = requireDay(basics, seasonDates.autumn)
  const previousSpringDate = dateForEvent(previousSeasons.springEquinox, location.timezone)
  const previousAutumnDate = dateForEvent(previousSeasons.autumnEquinox, location.timezone)
  const equinoxes: EquinoxReference[] = [
    { name: 'spring', instant: previousSeasons.springEquinox, day: basicDay(location, previousSpringDate) },
    { name: 'autumn', instant: previousSeasons.autumnEquinox, day: basicDay(location, previousAutumnDate) },
    { name: 'spring', instant: seasons.springEquinox, day: spring },
    { name: 'autumn', instant: seasons.autumnEquinox, day: autumn },
  ]

  const days: YearSolarDay[] = []
  let previous = requireDay(basics, previousDate)
  for (let date = first; date < nextYear; date = date.plus({ days: 1 })) {
    const current = requireDay(basics, date.toISODate()!)
    days.push({
      ...current,
      dayLengthChangeSeconds: difference(current.dayLengthSeconds, previous.dayLengthSeconds),
      sunriseChangeSeconds: eventChange(current.sunrise, previous.sunrise, location.timezone),
      sunsetChangeSeconds: eventChange(current.sunset, previous.sunset, location.timezone),
      maximumAltitudeChangeDeg: difference(current.maximumSolarAltitudeDeg, previous.maximumSolarAltitudeDeg),
      seasonalContext: contextFor(current, summer, winter, equinoxes),
    })
    previous = current
  }

  const available = days.filter((day) => day.dayLengthSeconds !== null)
  const longestDay = available.length > 0
    ? available.reduce((best, day) => day.dayLengthSeconds! > best.dayLengthSeconds! ? day : best)
    : null
  const shortestDay = available.length > 0
    ? available.reduce((best, day) => day.dayLengthSeconds! < best.dayLengthSeconds! ? day : best)
    : null

  return { year, timezone: location.timezone, days, seasons, longestDay, shortestDay }
}
