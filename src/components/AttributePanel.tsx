import { ATTRIBUTE_CONFIG, ATTRIBUTE_NAMES } from '../game/attributes'
import { DIFFICULTY_CONFIG } from '../game/state'
import type { AttributeName, GameState, LifeStage } from '../game/types'

const ATTRIBUTE_LABELS: Record<AttributeName, string> = {
  intelligence: '智力',
  physique: '体力',
  charm: '魅力',
}

const STAGE_LABELS: Record<LifeStage, string> = {
  childhood: '童年',
  education: '求学',
  career: '工作',
  elderly: '晚年',
}

export default function AttributePanel({ state }: { state: GameState }) {
  return (
    <aside className="attribute-panel">
      <h2>角色状态</h2>
      <p className="age-line">
        {state.age} 岁 · {STAGE_LABELS[state.stage]}
      </p>
      <p className="wealth-line">财富：{state.wealth}</p>
      <p className="wealth-line">难度：{DIFFICULTY_CONFIG[state.difficulty].label}</p>
      <div className="attribute-list">
        {ATTRIBUTE_NAMES.map((name) => {
          const value = state.attributes[name]
          const pct = (value / ATTRIBUTE_CONFIG[name].max) * 100
          return (
            <div key={name} className="attribute">
              <div className="attribute-row">
                <span className="attribute-label">{ATTRIBUTE_LABELS[name]}</span>
                <span className="attribute-value">{value}</span>
              </div>
              <div className="attribute-bar">
                <div className="attribute-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
