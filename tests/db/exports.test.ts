import { describe, expect, expectTypeOf, it } from 'vitest'
import { createSaveId, db, exportWorld, loadWorld, saveWorld } from '../../src/db'
import type { MetaRow, SecretRow } from '../../src/db'

describe('db public entry', () => {
  it('exports the database and repository helpers', () => {
    expect(db).toBeTruthy()
    expect(typeof createSaveId).toBe('function')
    expect(typeof saveWorld).toBe('function')
    expect(typeof loadWorld).toBe('function')
    expect(typeof exportWorld).toBe('function')
  })

  it('exposes row types', () => {
    expectTypeOf<MetaRow>().not.toBeAny()
    expectTypeOf<SecretRow>().not.toBeAny()
  })
})
