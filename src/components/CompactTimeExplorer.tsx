import type { CivilDayTimeline } from '../astronomy/civilTimeline'
import { civilTimelineInstant, formatCivilTimelineInstant, getCivilTimelineRangeState } from '../astronomy/civilTimeline'

interface CompactTimeExplorerProps {
  timeline: CivilDayTimeline
  instant: Date
  isLive: boolean
  onInspect: (instant: Date) => void
  onNow: () => void
}

export function CompactTimeExplorer({ timeline, instant, isLive, onInspect, onNow }: CompactTimeExplorerProps) {
  const range = getCivilTimelineRangeState(timeline, instant)
  const inspectElapsed = (seconds: number) => onInspect(civilTimelineInstant(timeline, seconds))
  const step = (seconds: number) => inspectElapsed(range.value + seconds)

  return <div className="compact-dock-row compact-time-explorer" aria-label="Compact Time Explorer">
    <div className="dock-readout">
      <span className={`dock-mode ${isLive ? 'live' : 'inspect'}`} role="status" aria-live="polite">{isLive ? 'LIVE' : 'INSPECT'}</span>
      <strong>{formatCivilTimelineInstant(timeline, instant, true)}</strong>
      <span>{timeline.date}</span>
    </div>
    <div className="dock-slider">
      <input
        aria-label="Compact inspection time within selected civil day"
        aria-valuetext={`${timeline.date} ${formatCivilTimelineInstant(timeline, instant, true)}`}
        type="range"
        min={range.min}
        max={range.max}
        step={60}
        value={range.value}
        onChange={(event) => inspectElapsed(Number(event.target.value))}
      />
      <span>{timeline.durationSeconds / 3600}h civil day</span>
    </div>
    <div className="dock-actions">
      <button onClick={() => step(-600)} aria-label="Inspect ten minutes earlier">−10m</button>
      <button className="dock-now" onClick={onNow}>NOW</button>
      <button onClick={() => step(600)} aria-label="Inspect ten minutes later">+10m</button>
    </div>
  </div>
}
