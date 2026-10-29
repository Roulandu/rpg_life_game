import { exportWorld } from '../db'
import type { WorldState } from '../domain'
import { downloadTextFile } from '../platform'

export function downloadWorld(world: WorldState): void {
  const user = world.players[world.playerId]
  const safeName = (user?.name ?? 'career').replace(/[\\/:*?"<>|\s]+/g, '_')
  downloadTextFile(exportWorld(world), `pitch-life-${safeName}-${world.season}-W${world.week}.json`)
}
