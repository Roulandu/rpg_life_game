export function SettingsFooter({ engineVersion }: { engineVersion: string }) {
  return (
    <p className="px-1 text-center text-[10px] leading-relaxed text-dim">
      绿茵人生 · engine v{engineVersion}
      <br />
      非官方作品，与任何真实联赛、俱乐部或机构无关。
    </p>
  )
}
