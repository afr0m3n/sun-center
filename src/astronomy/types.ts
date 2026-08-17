export interface Location {
  name: string
  latitude: number
  longitude: number
  elevationMeters: number
  timezone: string
}

export interface SunPosition {
  timestamp: Date
  altitudeDeg: number
  azimuthDeg: number
  shadowLengthFactor: number | null
  shadowAzimuthDeg: number | null
}

export interface SunRate {
  altitudeDegPerMinute: number
  azimuthDegPerMinute: number
}

export interface SunEvents {
  astronomicalDawn: Date | null
  nauticalDawn: Date | null
  civilDawn: Date | null
  sunrise: Date | null
  solarNoon: Date | null
  sunset: Date | null
  civilDusk: Date | null
  nauticalDusk: Date | null
  astronomicalDusk: Date | null
  dayLengthSeconds: number | null
}

export interface DaySample {
  timestamp: Date
  altitudeDeg: number
  azimuthDeg: number
  altitudeRateDegPerMinute: number
}

export interface HourlySummary {
  timestamp: Date
  hour: string
  utcOffset: string
  altitudeDeg: number
  deltaFromPreviousHour: number | null
  averageRateDegPerHour: number | null
}

export interface EventTimeChange {
  /** Difference between displayed wall-clock times; includes a DST offset jump. */
  localClock: number
  /** UTC event-to-event interval minus 24 hours; isolates the daily solar shift. */
  absoluteSolar: number
}

export interface SeasonEvents {
  springEquinox: Date
  summerSolstice: Date
  autumnEquinox: Date
  winterSolstice: Date
}

export interface SeasonalContext {
  daylightFromSummerSolsticeSeconds: number | null
  daylightFromWinterSolsticeSeconds: number | null
  daylightFromPreviousEquinoxSeconds: number | null
  previousEquinox: 'spring' | 'autumn'
}

export interface YearSolarDay {
  date: string
  sunrise: Date | null
  solarNoon: Date | null
  sunset: Date | null
  dayLengthSeconds: number | null
  maximumSolarAltitudeDeg: number | null
  astronomicalDawn: Date | null
  astronomicalDusk: Date | null
  dayLengthChangeSeconds: number | null
  sunriseChangeSeconds: EventTimeChange | null
  sunsetChangeSeconds: EventTimeChange | null
  maximumAltitudeChangeDeg: number | null
  seasonalContext: SeasonalContext
}

export interface YearSolarStatistics {
  year: number
  timezone: string
  days: YearSolarDay[]
  seasons: SeasonEvents
  longestDay: YearSolarDay | null
  shortestDay: YearSolarDay | null
}

export interface AltitudeCrossings {
  altitudeDeg: number
  rising: Date | null
  descending: Date | null
}

export interface CompareDayData {
  date: string
  timezone: string
  civilDayDurationSeconds: number
  events: SunEvents
  maximumSolarAltitudeDeg: number | null
  profile: DaySample[]
}
