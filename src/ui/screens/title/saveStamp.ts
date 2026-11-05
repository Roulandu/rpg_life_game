const pad = (value: number): string => String(value).padStart(2, '0')

/**
 * 存档行要能分辨同名存档，所以给出本地的「月-日 时:分」。
 * 放在界面侧而不是 src/lib：lib 与引擎共用，被确定性守卫禁止读墙上钟，而这里量的就是墙上钟。
 */
export function formatSavedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
