// src/utils/puzzleGenerator.ts
import seedrandom from 'seedrandom'
import { shuffle } from './shuffle'
import raw from '../data/categories.json'

export interface PuzzleGroup {
  category: string
  players: string[]
}

export function generatePuzzle(seed?: string): PuzzleGroup[] {
  // deterministic RNG if seed provided, else use Math.random
  const rng = seed ? seedrandom(seed) : Math.random
  // JSON has shape { categories: PuzzleGroup[] }
  const allCategories = (raw as { categories: PuzzleGroup[] }).categories

  while (true) {
    // shuffle categories with RNG
    const cats = shuffle(allCategories, () => rng())
    const picks: PuzzleGroup[] = []
    const used = new Set<string>()

    for (const c of cats) {
      // skip if any player in this category already used
      if (c.players.some(p => used.has(p))) continue
      picks.push(c)
      c.players.forEach(p => used.add(p))
      if (picks.length === 4) break
    }

    if (picks.length < 4) {
      // couldn't find 4 fully disjoint categories—retry
      continue
    }

    // sample exactly 4 players per picked category, using same RNG
    return picks.map(c => ({
      category: c.category,
      players: shuffle(c.players, () => rng()).slice(0, 4),
    }))
  }
}
