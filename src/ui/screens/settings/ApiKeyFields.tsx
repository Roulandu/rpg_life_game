import { Eye, EyeOff, KeyRound } from 'lucide-react'
import type { ApiKeyForm } from './types'

export function ApiKeyFields({ form }: { form: ApiKeyForm }) {
  return (
    <div className="rounded-xl border border-line-soft bg-card-2/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-text">
          <KeyRound size={13} className="text-muted" /> API Key
        </span>
        <span className={`chip px-1.5 py-0 text-[9px] ${form.ready ? 'border-teal/30 text-teal' : ''}`}>
          {form.ready ? '已载入' : '未配置'}
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        <input
          type={form.show ? 'text' : 'password'}
          className="input font-mono text-xs"
          placeholder={form.ready ? '已保存，输入新 Key 可替换' : '粘贴 API Key'}
          value={form.input}
          onChange={(event) => form.setInput(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-label="API Key"
        />
        <button
          type="button"
          className="btn-ghost shrink-0 px-2"
          aria-label={form.show ? '隐藏 Key' : '显示 Key'}
          onClick={form.toggleShow}
        >
          {form.show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {form.native ? (
        <p className="mt-2 text-[10px] leading-relaxed text-dim">Android 端使用系统安全存储（Keystore）。</p>
      ) : (
        <label className="mt-2 flex items-start gap-2 text-[10px] leading-relaxed text-muted">
          <input
            type="checkbox"
            className="mt-0.5 accent-teal"
            checked={form.remember}
            onChange={(event) => form.setRemember(event.target.checked)}
          />
          <span>
            在本机记住密钥（Web Crypto 加密保存）。不勾选时只保留在本次会话，刷新后需重新填写。
          </span>
        </label>
      )}
      {form.hint ? <p className="mt-1 text-[10px] text-dim">{form.hint}</p> : null}
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button type="button" className="btn-secondary text-xs" disabled={!form.input.trim()} onClick={form.save}>
          保存 Key
        </button>
        <button type="button" className="btn-secondary text-xs" disabled={!form.ready} onClick={form.clear}>
          清除 Key
        </button>
      </div>
    </div>
  )
}
