import type { Ending } from '../game/endings'

interface Props {
  ending: Ending
  age: number
}

export default function EndingCard({ ending, age }: Props) {
  return (
    <section className="event-card ending-card">
      <p className="ending-label">人生结局 · {age} 岁</p>
      <h2>{ending.title}</h2>
      <p className="event-description">{ending.description}</p>
    </section>
  )
}
