import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Game crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto flex min-h-svh max-w-[480px] flex-col justify-center px-6 text-center sm:max-w-[560px]">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-danger">发生错误</p>
        <h1 className="mt-2 text-2xl font-semibold text-text">游戏遇到了一个问题</h1>
        <p className="mt-3 break-words text-xs leading-relaxed text-muted">{this.state.error.message}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            重新加载
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              window.location.hash = '#/'
              window.location.reload()
            }}
          >
            返回标题
          </button>
        </div>
      </div>
    )
  }
}
