// src/App.tsx
import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { shuffle } from './utils/shuffle'
import { PlayerGrid } from './components/PlayerGrid'
import { Controls } from './components/Controls'
import { Analytics } from '@vercel/analytics/react'
import { useDailyPuzzle } from './hooks/useDailyPuzzle'
import { useStreaks } from './hooks/useStreaks'
import funFacts from './data/funFacts.json'

const MAX_INCORRECT = 4

export default function App() {
  const [mode, setMode] = useState<'daily' | 'random'>('daily')
  const [showHelp, setShowHelp] = useState(false)

  const {
    puzzle,
    deck,
    found,
    setFound,
    revealed,
    setRevealed,
    guesses,
    setGuesses,
    finished,
    persist,
    start,
  } = useDailyPuzzle()

  const { stats, win, lose } = useStreaks()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [hintRevealed, setHintRevealed] = useState<Set<string>>(new Set())
  const [hintsUsed, setHintsUsed] = useState(0)
  const [lastHintCategory, setLastHintCategory] = useState<string | null>(null)
  const [incorrectCount, setIncorrectCount] = useState(0)

  const today = new Date().toISOString().slice(0, 10)
  const fire = stats.currentStreak > 0 && stats.currentStreak === stats.bestStreak ? ' 🔥' : ''

  // on daily win
  useEffect(() => {
    if (mode === 'daily' && found.length === 4 && !finished) {
      confetti()
      win(today)
      persist('won')
    }
  }, [found])

  const startDaily = () => {
    setMode('daily')
    start(today)
  }
  const startRandom = () => {
    setMode('random')
    start()
  }

  const toggle = (name: string) => {
    if ((mode === 'daily' && finished) || revealed.has(name)) return
    const s = new Set(selected)
    s.has(name) ? s.delete(name) : s.size < 4 && s.add(name)
    setSelected(s)
  }

  const submit = () => {
    if (selected.size !== 4) return
    const sel = Array.from(selected)
    setGuesses([...guesses, sel])

    const match = puzzle.find(g => sel.every(p => g.players.includes(p)))
    if (match) {
      const rev = new Set(revealed)
      match.players.forEach(p => rev.add(p))
      setRevealed(rev)
      setFound([...found, match])
    } else {
      const count = incorrectCount + 1
      setIncorrectCount(count)
      if (mode === 'daily' && count >= MAX_INCORRECT && !finished) {
        lose()
        persist('lost')
      }
    }
    setSelected(new Set())
    setHintRevealed(new Set())
  }

  const giveUp = () => {
    if (mode === 'daily' && finished) return
    setRevealed(new Set(puzzle.flatMap(g => g.players)))
    setFound(puzzle)
    if (mode === 'daily' && !finished) {
      lose()
      persist('gaveUp')
    }
  }

  const useHint = () => {
    if (hintsUsed >= 2 || (mode === 'daily' && finished)) return
    const grp = puzzle.find(g => !found.includes(g))
    if (!grp) return
    const count = lastHintCategory === grp.category ? 3 : 2
    const options = grp.players.filter(p => !revealed.has(p))
    const picks = shuffle(options).slice(0, count)
    setHintRevealed(new Set(picks))
    setHintsUsed(hintsUsed + 1)
    setLastHintCategory(grp.category)
  }

  const shareResults = () => {
    const colorMap = ['🟪','🟩','🟦','🟨','⬛']
    const rows = guesses.map(g =>
      g.map(n => colorMap[puzzle.findIndex(pg => pg.players.includes(n))] || '⬛')
       .join('')
    )
    const header = `Footly Puzzle #${today} | Streak: ${stats.currentStreak} | Best Streak: ${stats.bestStreak}`
    navigator.clipboard
      .writeText([header, ...rows, 'https://footly-game.vercel.app/'].join('\n'))
      .then(() => alert('Results copied!'))
  }

  const remaining = deck.filter(n => !revealed.has(n))

  return (
    <>
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <div className="w-full max-w-xl p-6 text-gray-900">
          <h1 className="text-3xl font-bold text-center mb-4">
            Football Connections
          </h1>

          {/* How to Play */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-sm text-white-600 bg-blue-300 hover:underline"
            >
              How to play
            </button>
          </div>
          {showHelp && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs sm:text-sm">
              <ul className="list-disc list-inside space-y-1">
                <li>Select exactly four player cards that you think form a category.</li>
                <li>Click <strong>Submit</strong> to check your guess.</li>
                <li>You have {MAX_INCORRECT} wrong guesses before the game ends.</li>
                <li>Use up to two <strong>Hints</strong> to reveal 2–3 related players.</li>
                <li>Solve all four groups to win and see confetti!</li>
              </ul>
            </div>
          )}

          {/* Mode Switch */}
          <div className="flex justify-center space-x-2 mb-4">
            <button
              onClick={startDaily}
              className={mode === 'daily' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}
            >
              Daily Game
            </button>
            <button
              onClick={startRandom}
              className={mode === 'random' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}
            >
              Random Game
            </button>
          </div>

          <div className="text-center mb-2">
            Mode: {mode === 'daily' ? 'Daily Puzzle' : 'Random Puzzle'}
          </div>
          <div className="text-center mb-2">
            Streak: {stats.currentStreak}{fire} | Best: {stats.bestStreak}
          </div>
          <div className="text-center mb-4">
            Guesses left: {MAX_INCORRECT - incorrectCount}
          </div>

          <div className="space-y-4">
            {found.map((g, i) => (
              <div key={i} className="p-2 bg-green-100 rounded">
                <strong>{g.category}</strong>: {g.players.join(', ')}
                <div className="italic mt-1 text-sm">
                  "{(funFacts as any)[g.category]?.[0] || ''}"
                </div>
              </div>
            ))}

            <PlayerGrid
              players={remaining}
              active={selected}
              hintRevealed={hintRevealed}
              onToggle={toggle}
            />

            <Controls
              mode={mode}
              dailyFinished={finished}
              selected={selected}
              hintsUsed={hintsUsed}
              onSubmit={submit}
              onHint={useHint}
              onGiveUp={giveUp}
              onNew={startRandom}
            />

            {(found.length === 4 || incorrectCount >= MAX_INCORRECT) && (
              <div className="text-center mt-4">
                <button
                  onClick={shareResults}
                  className="bg-green-600 text-white px-4 py-2 rounded"
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
