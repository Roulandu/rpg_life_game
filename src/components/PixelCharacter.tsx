import type { LifeStage } from '../game/types'

export type CharacterAction =
  | 'idle'
  | 'study'
  | 'exercise'
  | 'social'
  | 'work'
  | 'rest'
  | 'celebrate'

const ACTION_LABEL: Record<CharacterAction, string> = {
  idle: '',
  study: '学习…',
  exercise: '锻炼…',
  social: '社交…',
  work: '忙碌…',
  rest: '休息…',
  celebrate: '太棒了！',
}

const SPRITE = [
  '...HHHH.....',
  '..HHHHHH....',
  '..HHHHHHHH..',
  '...HHHHHH...',
  '....SSSS....',
  '...SSSSSS...',
  '..SSSSSSSS..',
  '...SSSSSS...',
  '....SSSS....',
  '..SCCCCCCS..',
  '..SCCCCCCS..',
  '...CCCCCC...',
  '..CCCCCCCC..',
  '..CCCCCCCC..',
  '..PPPPPPPP..',
  '..PPPPPPPP..',
  '..PP....PP..',
  '..PP....PP..',
  '..BB....BB..',
]

type Palette = {
  H: string
  S: string
  C: string
  P: string
  B: string
}

const PALETTES: Record<LifeStage, Palette> = {
  childhood: { H: '#8a5a33', S: '#f2c89a', C: '#9db8c9', P: '#7c6a55', B: '#5a4633' },
  education: { H: '#5a4633', S: '#f0c494', C: '#7c9a6a', P: '#6a5a45', B: '#4a3a2c' },
  career: { H: '#4a3a2c', S: '#ecc08c', C: '#5f7f96', P: '#4f4238', B: '#3a2f26' },
  elderly: { H: '#cfd2d6', S: '#e6bb87', C: '#8a8f86', P: '#66666b', B: '#4d4d52' },
}

const CELL = 6

interface Props {
  stage: LifeStage
  action: CharacterAction
}

function cellsFor(palette: Palette) {
  const cells: { x: number; y: number; fill: string }[] = []
  SPRITE.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      const fill = palette[ch as keyof Palette]
      if (fill) cells.push({ x, y, fill })
    }
  })
  return cells
}

export default function PixelCharacter({ stage, action }: Props) {
  const palette = PALETTES[stage]
  const cells = cellsFor(palette)
  const width = SPRITE[0].length * CELL
  const height = SPRITE.length * CELL
  const label = ACTION_LABEL[action]

  return (
    <div className={`pixel-stage stage-${stage} char-${action}`} aria-label={label || '角色'}>
      {action === 'rest' && <span className="zzz" aria-hidden="true">z z z</span>}
      {action === 'celebrate' && <span className="star" aria-hidden="true">✦</span>}
      {label && (
        <span className="action-bubble" role="status">
          {label}
        </span>
      )}
      <svg
        className="pixel-sprite"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        shapeRendering="crispEdges"
      >
        {cells.map((c, i) => (
          <rect key={i} x={c.x * CELL} y={c.y * CELL} width={CELL} height={CELL} fill={c.fill} />
        ))}
      </svg>
    </div>
  )
}
