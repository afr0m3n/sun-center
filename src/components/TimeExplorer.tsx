import type { CivilDayTimeline } from '../astronomy/civilTimeline'
import { civilTimelineElapsedSeconds, civilTimelineInstant, formatCivilTimelineInstant, timelineFraction } from '../astronomy/civilTimeline'
import type { SunEvents } from '../astronomy/types'

interface TimeExplorerProps {
  timeline: CivilDayTimeline
  events: SunEvents
  instant: Date
  isLive: boolean
  onInspect: (instant: Date) => void
  onNow: () => void
}

const markerEvents = (events: SunEvents): Array<[string, Date | null]> => [
  ['Astronomical dawn', events.astronomicalDawn],
  ['Sunrise', events.sunrise],
  ['Solar noon', events.solarNoon],
  ['Sunset', events.sunset],
  ['Astronomical dusk', events.astronomicalDusk],
]

export function TimeExplorer({ timeline, events, instant, isLive, onInspect, onNow }: TimeExplorerProps) {
  const elapsed = civilTimelineElapsedSeconds(timeline, instant)
  const inspectElapsed = (seconds: number) => onInspect(civilTimelineInstant(timeline, seconds))
  const step = (seconds: number) => inspectElapsed(elapsed + seconds)
  return <section className="panel time-explorer" aria-labelledby="time-explorer-title">
    <div className="panel-heading">
      <div><span className="section-kicker">Real elapsed civil-day timeline</span><h2 id="time-explorer-title">Time Explorer</h2></div>
      <div className={`mode-badge ${isLive ? 'live' : 'inspect'}`}><span />{isLive ? 'LIVE' : 'INSPECT'}</div>
    </div>
    <div className="explorer-time"><strong>{formatCivilTimelineInstant(timeline, instant, true)}</strong><span>{timeline.date} · {timeline.durationSeconds / 3600} elapsed hours</span></div>
    <div className="timeline-shell">
      <div className="timeline-markers" aria-hidden="true">{markerEvents(events).map(([label, event]) => event && <span key={label} className="timeline-event" style={{ left: `${timelineFraction(timeline, event) * 100}%` }}><i /><em>{label}</em></span>)}</div>
      <input aria-label="Inspect time within selected civil day" aria-valuetext={`${timeline.date} ${formatCivilTimelineInstant(timeline, instant, true)}`} type="range" min={0} max={Math.max(0, timeline.durationSeconds - 1)} step={60} value={Math.min(Math.round(elapsed), timeline.durationSeconds - 1)} onChange={(event) => inspectElapsed(Number(event.target.value))} />
      <div className="timeline-endpoints"><span>00:00</span><span>next midnight · {timeline.durationSeconds / 3600}h elapsed</span></div>
    </div>
    <div className="time-step-controls" aria-label="Time step controls">
      <button onClick={() => step(-3600)} aria-label="Inspect one hour earlier">−1 hour</button>
      <button onClick={() => step(-600)} aria-label="Inspect ten minutes earlier">−10 min</button>
      <button className="now-control" onClick={onNow}>NOW</button>
      <button onClick={() => step(600)} aria-label="Inspect ten minutes later">+10 min</button>
      <button onClick={() => step(3600)} aria-label="Inspect one hour later">+1 hour</button>
    </div>
  </section>
}
