// src/components/PlayerCard.tsx
import React from 'react'

export interface PlayerCardProps {
  name: string
  active: boolean
  hint: boolean
  onClick: () => void
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ name, active, hint, onClick }) => (
  <button
    onClick={onClick}
    className={`p-2 sm:p-4 text-center border rounded-lg transition
      text-xs sm:text-base
      ${active ? 'bg-blue-200 border-blue-400' : 'bg-white border-gray-300'}
      ${hint ? 'border-yellow-800' : ''}
      hover:border-blue-500`}
  >
    {name}
  </button>
)