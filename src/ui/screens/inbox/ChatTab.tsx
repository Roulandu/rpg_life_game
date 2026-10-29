import { AlertTriangle, LoaderCircle } from 'lucide-react'
import type { AiChatMessage } from '../../../domain'
import { Card } from '../../components/Card'
import { ChatComposer } from './ChatComposer'
import { ChatGate } from './ChatGate'
import { ChatIntro } from './ChatIntro'
import { ChatMessages } from './ChatMessages'

interface Props {
  aiEnabled: boolean
  canChat: boolean
  aiBusy: boolean
  aiError: string | null
  chat: AiChatMessage[]
  usedActionLabel: string | null
  onClearError: () => void
  onOpenSettings: () => void
  onSend: (text: string) => void
}

export function ChatTab(props: Props) {
  return (
    <div className="space-y-3">
      <ChatIntro usedActionLabel={props.usedActionLabel} />

      {!props.canChat ? (
        <ChatGate aiEnabled={props.aiEnabled} onOpenSettings={props.onOpenSettings} />
      ) : (
        <>
          <ChatMessages chat={props.chat} />

          {props.aiBusy ? (
            <Card className="flex items-center gap-2 p-3 text-[11px] text-muted">
              <LoaderCircle size={14} className="animate-spin text-teal" />
              GM 正在回应…
            </Card>
          ) : null}

          {props.aiError ? (
            <Card className="border-danger/25 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
                <p className="flex-1 text-[11px] leading-relaxed text-danger">{props.aiError}</p>
                <button type="button" className="shrink-0 text-[10px] text-dim" onClick={props.onClearError}>
                  知道了
                </button>
              </div>
            </Card>
          ) : null}

          <ChatComposer aiBusy={props.aiBusy} onSend={props.onSend} />
        </>
      )}
    </div>
  )
}
