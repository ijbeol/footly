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
type DailyProgress = {
  status: 'won' | 'lost' | 'gaveUp'
  found: PuzzleGroup[]
  guesses: string[][]
}

const MAX_INCORRECT = 4

export default function App() {
  const [mode, setMode] = useState<'daily' | 'random'>('daily')
  const [dailyFinished, setDailyFinished] = useState(false)
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
  const [showHelp, setShowHelp] = useState(false)
  const [puzzleId, setPuzzleId] = useState<string>('')
  const today = new Date().toISOString().slice(0, 10)
  const todayKey = `dailyProgress:${today}`

  useEffect(() => {
    const s = localStorage.getItem('stats')
    if (s) setStats(JSON.parse(s))
    const dpStr = localStorage.getItem(todayKey)
    if (dpStr) {
      const prog: DailyProgress = JSON.parse(dpStr)
      loadDaily(prog)
      setDailyFinished(true)
    } else {
      startDaily()
    }
  }, [])

  useEffect(() => {
    if (
      mode === 'daily' &&
      found.length === 4 &&
      incorrectCount < MAX_INCORRECT &&
      !dailyFinished
    ) {
      confetti()
      const newCurrent = stats.currentStreak + 1
      const newBest = Math.max(stats.bestStreak, newCurrent)
      const s = { lastPlayed: today, currentStreak: newCurrent, bestStreak: newBest }
      localStorage.setItem('stats', JSON.stringify(s))
      setStats(s)
      persistDaily('won', found, guesses)
      setDailyFinished(true)
    }
  }, [found])

  function persistDaily(status: DailyProgress['status'], f: PuzzleGroup[], g: string[][]) {
    const prog: DailyProgress = { status, found: f, guesses: g }
    localStorage.setItem(todayKey, JSON.stringify(prog))
  }

  function loadDaily(prog: DailyProgress) {
    const p = generatePuzzle(today)
    setPuzzle(p)
    setDeck(shuffle(p.flatMap(g => g.players)))
    setFound(prog.found)
    setGuesses(prog.guesses)
    const rev = new Set<string>()
    prog.found.forEach(g => g.players.forEach(n => rev.add(n)))
    setRevealed(rev)
    setIncorrectCount(prog.status === 'won' ? 0 : MAX_INCORRECT)
    setPuzzleId(today)
  }

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
    setDailyFinished(false)
  }

  function startDaily() {
    setMode('daily')
    const dp = localStorage.getItem(todayKey)
    if (dp) {
      loadDaily(JSON.parse(dp))
      setDailyFinished(true)
    } else {
      runGame(today)
    }
  }

  function startRandom() {
    setMode('random')
    runGame()
  }

  function toggle(name: string) {
    if (mode === 'daily' && dailyFinished) return
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
      const newRev = new Set(revealed)
      match.players.forEach(p => newRev.add(p))
      setRevealed(newRev)
      setFound([...found, match])
    } else {
      const newCount = incorrectCount + 1
      setIncorrectCount(newCount)
      if (
        mode === 'daily' &&
        newCount >= MAX_INCORRECT &&
        !dailyFinished
      ) {
        const s = { ...stats, currentStreak: 0, bestStreak: stats.bestStreak }
        localStorage.setItem('stats', JSON.stringify(s))
        setStats(s)
        persistDaily('lost', found, [...guesses, sel])
        setDailyFinished(true)
      }
    }

    setSelected(new Set())
    setHintRevealed(new Set())
  }

  function giveUp() {
    if (mode === 'daily' && dailyFinished) return
    setRevealed(new Set(puzzle.flatMap(g => g.players)))
    setFound(puzzle)
    if (mode === 'daily' && !dailyFinished) {
      const s = { ...stats, currentStreak: 0, bestStreak: stats.bestStreak }
      localStorage.setItem('stats', JSON.stringify(s))
      setStats(s)
      persistDaily('gaveUp', puzzle, guesses)
      setDailyFinished(true)
    }
  }

  function useHint() {
    if (hintsUsed >= 2 || (mode === 'daily' && dailyFinished)) return
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
    const colorMap = ['🟪', '🟩', '🟦', '🟨', '⬛']
    const rows = guesses.map(guess =>
      guess
        .map(name => {
          const idx = puzzle.findIndex(g => g.players.includes(name))
          return colorMap[idx >= 0 ? idx : 4]
        })
        .join('')
    )
    const header = `Footly Puzzle #${puzzleId}`
    const link = 'https://footly-ten.vercel.app/'
    navigator.clipboard
      .writeText([header, ...rows, link].join('\n'))
      .then(() => alert('Results copied!'))
  }

  const remaining = deck.filter(name => !revealed.has(name))
  const fire =
    stats.currentStreak > 0 && stats.currentStreak === stats.bestStreak
      ? ' 🔥'
      : ''

  return (
    <>
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <div className="w-full max-w-xl mx-auto p-4 sm:p-6 text-gray-900">
          {/* Header & Help */}
          <div className="flex flex-col mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
              Football Connections
            </h1>
            <div className="flex justify-center mb-4">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="text-sm text-indigo-600 hover:underline"
              >
                How to play
              </button>
            </div>
            {showHelp && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs sm:text-sm">
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Select exactly four player cards that you think form a
                    category.
                  </li>
                  <li>
                    Click <strong>Submit</strong> to check your guess.
                  </li>
                  <li>
                    You have {MAX_INCORRECT} wrong guesses before the game
                    ends.
                  </li>
                  <li>
                    Use up to two <strong>Hints</strong> to reveal 2–3 related
                    players.
                  </li>
                  <li>Solve all four groups to win and see confetti!</li>
                </ul>
              </div>
            )}
          </div>

          {/* Mode Buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <button
              onClick={startDaily}
              className={`px-3 py-1 rounded text-xs sm:text-base ${
                mode === 'daily' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
              }`}
            >
              Daily Game
            </button>
            <button
              onClick={startRandom}
              className={`px-3 py-1 rounded text-xs sm:text-base ${
                mode === 'random' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
              }`}
            >
              Random Game
            </button>
          </div>

          {/* Stats */}
          <div className="text-center text-xs sm:text-sm mb-2">
            Mode: {mode === 'daily' ? 'Daily Puzzle' : 'Random Puzzle'}
          </div>
          <div className="text-center text-xs sm:text-sm mb-2">
            Solve Footly every day to grow your streak!
          </div>
          <div className="text-center mb-4 text-xs sm:text-base">
            Streak: {stats.currentStreak}
            {fire} | Best: {stats.bestStreak}
          </div>
          <div className="text-center mb-2 text-xs sm:text-base">
            Guesses left: {MAX_INCORRECT - incorrectCount}
          </div>

          {/* Completed Groups */}
          <div className="space-y-4">
            {found.map((g, i) => {
              const facts =
                (funFacts as Record<string, string[]>)[g.category] || []
              const fact =
                facts[Math.floor(Math.random() * facts.length)] || ''
              return (
                <div
                  key={i}
                  className="p-2 bg-green-100 rounded text-xs sm:text-base"
                >
                  <strong>{g.category}</strong>: {g.players.join(', ')}
                  <div className="italic text-xs sm:text-sm mt-1">
                    "{fact}"
                  </div>
                </div>
              )
            })}

            {/* Player Grid */}
            <PlayerGrid
              players={remaining}
              active={selected}
              hintRevealed={hintRevealed}
              onToggle={toggle}
            />

            {/* Controls: hide entirely if dailyFinished */}
            {!dailyFinished && (
              <div className="flex flex-wrap justify-center gap-2 sm:space-x-3 mt-4">
                <button
                  onClick={submit}
                  disabled={selected.size !== 4}
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded disabled:opacity-50 text-xs sm:text-base"
                >
                  Submit
                </button>
                <button
                  onClick={useHint}
                  disabled={hintsUsed >= 2}
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-yellow-400 text-white rounded disabled:opacity-50 text-xs sm:text-base"
                >
                  Hint ({hintsUsed}/2)
                </button>
                <button
                  onClick={giveUp}
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-300 rounded text-xs sm:text-base"
                >
                  Give Up
                </button>
                {/* New Game only in random mode */}
                {mode === 'random' && (
                  <button
                    onClick={startRandom}
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-indigo-500 text-white rounded text-xs sm:text-base"
                  >
                    New Game
                  </button>
                )}
              </div>
            )}

            {/* Share */}
            {(found.length === 4 || incorrectCount >= MAX_INCORRECT) && (
              <div className="text-center mt-4">
                <button
                  onClick={shareResults}
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded text-xs sm:text-base"
                >
                  Share Results
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Analytics />
    </>
  )
}
