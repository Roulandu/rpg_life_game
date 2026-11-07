import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { NewsItem } from '../../src/domain'
import { NEWS_KIND_LABEL } from '../../src/ui/labels'
import { NewsTab } from '../../src/ui/screens/inbox/NewsTab'
import { NewsFeed } from '../../src/ui/screens/dashboard/NewsFeed'

function item(kind: NewsItem['kind'], title: string): NewsItem {
  return { id: `news:${kind}`, season: 2026, week: 3, day: 12, title, body: '正文', kind }
}

describe('新闻 chip 的中文档位', () => {
  afterEach(cleanup)

  it('收件箱把队友/家人/财务三类事件新闻各显示成自己的档位', () => {
    render(
      <NewsTab
        news={[item('teammate', '队友约你吃饭'), item('family', '家人想来看看你'), item('finance', '房东发来账单')]}
      />,
    )

    expect(screen.getByText('队友')).toBeInTheDocument()
    expect(screen.getByText('家人')).toBeInTheDocument()
    expect(screen.getByText('财务')).toBeInTheDocument()
    expect(screen.queryByText('媒体')).not.toBeInTheDocument()
  })

  it('主页新闻栏与收件箱共用同一份档位表', () => {
    render(
      <MemoryRouter>
        <NewsFeed news={[item('family', '家人想来看看你')]} />
      </MemoryRouter>,
    )

    expect(screen.getByText('家人')).toBeInTheDocument()
    expect(Object.keys(NEWS_KIND_LABEL)).toHaveLength(9)
  })
})
