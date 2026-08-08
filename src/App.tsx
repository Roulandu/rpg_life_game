import { useEffect, useState } from 'react'
import './App.css'
import AchievementPanel from './components/AchievementPanel'
import AttributePanel from './components/AttributePanel'
import EndingCard from './components/EndingCard'
import EventCard from './components/EventCard'
import LogPanel, { type LogEntry } from './components/LogPanel'
import RunStatsPanel from './components/RunStatsPanel'
import SetupPanel from './components/SetupPanel'
import { applyOption, selectEvent } from './game/events'
import { DEFAULT_EVENT_POOL } from './game/eventPool'
import { evaluateEnding, isLifeOver } from './game/endings'
import { loadGame, saveGame } from './game/save'
import { loadRunStats, recordEnding, type RunStats } from './game/runStats'
import { advanceAge, createInitialState } from './game/state'
import type { Difficulty, GameEvent, GameState, ProfileId } from './game/types'
import {
  loadAchievements,
  newlyUnlocked,
  saveAchievements,
  type Achievement,
} from './game/achievements'
import { toggleMusic } from './music'
import { playAchievement, playChoose, playEnding, playMilestone } from './sound'

const storage = localStorage

function initialGame() {
  const loaded = loadGame(storage)
  const gameState = loaded ?? createInitialState()
  return { state: gameState, event: selectEvent(gameState, DEFAULT_EVENT_POOL) }
}

function App() {
  const [state, setState] = useState<GameState>(() => initialGame().state)
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(
    () => initialGame().event,
  )
  const [log, setLog] = useState<LogEntry[]>([])
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() =>
    loadAchievements(storage),
  )
  const [toast, setToast] = useState<Achievement | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [runStats, setRunStats] = useState<RunStats>(() => loadRunStats(storage))
  const [musicOn, setMusicOn] = useState(false)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  function handleChoice(index: number) {
    if (!currentEvent) return
    const option = currentEvent.options[index]
    const next = advanceAge(applyOption(state, option))
    playChoose()
    const gainedMilestone = next.milestones.some((m) => !state.milestones.includes(m))
    if (gainedMilestone) playMilestone()

    const fresh = newlyUnlocked(next, unlockedIds)
    if (fresh.length > 0) {
      const ids = Array.from(new Set([...unlockedIds, ...fresh.map((a) => a.id)]))
      setUnlockedIds(ids)
      saveAchievements(storage, ids)
      playAchievement()
      setToast(fresh[0])
    }

    setState(next)
    setLog((prev) => [
      ...prev,
      {
        id: prev.length,
        age: state.age,
        title: currentEvent.title,
        choice: option.label,
      },
    ])
    if (isLifeOver(next)) {
      playEnding()
      setRunStats(recordEnding(storage, evaluateEnding(next).id))
      setCurrentEvent(null)
    } else {
      setCurrentEvent(selectEvent(next, DEFAULT_EVENT_POOL))
    }
    saveGame(storage, next)
  }

  function handleNewGame() {
    playChoose()
    setShowSetup(true)
  }

  function handleMusicToggle() {
    setMusicOn(toggleMusic())
  }

  function startGame(difficulty: Difficulty, profile: ProfileId) {
    const next = createInitialState({ difficulty, profile })
    setShowSetup(false)
    setState(next)
    setLog([])
    setCurrentEvent(selectEvent(next, DEFAULT_EVENT_POOL))
    saveGame(storage, next)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>人生模拟器 RPG</h1>
        <div className="header-actions">
          <button
            type="button"
            className="new-game"
            onClick={handleMusicToggle}
          >
            {musicOn ? '音乐开' : '音乐关'}
          </button>
          <button type="button" className="new-game" onClick={handleNewGame}>
            重新开始
          </button>
        </div>
      </header>

      {toast && (
        <div className="achievement-toast" role="status">
          <span className="toast-star">★</span>
          <span className="toast-text">
            解锁成就：<strong>{toast.title}</strong>
          </span>
        </div>
      )}

      {showSetup ? (
        <SetupPanel onStart={startGame} onCancel={() => setShowSetup(false)} />
      ) : (
        <>
          <div className="layout">
            <AttributePanel state={state} />
            <main className="main">
              {isLifeOver(state) ? (
                <EndingCard ending={evaluateEnding(state)} age={state.age} />
              ) : currentEvent ? (
                <EventCard key={currentEvent.id} event={currentEvent} onChoose={handleChoice} />
              ) : (
                <p className="game-over">人生到此为止，谢谢游玩！</p>
              )}
            </main>
          </div>

          <LogPanel log={log} />

          <AchievementPanel unlockedIds={unlockedIds} />

          <RunStatsPanel stats={runStats} />
        </>
      )}
    </div>
  )
}

export default App
