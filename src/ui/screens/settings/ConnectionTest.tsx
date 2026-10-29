import { AlertTriangle, CheckCircle2, LoaderCircle, Sparkles, XCircle } from 'lucide-react'
import type { TestState } from './types'

interface Props {
  ready: boolean
  testState: TestState
  aiError: string | null
  onTest: () => void
}

export function ConnectionTest({ ready, testState, aiError, onTest }: Props) {
  return (
    <>
      <button
        type="button"
        className="btn-secondary w-full"
        disabled={!ready || testState.running}
        onClick={onTest}
      >
        {testState.running ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
        {testState.running ? '正在测试…' : '测试连接'}
      </button>
      {testState.message ? (
        <p
          className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed ${
            testState.ok === true
              ? 'border-teal/25 bg-teal/5 text-teal'
              : testState.ok === false
                ? 'border-danger/25 bg-danger/5 text-danger'
                : 'border-line-soft text-muted'
          }`}
        >
          {testState.ok === true ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          ) : testState.ok === false ? (
            <XCircle size={14} className="mt-0.5 shrink-0" />
          ) : null}
          {testState.message}
        </p>
      ) : null}
      {aiError ? (
        <p className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 px-3 py-2.5 text-[11px] leading-relaxed text-danger">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {aiError}
        </p>
      ) : null}
    </>
  )
}
