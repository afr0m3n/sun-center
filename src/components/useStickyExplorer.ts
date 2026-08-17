import { useCallback, useEffect, useState } from 'react'

export function useStickyExplorer() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)
  const anchorRef = useCallback((node: HTMLElement | null) => {
    setAnchor(node)
    if (!node) setVisible(false)
  }, [])

  useEffect(() => {
    if (!anchor || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom <= 8)
    }, { rootMargin: '-8px 0px 0px' })
    observer.observe(anchor)
    return () => observer.disconnect()
  }, [anchor])

  return { anchorRef, visible }
}
