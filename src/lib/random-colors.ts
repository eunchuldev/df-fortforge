function hsv2rgb(h: number, s: number, v: number): number[] {
  const h_i = Math.floor(h * 6)
  const f = h * 6 - h_i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  switch (h_i) {
    case 0:
      return [v, t, p]
    case 1:
      return [q, v, p]
    case 2:
      return [p, v, t]
    case 3:
      return [p, q, v]
    case 4:
      return [t, p, q]
    case 5:
      return [v, p, q]
  }
}

function rgb2hex(rgb: number[]): string {
  return (
    '#' +
    rgb
      .map((x) => {
        const hex = Math.floor(x * 256).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

export interface Options {
  count: number
  s?: number
  v?: number
  seed?: number
}

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomColors(options: Options): string[] {
  const h = mulberry32(options.seed ?? Math.random())()
  return [...Array(options.count).keys()].map((i) =>
    rgb2hex(hsv2rgb((h + i * 0.618033988749895) % 1, options.s ?? 0.3, options.v ?? 0.95))
  )
}
