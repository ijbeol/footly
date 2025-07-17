// src/components/Controls.tsx

export type ControlsProps = {
  mode: 'daily' | 'random'
  dailyFinished: boolean
  selected: Set<string>
  hintsUsed: number
  onSubmit: () => void
  onHint: () => void
  onGiveUp: () => void
  onNew: () => void
}

export function Controls({
  mode,
  dailyFinished,
  selected,
  hintsUsed,
  onSubmit,
  onHint,
  onGiveUp,
  onNew,
}: ControlsProps) {
  // only hide controls if in daily mode *and* the daily puzzle is finished
  if (mode === 'daily' && dailyFinished) return null

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      <button
        onClick={onSubmit}
        disabled={selected.size !== 4}
        className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        Submit
      </button>
      <button
        onClick={onHint}
        disabled={hintsUsed >= 2}
        className="px-3 py-2 bg-yellow-400 text-white rounded disabled:opacity-50"
      >
        Hint ({hintsUsed}/2)
      </button>
      <button
        onClick={onGiveUp}
        className="px-3 py-2 bg-gray-300 rounded"
      >
        Give Up
      </button>
      {mode === 'random' && (
        <button
          onClick={onNew}
          className="px-3 py-2 bg-indigo-500 text-white rounded"
        >
          New Game
        </button>
      )}
    </div>
  )
}
