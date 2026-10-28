import { describe, expect, it } from 'vitest'
import { canonicalStringify } from '../../src/lib/json'

describe('canonicalStringify', () => {
  it('按 key 升序排列并省略 undefined 值', () => {
    expect(canonicalStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
    expect(canonicalStringify({ a: 1, b: undefined })).toBe('{"a":1}')
  })

  it('递归处理数组与嵌套对象', () => {
    expect(canonicalStringify([{ b: 1, a: 2 }, null])).toBe('[{"a":2,"b":1},null]')
    expect(canonicalStringify({ outer: { b: 1, a: 2 } })).toBe('{"outer":{"a":2,"b":1}}')
  })

  it('处理标量与顶层 undefined', () => {
    expect(canonicalStringify(undefined)).toBe('null')
    expect(canonicalStringify(null)).toBe('null')
    expect(canonicalStringify('x')).toBe('"x"')
    expect(canonicalStringify(3)).toBe('3')
    expect(canonicalStringify(true)).toBe('true')
  })
})
