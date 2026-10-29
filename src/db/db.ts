import Dexie, { type Table } from 'dexie'
import type { SaveRecord } from '../domain'

export interface MetaRow {
  key: string
  value: string
}

export interface SecretRow {
  id: string
  value: unknown
}

export class GameDatabase extends Dexie {
  saves!: Table<SaveRecord, string>
  meta!: Table<MetaRow, string>
  secrets!: Table<SecretRow, string>

  constructor() {
    super('pitch-life-db')
    this.version(1).stores({
      saves: 'id',
      meta: 'key',
    })
    this.version(2).stores({
      saves: 'id',
      meta: 'key',
      secrets: 'id',
    })
  }
}

export const db = new GameDatabase()
