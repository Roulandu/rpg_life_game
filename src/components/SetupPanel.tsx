import { useState } from 'react'
import { DIFFICULTY_CONFIG } from '../game/state'
import { STARTING_PROFILES } from '../game/attributes'
import type { Difficulty, ProfileId } from '../game/types'

interface Props {
  onStart: (difficulty: Difficulty, profile: ProfileId) => void
  onCancel: () => void
}

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

export default function SetupPanel({ onStart, onCancel }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [profile, setProfile] = useState<ProfileId>('balanced')

  return (
    <section className="setup-panel">
      <h2>开始新的人生</h2>

      <div className="setup-group">
        <h3>选择难度</h3>
        <div className="difficulty-options">
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              type="button"
              className={difficulty === level ? 'setup-option selected' : 'setup-option'}
              onClick={() => setDifficulty(level)}
            >
              {DIFFICULTY_CONFIG[level].label}
            </button>
          ))}
        </div>
        <p className="setup-hint">
          成长倍率 {DIFFICULTY_CONFIG[difficulty].gain}×，
          开局财富 {DIFFICULTY_CONFIG[difficulty].startingWealth}
        </p>
      </div>

      <div className="setup-group">
        <h3>选择出身</h3>
        <div className="profile-options">
          {STARTING_PROFILES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={profile === item.id ? 'setup-option profile selected' : 'setup-option profile'}
              onClick={() => setProfile(item.id)}
            >
              <span className="profile-name">{item.name}</span>
              <span className="profile-desc">{item.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="setup-actions">
        <button type="button" className="setup-start" onClick={() => onStart(difficulty, profile)}>
          开始人生
        </button>
        <button type="button" className="new-game" onClick={onCancel}>
          取消
        </button>
      </div>
    </section>
  )
}
