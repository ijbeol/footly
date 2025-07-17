// src/hooks/useDailyPuzzle.ts
import { useState, useEffect, useCallback } from 'react'
import { generatePuzzle } from '../utils/puzzleGenerator'
import type { PuzzleGroup } from '../utils/puzzleGenerator'
import { shuffle } from '../utils/shuffle'

type Progress = {
  status: 'won' | 'lost' | 'gaveUp'
  found: PuzzleGroup[]
  guesses: string[][]
}

const KEY = (day: string) => `dailyProgress:${day}`

export function useDailyPuzzle() {
  const today = new Date().toISOString().slice(0, 10)
  const [puzzle, setPuzzle]     = useState<PuzzleGroup[]>([])
  const [deck, setDeck]         = useState<string[]>([])
  const [found, setFound]       = useState<PuzzleGroup[]>([])
  const [guesses, setGuesses]   = useState<string[][]>([])
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [finished, setFinished] = useState(false)

  const persist = useCallback((status: Progress['status']) => {
    localStorage.setItem(
      KEY(today),
      JSON.stringify({ status, found, guesses })
    )
    setFinished(true)
  }, [today, found, guesses])

  const load = useCallback((prog: Progress) => {
    const p = generatePuzzle(today)
    setPuzzle(p)
    setDeck(shuffle(p.flatMap(g => g.players)))
    setFound(prog.found)
    setGuesses(prog.guesses)
    setRevealed(new Set(prog.found.flatMap(g => g.players)))
    setFinished(true)
  }, [today])

  const start = useCallback((seed?: string) => {
    const raw = seed === today ? localStorage.getItem(KEY(today)) : null
    if (raw) {
      load(JSON.parse(raw))
    } else {
      const p = generatePuzzle(seed)
      setPuzzle(p)
      setDeck(shuffle(p.flatMap(g => g.players)))
      setFound([])
      setGuesses([])
      setRevealed(new Set())
      setFinished(false)
    }
  }, [today, load])

  useEffect(() => {
    start(today)
  }, [start, today])

  return {
    puzzle,
    deck,
    found,
    setFound,
    guesses,
    setGuesses,
    revealed,
    setRevealed,
    finished,
    persist,
    start,
  }
}
