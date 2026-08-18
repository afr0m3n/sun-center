import { useEffect, useState } from 'react'

export function chartViewWidth(viewportWidth: number) {
  return Math.max(400, Math.min(1000, viewportWidth - 60))
}

export function useChartViewWidth() {
  const [width, setWidth] = useState(() => chartViewWidth(typeof window === 'undefined' ? 1060 : window.innerWidth))

  useEffect(() => {
    const update = () => setWidth(chartViewWidth(window.innerWidth))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return width
}
