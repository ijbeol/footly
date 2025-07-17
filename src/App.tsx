// src/App.tsx
import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { generatePuzzle } from './utils/puzzleGenerator'
import type { PuzzleGroup } from './utils/puzzleGenerator'
import { shuffle } from './utils/shuffle'
import { PlayerGrid } from './components/PlayerGrid'
import funFacts from './data/funFacts.json'
import { Analytics } from '@vercel/analytics/react'

type Stats = { lastPlayed: string; currentStreak: number; bestStreak: number }

export default function App() {
  const [mode, setMode] = useState<'daily' | 'random'>('daily')
  const [puzzle, setPuzzle] = useState<PuzzleGroup[]>([])
  const [deck, setDeck] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [found, setFound] = useState<PuzzleGroup[]>([])
  const [stats, setStats] = useState<Stats>({ lastPlayed: '', currentStreak: 0, bestStreak: 0 })
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintRevealed, setHintRevealed] = useState<Set<string>>(new Set())
  const [lastHintCategory, setLastHintCategory] = useState<string | null>(null)
  const [guesses, setGuesses] = useState<string[][]>([])
  const [incorrectCount, setIncorrectCount] = useState(0)
  const maxIncorrect = 4
  const [puzzleId, setPuzzleId] = useState<string>('')

  useEffect(() => {
    const s = localStorage.getItem('stats')
    if (s) setStats(JSON.parse(s))
    startDaily()
  }, [])

  useEffect(() => {
    if (found.length === 4 && incorrectCount < maxIncorrect) {
      confetti()
      const today = new Date().toISOString().slice(0, 10)
      if (stats.lastPlayed !== today) {
        const s = { ...stats, lastPlayed: today, currentStreak: stats.currentStreak + 1 }
        if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak
        localStorage.setItem('stats', JSON.stringify(s))
        setStats(s)
      }
    }
  }, [found])

  function runGame(seed?: string) {
    const p = generatePuzzle(seed)
    setPuzzle(p)
    setDeck(shuffle(p.flatMap(g => g.players)))
    setSelected(new Set())
    setRevealed(new Set())
    setFound([])
    setHintsUsed(0)
    setHintRevealed(new Set())
    setLastHintCategory(null)
    setGuesses([])
    setIncorrectCount(0)
    setPuzzleId(seed ?? Date.now().toString())
  }

  function startDaily() {
    setMode('daily')
    runGame(new Date().toISOString().slice(0, 10))
  }

  function startRandom() {
    setMode('random')
    runGame()
  }

  function toggle(name: string) {
    if (revealed.has(name)) return
    const s = new Set(selected)
    s.has(name) ? s.delete(name) : s.size < 4 && s.add(name)
    setSelected(s)
  }

  function submit() {
    if (selected.size !== 4) return
    const sel = Array.from(selected)
    setGuesses([...guesses, sel])

    const match = puzzle.find(g => sel.every(p => g.players.includes(p)))
    if (match) {
      const newRevealed = new Set(revealed)
      match.players.forEach(p => newRevealed.add(p))
      setRevealed(newRevealed)
      setFound([...found, match])
    } else {
      const newCount = incorrectCount + 1
      setIncorrectCount(newCount)
      if (newCount >= maxIncorrect) giveUp()
    }

    setSelected(new Set())
    setHintRevealed(new Set())
  }

  function giveUp() {
    setRevealed(new Set(puzzle.flatMap(g => g.players)))
    setFound(puzzle)
  }

  function useHint() {
    if (hintsUsed >= 2) return
    const pending = puzzle.filter(g => !found.includes(g))
    if (!pending.length) return
    const grp = pending[0]
    const same = lastHintCategory === grp.category
    const revealCount = same ? 3 : 2
    const options = grp.players.filter(p => !revealed.has(p))
    const picks = shuffle(options).slice(0, revealCount)
    setHintRevealed(new Set(picks))
    setHintsUsed(hintsUsed + 1)
    setLastHintCategory(grp.category)
  }

  function shareResults() {
    const colorMap = ['🟪','🟩','🟦','🟨','⬛']
    const rows = guesses.map(guess =>
      guess.map(name => {
        const idx = puzzle.findIndex(g => g.players.includes(name))
        return colorMap[idx >= 0 ? idx : 4]
      }).join('')
    )
    const header = `Footly Puzzle #${puzzleId}`
    const link = 'https://footly-ten.vercel.app/'
    navigator.clipboard.writeText([header, ...rows, link].join('\n'))
      .then(() => alert('Results copied!'))
  }

  const remaining = deck.filter(name => !revealed.has(name))

  return (
    <>
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <div className="w-full max-w-xl mx-auto p-4 sm:p-6 text-gray-900">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center">
            Football Connections
          </h1>

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <button
              onClick={startDaily}
              className={`px-3 py-1 rounded text-xs sm:text-base ${
                mode === 'daily' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
              }`}
            >Daily Game</button>
            <button
              onClick={startRandom}
              className={`px-3 py-1 rounded text-xs sm:text-base ${
                mode === 'random' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
              }`}
            >Random Game</button>
          </div>

          <div className="text-center text-xs sm:text-sm mb-2">
            Mode: {mode === 'daily' ? 'Daily Puzzle' : 'Random Puzzle'}
          </div>
          <div className="text-center mb-4 text-xs sm:text-base">
            Streak: {stats.currentStreak} | Best: {stats.bestStreak}
          </div>
          <div className="text-center mb-2 text-xs sm:text-base">
            Guesses left: {maxIncorrect - incorrectCount}
          </div>

          <div className="space-y-4">
            {found.map((g, i) => {
              const facts = (funFacts as Record<string,string[]>)[g.category] || []
              const fact = facts[Math.floor(Math.random() * facts.length)]
              return (
                <div key={i} className="p-2 bg-green-100 rounded text-xs sm:text-base">
                  <strong>{g.category}</strong>: {g.players.join(', ')}
                  <div className="italic text-xs sm:text-sm mt-1">"{fact}"</div>
                </div>
              )
            })}

            <PlayerGrid
              players={remaining}
              active={selected}
              hintRevealed={hintRevealed}
              onToggle={toggle}
            />

            <div className="flex flex-wrap justify-center gap-2 sm:space-x-3 mt-4">
              <button
                onClick={submit}
                disabled={selected.size !== 4}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded disabled:opacity-50 text-xs sm:text-base"
              >Submit</button>
              <button
                onClick={useHint}
                disabled={hintsUsed >= 2}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-yellow-400 text-white rounded disabled:opacity-50 text-xs sm:text-base"
              >Hint ({hintsUsed}/2)</button>
              <button
                onClick={giveUp}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-300 rounded text-xs sm:text-base"
              >Give Up</button>
              <button
                onClick={mode === 'daily' ? startRandom : startDaily}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-indigo-500 text-white rounded text-xs sm:text-base"
              >New Game</button>
            </div>

            {(found.length === 4 || incorrectCount >= maxIncorrect) && (
              <div className="text-center mt-4">
                <button
                  onClick={shareResults}
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded text-xs sm:text-base"
                >Share Results</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vercel Analytics */}
      <Analytics />
    </>
  )
}
