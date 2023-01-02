export type Pos = [number, number, number]
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

export function distance(p: Pos, q: Pos) {
  return Math.sqrt(p.reduce((agg, p, i) => agg + Math.pow(p - q[i], 2), 0))
}

export function manhattanDistance(p: Pos, q: Pos) {
  return p.reduce((agg, p, i) => agg + Math.abs(p - q[i]), 0)
}
