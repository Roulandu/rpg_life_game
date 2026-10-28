import { db } from '../db/db'
import { configureSecretStore } from '../platform/keyStore'

configureSecretStore({
  get: (id) => db.secrets.get(id),
  put: async (record) => {
    await db.secrets.put(record)
  },
  delete: async (id) => {
    await db.secrets.delete(id)
  },
})
