import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const OUT_DIR = 'public/icons'
const BG = [10, 13, 11]
const LIME = [201, 245, 107]
const SCALE = 4

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const PENTAGON = Array.from({ length: 5 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5
  return [Math.cos(angle) * 0.28, Math.sin(angle) * 0.28]
})

function inPolygon(x, y, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function pixel(x, y) {
  const radius = Math.hypot(x, y)
  if (radius <= 0.62) {
    if (inPolygon(x, y, PENTAGON)) return BG
    for (let i = 0; i < 5; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5
      const ax = Math.cos(angle) * 0.28
      const ay = Math.sin(angle) * 0.28
      const bx = Math.cos(angle) * 0.61
      const by = Math.sin(angle) * 0.61
      if (segmentDistance(x, y, ax, ay, bx, by) <= 0.032) return BG
    }
    return LIME
  }
  if (radius >= 0.7 && radius <= 0.735) return LIME
  return BG
}

function render(size) {
  const big = size * SCALE
  const rgba = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < SCALE; sy += 1) {
        for (let sx = 0; sx < SCALE; sx += 1) {
          const px = ((x * SCALE + sx + 0.5) / big - 0.5) * 2
          const py = ((y * SCALE + sy + 0.5) / big - 0.5) * 2
          const color = pixel(px, py)
          r += color[0]
          g += color[1]
          b += color[2]
        }
      }
      const index = (y * size + x) * 4
      const samples = SCALE * SCALE
      rgba[index] = Math.round(r / samples)
      rgba[index + 1] = Math.round(g / samples)
      rgba[index + 2] = Math.round(b / samples)
      rgba[index + 3] = 255
    }
  }
  return encodePng(size, size, rgba)
}

mkdirSync(OUT_DIR, { recursive: true })
for (const size of [192, 512]) {
  writeFileSync(`${OUT_DIR}/icon-${size}.png`, render(size))
}
writeFileSync(`${OUT_DIR}/apple-touch-icon.png`, render(180))

console.log('Generated PWA icons in', OUT_DIR)
