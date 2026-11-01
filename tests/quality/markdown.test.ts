import { describe, expect, it } from 'vitest'
import { hasMermaid } from '../../scripts/quality/lib/markdown'

describe('markdown helpers', () => {
  it('识别 CRLF 文档中的 mermaid flowchart', () => {
    const body = '# 架构\r\n\r\n```mermaid\r\nflowchart LR\r\n  A --> B\r\n```\r\n'
    expect(hasMermaid(body, 'flowchart')).toBe(true)
  })

  it('识别 CRLF 文档中的 sequenceDiagram', () => {
    const body = '```mermaid\r\nsequenceDiagram\r\n  A->>B: hi\r\n```\r\n'
    expect(hasMermaid(body, 'sequenceDiagram')).toBe(true)
  })

  it('区分图表类型', () => {
    const body = '```mermaid\nflowchart TD\n  A --> B\n```\n'
    expect(hasMermaid(body, 'flowchart')).toBe(true)
    expect(hasMermaid(body, 'sequenceDiagram')).toBe(false)
  })
})
