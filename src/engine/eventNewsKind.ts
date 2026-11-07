import type { NewsItem } from '../domain'

/**
 * 事件的新闻标签由 `sender` 决定：收件箱 chip 要说「这是谁在跟你说话」。
 * 数据包里没有 category 字段，`sender` 是每条必填的中文角色名，所以映射表是唯一事实源；
 * 没登记过的角色落到 `system`，不再一律冒充媒体。
 */
const SENDER_NEWS_KIND: Record<string, NewsItem['kind']> = {
  教练: 'club',
  体能教练: 'club',
  董事会: 'club',
  体育总监: 'club',
  装备管理员: 'club',
  俱乐部职员: 'club',
  队内厨师: 'club',
  队医: 'club',
  心理咨询师: 'club',
  私教: 'club',
  营养师: 'club',
  队友: 'teammate',
  青训旧友: 'teammate',
  名宿: 'teammate',
  家人: 'family',
  邻居: 'family',
  经纪人: 'finance',
  银行: 'finance',
  赞助商: 'finance',
  房东: 'finance',
  俱乐部财务: 'finance',
  保险公司: 'finance',
  媒体: 'media',
  队报记者: 'media',
  转播记者: 'media',
  社交媒体: 'media',
  球迷自媒体: 'media',
  球迷论坛: 'media',
  球迷会: 'media',
  自己: 'system',
  联赛官方: 'system',
}

export function eventNewsKindOf(sender?: string): NewsItem['kind'] {
  return (sender && SENDER_NEWS_KIND[sender]) || 'system'
}
