import { useState } from 'react'
import clsx from 'clsx'
import { INVESTMENT_KINDS, INVESTMENT_KIND_ORDER } from '../../../domain'
import type { InvestmentKind, InvestmentKindSpec, WorldState } from '../../../domain'
import { formatMoney } from '../../../lib'
import { useGameStore } from '../../../store'
import { Modal } from '../../components/Modal'

/** 下单档位：按这一档的起投额倍数给出，最后一档是「把手头能整份投出去的钱全投」。 */
const LOT_MULTIPLES = [1, 2, 5]

interface Lot {
  amount: number
  whole: boolean
}

function lotOptions(balance: number, minPrincipal: number): Lot[] {
  const lots = Math.floor(balance / minPrincipal)
  if (lots < 1) return []

  const options: Lot[] = LOT_MULTIPLES.map((multiple) => ({ amount: multiple * minPrincipal, whole: false })).filter(
    (lot) => lot.amount <= balance,
  )
  const max = lots * minPrincipal
  if (max > (options[options.length - 1]?.amount ?? 0)) options.push({ amount: max, whole: true })
  return options
}

function summaryOf(spec: InvestmentKindSpec): string {
  const lock = spec.termDays > 0 ? `锁定 ${spec.termDays} 天` : '随取随用'
  const fee = spec.earlyExitFee > 0 ? `，锁定期内赎回收 ${(spec.earlyExitFee * 100).toFixed(0)}% 罚息` : ''
  return `年化 ${(spec.rateBps / 100).toFixed(1)}% · ${lock}${fee}`
}

function KindOption({
  spec,
  balance,
  active,
  onSelect,
}: {
  spec: InvestmentKindSpec
  balance: number
  active: boolean
  onSelect: () => void
}) {
  const short = spec.minPrincipal - balance
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={short > 0}
      aria-pressed={active}
      className={clsx(
        'min-h-11 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-55',
        active ? 'border-accent bg-accent/10' : 'border-line bg-card-2 hover:border-accent/40',
      )}
    >
      <span className="block text-xs font-semibold text-text">{spec.label}</span>
      <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">{spec.blurb}</span>
      <span className="mt-1 block font-mono text-[10px] text-dim">
        {short > 0 ? `还差 ${formatMoney(short)}` : `起投 ${formatMoney(spec.minPrincipal)}`}
      </span>
    </button>
  )
}

interface SheetBodyProps {
  balance: number
  kind: InvestmentKind | null
  amount: number | null
  onSelectKind: (kind: InvestmentKind) => void
  onSelectAmount: (amount: number) => void
}

/** 抽屉正文：四档条款 + 选中那一档的份数。分成独立组件是因为「选档」与「选钱」是两段状态。 */
function SheetBody({ balance, kind, amount, onSelectKind, onSelectAmount }: SheetBodyProps) {
  const spec = kind ? INVESTMENT_KINDS[kind] : null
  const options = spec ? lotOptions(balance, spec.minPrincipal) : []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {INVESTMENT_KIND_ORDER.map((value) => (
          <KindOption
            key={value}
            spec={INVESTMENT_KINDS[value]}
            balance={balance}
            active={kind === value}
            onSelect={() => onSelectKind(value)}
          />
        ))}
      </div>
      {spec === null ? (
        <p className="text-[11px] leading-relaxed text-muted">先选一处，再挑投入多少。</p>
      ) : (
        <section className="min-w-0">
          <p className="mb-2 text-[11px] leading-relaxed text-accent">{summaryOf(spec)}</p>
          <div className="flex flex-wrap gap-1.5">
            {options.map((lot) => (
              <button
                key={lot.amount}
                type="button"
                onClick={() => onSelectAmount(lot.amount)}
                aria-pressed={amount === lot.amount}
                className={clsx(
                  'min-h-11 rounded-xl border px-3 text-[11px] font-medium transition',
                  amount === lot.amount
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-line bg-card-2 text-muted',
                )}
              >
                {`${lot.whole ? '全部可投' : '投入'} ${formatMoney(lot.amount)}`}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

interface InvestSheetProps {
  open: boolean
  world: WorldState
  onClose: () => void
}

/** 开仓抽屉：档位、份数与确认都在这一处，成交才关，被拒就留着让人改。 */
export function InvestSheet({ open, world, onClose }: InvestSheetProps) {
  const investMoney = useGameStore((state) => state.investMoney)
  const [kind, setKind] = useState<InvestmentKind | null>(null)
  const [amount, setAmount] = useState<number | null>(null)
  const [pending, setPending] = useState(false)

  async function confirm() {
    if (!kind || amount === null) return
    setPending(true)
    const result = await investMoney(kind, amount)
    setPending(false)
    if (result?.ok) {
      setKind(null)
      setAmount(null)
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!pending}
      title="资金去处"
      description="投出去的钱立刻离开可用余额；现值每周才走一次，锁定期内赎回要付罚息。"
      footer={
        <button
          type="button"
          className="btn-primary w-full"
          disabled={kind === null || amount === null || pending}
          onClick={() => void confirm()}
        >
          {pending ? '正在下单…' : `确认开仓${amount === null ? '' : ` ${formatMoney(amount)}`}`}
        </button>
      }
    >
      <SheetBody
        balance={world.finance.balance}
        kind={kind}
        amount={amount}
        onSelectKind={(next) => {
          setKind(next)
          setAmount(null)
        }}
        onSelectAmount={setAmount}
      />
    </Modal>
  )
}
