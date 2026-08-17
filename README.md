# Sun Center

Sun Center is a timezone-aware solar observatory for Ústí nad Labem. It presents apparent topocentric Sun position, daily solar events, seasonal movement, and year-scale patterns in a technical dashboard designed to keep the data visual and readable.

## Phase 1

The stable Phase 1 dashboard is the **Today** view. It includes:

- live apparent solar altitude and azimuth
- altitude and azimuth movement rates
- shadow length factor and bearing
- timezone-aware date selection and local clock
- sunrise, solar noon, sunset, and civil/nautical/astronomical twilight
- exact solar-maximum altitude at upper culmination
- a five-minute apparent-altitude profile and native SVG daily arc
- DST-aware hourly movement summaries (23, 24, or 25 real hourly samples)

## Phase 2A

### Year

- one computed record for every local civil date, including leap day
- yearly daylight, local-clock sunrise/sunset, maximum-altitude, and daylight-tempo SVG graphs
- interactive selected-date readouts and Astronomy Engine equinox/solstice markers
- longest and shortest day summaries
- seasonal tempo: daylight gained/lost, solar sunrise/sunset shift, and maximum-altitude change per day
- daylight comparisons with the calculated summer solstice, winter solstice, and previous equinox
- explicit DST steps on the sunrise/sunset chart rather than smoothed clock times

### Altitude milestones

The Today view finds rising and descending crossings for apparent solar altitudes 40°, 30°, 20°, 15°, 10°, 5°, and 0°. A ten-minute scan brackets candidate roots, the true daily apparent-altitude maximum is independently refined and inserted into the brackets, and bisection then refines each crossing to within 0.5 seconds. Unreachable thresholds remain unavailable. For the current civil date, the dashboard also identifies the next milestone and whether the Sun is rising or descending.

### Compare

Compare mode supports two to four arbitrary dates plus presets for today, one month ago, both solstices, and both equinoxes. It provides:

- a compact event/daylight/maximum-altitude table
- differences relative to the primary date
- distinct native SVG series for each selected date
- solar-altitude overlays normalized by each date's actual elapsed civil-day duration
- visible 23-hour, 24-hour, and 25-hour day durations

## Phase 2B

### Time Explorer

The Today view has one observation-time source of truth: a selected civil date, a `LIVE`/`INSPECT` mode, and an effective instant. Today opens in live mode and updates from the real clock. Dragging the time scrubber, stepping time, or selecting either visualization enters inspect mode; **NOW** returns to today's local date and resumes live updates. A newly selected non-today date opens at its calculated solar noon when available. Altitude, azimuth, movement rates, direction, shadows, altitude milestones, and both visualization markers all derive from the same effective instant.

The scrubber is an elapsed-instant timeline from local midnight to the next local midnight. It is not an `HH:mm` value and does not assume 86,400 seconds. Europe/Prague spring and autumn transition dates therefore have 23-hour and 25-hour tracks. The repeated autumn hour occupies two separate positions and displays its UTC offset when needed. Dawn, sunrise, solar noon, sunset, and dusk markers are positioned by their absolute instants.

### Sun Path

The interactive native-SVG Sun Path uses a conventional polar sky-dome projection: horizon at the outer circle, zenith at the center, north at top, and east at right. Radial distance is linear in zenith angle (`90° − altitude`) and angular position follows Astronomy Engine's compass azimuth. The selected date path can be clicked or keyboard-stepped to inspect its exact sampled instant; hover reports local time, altitude, and azimuth. Calculated sunrise, solar noon, and sunset are marked.

Selected, summer-solstice, and winter-solstice paths can be toggled independently. Solstice dates come from Astronomy Engine `Seasons()`, not fixed calendar dates, and reference paths are visually subordinate. The path geometry is memoized by date/year, so live clock ticks move only the current marker.

The dome represents only the visible hemisphere. When the selected Sun is below the horizon, Sun Center does not place it falsely inside the dome: a dashed horizon-edge indicator preserves its azimuth while the telemetry and path status report its exact negative altitude.

## Astronomy and time handling

Astronomical calculations use [Astronomy Engine](https://github.com/cosinekitty/astronomy) 2.1.x. Apparent Sun position is calculated from topocentric equatorial coordinates and transformed to horizontal coordinates with Astronomy Engine's normal atmospheric-refraction model. Sunrise and sunset use its dedicated limb/refraction-aware rise/set search. Twilight uses conventional solar-center altitudes, solar noon uses upper meridian transit, and seasonal events use `Seasons(year)`; calendar dates are not hardcoded.

Civil dates and IANA timezone conversion use Luxon with `Europe/Prague`. A civil day is constructed from local midnight to the next local midnight and can therefore contain 23, 24, or 25 elapsed hours.

Yearly sunrise and sunset changes intentionally expose two semantics:

- **local-clock change** — the difference between displayed wall-clock times, including a DST offset jump
- **absolute solar change** — the UTC interval between consecutive events minus 24 hours, which describes the day-to-day astronomical shift without mislabeling DST as a one-hour solar movement

Daylight-duration and maximum-altitude changes are direct physical differences and do not need a DST correction.

The existing numerical regression fixtures are generated from the installed Astronomy Engine version. Sun Center does not claim independent astronomical validation.

## Technology

- React 19 and TypeScript
- Vite 8
- Astronomy Engine
- Luxon
- native responsive SVG (no charting framework)
- Vitest and Oxlint

## Development

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Run validation:

```sh
npm test -- --run
npm run lint
npm run build
```

Preview the production build:

```sh
npm run preview
```
