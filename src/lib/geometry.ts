export type Pos = [number, number, number]
export type Pos2d = [number, number]
export type Line = [Pos, Pos]
export type Qube = [number, number, number, number, number, number]
export type Rect = [number, number, number, number]
export type Area = [number, number]
export type Volume = [number, number, number]

export function clampPos(pos: Pos, minpos: Pos, maxpos: Pos): Pos {
  return pos.map((p, i) => Math.min(Math.max(minpos[i], p), maxpos[i])) as Pos
}

export function clampQube(q: Qube, bound: Qube): Qube {
  const qubeStart = [Math.max(q[0], bound[0]), Math.max(q[1], bound[1]), Math.max(q[2], bound[2])]
  const qubeEnd = [
    Math.min(q[0] + q[3], bound[0] + bound[3]),
    Math.min(q[1] + q[4], bound[1] + bound[4]),
    Math.min(q[2] + q[5], bound[2] + bound[5]),
  ]
  return [
    qubeStart[0],
    qubeStart[1],
    qubeStart[2],
    qubeEnd[0] - qubeStart[0],
    qubeEnd[1] - qubeStart[1],
    qubeEnd[2] - qubeStart[2],
  ]
}

export function sumPos(p: Pos, q: Pos): Pos {
  return [p[0] + q[0], p[1] + q[1], p[2] + q[2]]
}
export function subPos(p: Pos, q: Pos): Pos {
  return [p[0] - q[0], p[1] - q[1], p[2] - q[2]]
}
export function subPos2d(p: Pos2d, q: Pos2d): Pos2d {
  return [p[0] - q[0], p[1] - q[1]]
}

export function distance(p: Pos, q: Pos) {
  return Math.sqrt(p.reduce((agg, p, i) => agg + Math.pow(p - q[i], 2), 0))
}

export function manhattanDistance(p: Pos, q: Pos) {
  return p.reduce((agg, p, i) => agg + Math.abs(p - q[i]), 0)
}

export function encodePos(pos: Pos) {
  return `${pos[0]},${pos[1]},${pos[2]}`
}

export function* qubeIter(qube: Qube): Iterable<Pos> {
  for (let i = qube[0]; i <= qube[0] + qube[3]; ++i)
    for (let j = qube[1]; j <= qube[1] + qube[4]; ++j)
      for (let k = qube[2]; k <= qube[2] + qube[5]; ++k) yield [i, j, k]
}

export function collision(p: Qube, q: Qube): boolean {
  for (let i = 0; i < 3; ++i) {
    if (p[i] + p[i + 3] < q[i]) return false
    else if (q[i] + q[i + 3] < p[i]) return false
  }
  return true
}

export function getBoundary(poses: Pos[]): Qube {
  const boundary = [
    [Infinity, Infinity, Infinity],
    [-Infinity, -Infinity, -Infinity],
  ]
  for (const pos of poses) {
    for (let i = 0; i < 3; ++i) {
      boundary[0][i] = Math.min(pos[i], boundary[0][i])
      boundary[1][i] = Math.max(pos[i], boundary[1][i])
    }
  }
  return <Qube>[...boundary[0], ...boundary[1].map((b, i) => b - boundary[0][i])]
}

export function rotate2d(pos: Pos2d, pivot: Pos2d, angle: number) {
  const [x, y] = subPos2d(pos, pivot)
  const sin = Math.sin(angle)
  const cos = Math.cos(angle)
  return [x * cos - y * sin + pivot[0], x * sin + y * cos + pivot[1]]
}
