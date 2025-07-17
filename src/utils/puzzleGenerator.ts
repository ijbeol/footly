// src/utils/puzzleGenerator.ts
import seedrandom from 'seedrandom'
import { shuffle } from './shuffle'
import categories from '../data/categories.json'

export interface PuzzleGroup {
  category: string
  players: string[]
}

export function generatePuzzle(seed?: string): PuzzleGroup[] {
  const rng = seed ? seedrandom(seed) : Math.random
  while (true) {
    const picks = shuffle(
      categories as PuzzleGroup[],
      () => (typeof rng === 'function' ? rng() : rng())
    ).slice(0, 4)
    const groups = picks.map(g => ({
      category: g.category,
      players: shuffle(
        g.players,
        () => (typeof rng === 'function' ? rng() : rng())
      ).slice(0, 4),
    }))
    const all = groups.flatMap(g => g.players)
    if (new Set(all).size === 16) return groups
  }
}
