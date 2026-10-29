import { Card } from '../../components/Card'

interface Props {
  aiEnabled: boolean
  onOpenSettings: () => void
}

export function ChatGate({ aiEnabled, onOpenSettings }: Props) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs text-muted">{aiEnabled ? '还没有可用的 API Key。' : 'AI 对话未启用。'}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-dim">
        在设置里打开 AI 叙事并保存 Key 后，就能用自然语言和 GM 交流。
      </p>
      <button type="button" className="btn-secondary mt-3 w-full" onClick={onOpenSettings}>
        去设置
      </button>
    </Card>
  )
}
