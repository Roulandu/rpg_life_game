import { exportWorld } from '../db'
import type { WorldState } from '../domain'
import { exportTextFile } from '../platform'
import type { FileExportResult } from '../platform'

export async function downloadWorld(world: WorldState): Promise<FileExportResult> {
  const user = world.players[world.playerId]
  const safeName = (user?.name ?? 'career').replace(/[\\/:*?"<>|\s]+/g, '_')
  const filename = `pitch-life-${safeName}-${world.season}-W${world.week}D${world.day}.json`
  return exportTextFile(exportWorld(world), filename)
}
