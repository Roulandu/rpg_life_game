import { isNativePlatform } from './native'

export type FileExportResult =
  | { ok: true; channel: 'native-share' | 'browser-download'; locationZh: string }
  | { ok: false; reason: 'canceled' | 'unavailable' | 'failed'; messageZh: string }

export async function exportTextFile(content: string, filename: string): Promise<FileExportResult> {
  if (!isNativePlatform()) return downloadInBrowser(content, filename)
  return shareNativeFile(content, filename)
}

/**
 * WebView 不接 `<a download>`，所以原生侧先真的写进缓存，再交给系统分享面板。
 * 缓存目录对 App 私有、无需权限；FileProvider 已把 cache-path 暴露给分享。
 */
async function shareNativeFile(content: string, filename: string): Promise<FileExportResult> {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  let uri: string
  try {
    uri = (
      await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      })
    ).uri
  } catch (error) {
    return { ok: false, reason: 'failed', messageZh: `写入缓存文件失败：${textOf(error)}` }
  }

  const { Share } = await import('@capacitor/share')
  try {
    await Share.share({ title: filename, dialogTitle: '保存存档', files: [uri] })
  } catch (error) {
    const message = textOf(error)
    if (/cancel/i.test(message)) {
      return { ok: false, reason: 'canceled', messageZh: '已取消分享，文件仍留在 App 缓存里。' }
    }
    if (/not available|no activity|unable to share/i.test(message)) {
      return { ok: false, reason: 'unavailable', messageZh: '这台设备没有可接收文件的应用，无法分享存档。' }
    }
    return { ok: false, reason: 'failed', messageZh: `分享失败：${message}` }
  }

  return { ok: true, channel: 'native-share', locationZh: `已生成 ${filename}，请在分享面板里保存或发送。` }
}

function downloadInBrowser(content: string, filename: string): FileExportResult {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { ok: true, channel: 'browser-download', locationZh: '存档已导出为 JSON 文件。' }
}

function textOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
