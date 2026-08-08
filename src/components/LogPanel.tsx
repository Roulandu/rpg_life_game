export interface LogEntry {
  id: number
  age: number
  title: string
  choice: string
}

export default function LogPanel({ log }: { log: LogEntry[] }) {
  return (
    <section className="log-panel">
      <h2>人生回顾</h2>
      {log.length === 0 ? (
        <p className="log-empty">还没有经历，做出第一个选择吧。</p>
      ) : (
        <ul className="log-list">
          {log.map((entry) => (
            <li key={entry.id}>
              <span className="log-age">{entry.age} 岁</span>
              <span className="log-title">{entry.title}</span>
              <span className="log-choice">→ {entry.choice}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
