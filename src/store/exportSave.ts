import { exportWorld } from '../db/repository'
import type { WorldState } from '../domain/types'
import { downloadTextFile } from '../platform/fileExport'

export function downloadWorld(world: WorldState): void {
  const user = world.players[world.playerId]
  const safeName = (user?.name ?? 'career').replace(/[\\/:*?"<>|\s]+/g, '_')
  downloadTextFile(exportWorld(world), `pitch-life-${safeName}-${world.season}-W${world.week}.json`)
}
