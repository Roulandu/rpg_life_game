import { ACHIEVEMENTS } from '../game/achievements'

interface Props {
  unlockedIds: string[]
}

export default function AchievementPanel({ unlockedIds }: Props) {
  const unlocked = new Set(unlockedIds)
  return (
    <section className="achievement-panel">
      <h2>成就图鉴</h2>
      <ul className="achievement-list">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlocked.has(achievement.id)
          return (
            <li
              key={achievement.id}
              className={isUnlocked ? 'achievement unlocked' : 'achievement'}
            >
              <span className="achievement-mark">{isUnlocked ? '★' : '☆'}</span>
              <span className="achievement-info">
                <span className="achievement-title">{achievement.title}</span>
                <span className="achievement-desc">{achievement.description}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
