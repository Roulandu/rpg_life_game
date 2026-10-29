import { useState } from 'react'
import { LoaderCircle, Send } from 'lucide-react'
import { Card } from '../../components/Card'
import { shouldSendOnEnter } from './composerKeys'

const MAX_MESSAGE = 400

interface Props {
  aiBusy: boolean
  onSend: (text: string) => void
}

export function ChatComposer({ aiBusy, onSend }: Props) {
  const [message, setMessage] = useState('')

  function handleSend() {
    const text = message.trim()
    if (!text || aiBusy) return
    setMessage('')
    onSend(text)
  }

  return (
    <Card className="p-3">
      <label className="label" htmlFor="gm-message">
        对 GM 说
      </label>
      <textarea
        id="gm-message"
        className="input min-h-20 resize-none text-sm"
        placeholder="例如：我想加练射门，但别把体能练垮。"
        maxLength={MAX_MESSAGE}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          const native = event.nativeEvent
          if (
            shouldSendOnEnter({
              key: event.key,
              shiftKey: event.shiftKey,
              isComposing: native.isComposing,
              keyCode: native.keyCode,
            })
          ) {
            event.preventDefault()
            handleSend()
          }
        }}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-dim">
          {message.length}/{MAX_MESSAGE} · Enter 发送
        </span>
        <button
          type="button"
          className="btn-primary px-4 text-xs"
          disabled={!message.trim() || aiBusy}
          onClick={handleSend}
        >
          {aiBusy ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
          发送
        </button>
      </div>
    </Card>
  )
}
