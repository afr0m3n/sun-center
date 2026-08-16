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
