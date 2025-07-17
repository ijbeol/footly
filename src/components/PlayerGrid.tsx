import React from 'react'
import { PlayerCard } from './PlayerCard'

export interface PlayerGridProps {
  players: string[];
  active: Set<string>;
  hintRevealed: Set<string>;
  onToggle: (name: string) => void;
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({ players, active, hintRevealed, onToggle }) => {
  return (
    <div className="grid grid-cols-4 gap-3">
      {players.map(name => (
        <PlayerCard
          key={name}
          name={name}
          active={active.has(name)}
          hint={hintRevealed.has(name)}
          onClick={() => onToggle(name)}
        />
      ))}
    </div>
  )
}
