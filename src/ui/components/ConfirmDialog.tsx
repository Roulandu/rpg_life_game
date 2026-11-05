import type { ReactNode } from 'react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  detail?: ReactNode
  onCancel: () => void
  onConfirm: () => void
}

/**
 * 破坏性操作的应用内确认框。
 * 不用 window.confirm：它的按钮写着英文 CANCEL/OK，而且不归返回键栈管，手机上等于「要么误删要么退出」。
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '删除',
  detail,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="btn-secondary flex-1 border-danger/50 text-danger hover:border-danger hover:text-danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-muted">{description}</p>
      {detail ? <p className="mt-2 text-[11px] leading-relaxed text-dim">{detail}</p> : null}
    </Modal>
  )
}
