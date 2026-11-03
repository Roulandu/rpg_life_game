/**
 * 职责：真机验收前的体检——SDK/adb/在线设备/Web 负载是否同步/APK 是否比负载旧，一条命令读结论。
 * 边界：只读不改，`npm run android:doctor -- --json` 会把探针一起打出来；设备不在场是提醒不是失败，负载不一致或 dist/assets 缺失才是失败（退出码 1）。
 * 依赖：Node 自带 fs 与 child_process，调用 adb devices；判定口径全部交给 lib/device.ts 的纯函数。
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { assessDeviceReport, formatDeviceReport, type DeviceProbe } from './lib/device'

const repoRoot = resolve(process.cwd())
const DIST_INDEX = join(repoRoot, 'dist', 'index.html')
const ASSETS_INDEX = join(repoRoot, 'android', 'app', 'src', 'main', 'assets', 'public', 'index.html')
const APK_DIR = join(repoRoot, 'android', 'app', 'build', 'outputs', 'apk')

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

function readHome(): { value: string; exists: boolean } {
  const value = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? ''
  return { value, exists: value.length > 0 && existsSync(value) }
}

function adbBinary(home: string): string {
  return home ? join(home, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb') : 'adb'
}

/** `adb devices -l` 里只认 state=device 的行；unauthorized/offline 不算能用的设备。 */
function parseDevices(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /\tdevice(\s|$)/.test(line))
    .map((line) => line.split('\t')[0])
}

function collectDevices(home: string): { available: boolean; online: string[] } {
  try {
    const output = execFileSync(adbBinary(home), ['devices', '-l'], { encoding: 'utf8', timeout: 15_000 })
    return { available: true, online: parseDevices(output) }
  } catch {
    return { available: false, online: [] }
  }
}

function hashIfExists(path: string): string | null {
  if (!existsSync(path)) return null
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

/** index.html 里带的是本次构建的资源哈希，所以比它就能发现「dist 新、assets 旧」。 */
function latestApk(): { bytes: number; mtimeMs: number } | null {
  if (!existsSync(APK_DIR)) return null
  const found: { path: string; bytes: number; mtimeMs: number }[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.apk')) {
        const stat = statSync(full)
        found.push({ path: full, bytes: stat.size, mtimeMs: stat.mtimeMs })
      }
    }
  }
  walk(APK_DIR)
  if (found.length === 0) return null
  const newest = found.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]
  return { bytes: newest.bytes, mtimeMs: newest.mtimeMs }
}

function mtime(path: string): number | null {
  return existsSync(path) ? statSync(path).mtimeMs : null
}

function main(): void {
  const home = readHome()
  const devices = collectDevices(home.value)
  const distHash = hashIfExists(DIST_INDEX)
  const assetsHash = hashIfExists(ASSETS_INDEX)

  const probe: DeviceProbe = {
    androidHome: home.value,
    androidHomeExists: home.exists,
    adbAvailable: devices.available,
    onlineDevices: devices.online,
    hasDist: distHash !== null,
    hasAssets: assetsHash !== null,
    payloadMatches: distHash !== null && assetsHash !== null && distHash === assetsHash,
    apk: latestApk(),
    payloadMtimeMs: Math.max(mtime(DIST_INDEX) ?? 0, mtime(ASSETS_INDEX) ?? 0) || null,
  }

  const report = assessDeviceReport(probe)
  if (hasFlag('json')) {
    console.log(JSON.stringify({ probe, report }, null, 2))
  } else {
    console.log(formatDeviceReport(report))
  }
  if (!report.ok) process.exitCode = 1
}

main()
