import { describe, expect, it } from 'vitest'
import { NAME_POOLS } from '../../src/world/datapack'
import { displayName, hasCjk, nameZhFor } from '../../src/domain'

/** 中文优先显示名：界面与直播一律取 nameZh，拉丁原名只留在存档里。 */
describe('中文人名转写', () => {
  it('中国姓名池原样保留，不生成拼音也不加间隔号', () => {
    for (const name of ['王伟', '李强', '陈浩']) {
      expect(nameZhFor(name, '中国')).toBe(name)
    }
  })

  it('已经含汉字的姓名池（日本/韩国）同样原样保留', () => {
    expect(nameZhFor('佐藤翔太', '日本')).toBe('佐藤翔太')
    expect(nameZhFor('金敏浩', '韩国')).toBe('金敏浩')
  })

  it('常用英文姓名命中既定译名表', () => {
    expect(nameZhFor('James Smith', '英格兰')).toBe('詹姆斯·史密斯')
    expect(nameZhFor('Rodriguez', '西班牙')).toBe('罗德里格斯')
    expect(nameZhFor('Muller', '德国')).toBe('穆勒')
  })

  it('多词姓氏合成一个中文名并用间隔号分隔', () => {
    const value = nameZhFor('Daan de Jong', '荷兰')
    expect(value).toBe('丹·德容')
    expect(/[A-Za-z]/.test(value)).toBe(false)
  })

  it('表中没有的英文姓名走音节表转写，结果全为汉字', () => {
    const value = nameZhFor('Zzqxth Verhooven', '英格兰')
    expect(value.length).toBeGreaterThan(1)
    expect(hasCjk(value)).toBe(true)
    expect(/[A-Za-z]/.test(value)).toBe(false)
  })

  it('每个姓名池的 first 与 last 都能转写成纯汉字且不重复为空', () => {
    for (const [nationality, pool] of Object.entries(NAME_POOLS)) {
      for (const token of [...pool.first, ...pool.last]) {
        const value = nameZhFor(token, nationality)
        expect(value, token).not.toBe('')
        expect(/[A-Za-z]/.test(value), `${nationality} ${token} → ${value}`).toBe(false)
      }
    }
  })

  it('显示名优先取 nameZh，缺失时回落原名', () => {
    expect(displayName({ name: 'James Smith', nameZh: '詹姆斯·史密斯' })).toBe('詹姆斯·史密斯')
    expect(displayName({ name: 'James Smith' })).toBe('James Smith')
    expect(displayName({ name: 'James Smith', nameZh: '' })).toBe('James Smith')
  })

  it('同一姓名在任何国籍下转写结果稳定（纯字符串运算）', () => {
    expect(nameZhFor('Gabriel Silva', '巴西')).toBe(nameZhFor('Gabriel Silva', '葡萄牙'))
  })
})
