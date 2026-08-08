import type { GameEvent } from '../game/types'

interface Props {
  event: GameEvent
  onChoose: (index: number) => void
}

export default function EventCard({ event, onChoose }: Props) {
  return (
    <section className="event-card">
      <h2>{event.title}</h2>
      <p className="event-description">{event.description}</p>
      <div className="options">
        {event.options.map((option, index) => (
          <button key={option.label} type="button" onClick={() => onChoose(index)}>
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}
