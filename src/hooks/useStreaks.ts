// src/hooks/useStreaks.ts
import { useState, useCallback } from 'react'

export type Stats = {
  lastPlayed: string
  currentStreak: number
  bestStreak: number
}

export function useStreaks() {
  const [stats, setStats] = useState<Stats>(() => {
    const s = localStorage.getItem('stats')
    return s
      ? JSON.parse(s)
      : { lastPlayed: '', currentStreak: 0, bestStreak: 0 }
  })

  const win = useCallback((today: string) => {
    if (stats.lastPlayed === today) return
    const cur = stats.currentStreak + 1
    const best = Math.max(stats.bestStreak, cur)
    const next = { lastPlayed: today, currentStreak: cur, bestStreak: best }
    localStorage.setItem('stats', JSON.stringify(next))
    setStats(next)
  }, [stats])

  const lose = useCallback(() => {
    const next = { ...stats, currentStreak: 0 }
    localStorage.setItem('stats', JSON.stringify(next))
    setStats(next)
  }, [stats])

  return { stats, win, lose }
}
