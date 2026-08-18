import { yearDateAtIndex, yearDateIndex } from '../astronomy/explorerState'

interface YearPositionRangeProps {
  dates: string[]
  selectedDate: string
  ariaLabel: string
  onDateChange: (date: string) => void
  onScrubStart: () => void
  onScrubEnd: () => void
}

const interactionKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])

export function YearPositionRange({ dates, selectedDate, ariaLabel, onDateChange, onScrubStart, onScrubEnd }: YearPositionRangeProps) {
  const selectedIndex = yearDateIndex(dates, selectedDate)

  return <input
    aria-label={ariaLabel}
    aria-valuetext={selectedDate}
    type="range"
    min="0"
    max={dates.length - 1}
    value={selectedIndex}
    onPointerDown={(event) => {
      onScrubStart()
      event.currentTarget.setPointerCapture(event.pointerId)
    }}
    onPointerUp={onScrubEnd}
    onPointerCancel={onScrubEnd}
    onLostPointerCapture={onScrubEnd}
    onKeyDown={(event) => { if (interactionKeys.has(event.key)) onScrubStart() }}
    onKeyUp={(event) => { if (interactionKeys.has(event.key)) onScrubEnd() }}
    onBlur={onScrubEnd}
    onChange={(event) => onDateChange(yearDateAtIndex(dates, Number(event.target.value)))}
  />
}
