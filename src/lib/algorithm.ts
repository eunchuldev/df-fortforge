import type { Qube, Pos } from './geometry'

function encodePos(pos: Pos): string {
  return `${pos[0]},${pos[1]},${pos[2]}`
}

export interface Cover<T> {
  tile: T
  qube: Qube
}

export function inQube(pos: Pos, qube: Qube): boolean {
  return (
    pos[0] >= qube[0] &&
    pos[0] <= qube[0] + qube[3] &&
    pos[1] >= qube[1] &&
    pos[1] <= qube[1] + qube[4] &&
    pos[2] >= qube[2] &&
    pos[2] <= qube[2] + qube[5]
  )
}

/*
 * @example
 *
 * #: tiles
 * .: empty space
 *
 *
 * ##....
 * #####.
 * ..###.
 * ......
 *
 * ------------------
 *
 * ┌┐...
 * └┘┌─┐.
 * ..└─┘.
 * .....
 *
 * (decomposed into two tile covers)
 *
 */
interface DecomposeIntoQubesOptions<T> {
  getTile: (_pos: Pos) => T
  qube: Qube
  emptyTile: T
  preferVerticalQube?: boolean
  preferWideQube?: boolean
}

export function decomposeIntoQubes<T>({
  getTile,
  qube,
  emptyTile,
  preferVerticalQube = false,
}: DecomposeIntoQubesOptions<T>): Cover<T>[] {
  let cover: Cover<T> | null = null
  const covers: Cover<T>[] = []
  const done = new Set()
  for (let x = qube[0]; x <= qube[0] + qube[3]; ++x) {
    for (let y = qube[1]; y <= qube[1] + qube[4]; ++y) {
      for (let z = qube[2]; z <= qube[2] + qube[5]; ++z) {
        const pos: Pos = [x, y, z]
        const tile = getTile(pos)

        if (tile === emptyTile) done.add(encodePos(pos))

        if (done.has(encodePos(pos))) continue
        done.add(encodePos(pos))
        cover = { tile, qube: [...pos, 0, 0, 0] }

        let expanding = false
        do {
          expanding = false
          for (const n of preferVerticalQube ? [2, 0, 1] : [0, 1, 2]) {
            for (const i of [cover.qube[n] - 1, cover.qube[n] + cover.qube[n + 3] + 1]) {
              let expandable = true
              for (
                let j = cover.qube[(n + 1) % 3];
                j <= cover.qube[(n + 1) % 3] + cover.qube[((n + 1) % 3) + 3] && expandable;
                ++j
              ) {
                for (
                  let k = cover.qube[(n + 2) % 3];
                  k <= cover.qube[(n + 2) % 3] + cover.qube[((n + 2) % 3) + 3] && expandable;
                  ++k
                ) {
                  const pos: Pos = [0, 0, 0]
                  pos[n] = i
                  pos[(n + 1) % 3] = j
                  pos[(n + 2) % 3] = k
                  const neighborTile = getTile(pos)
                  if (!inQube(pos, qube) || done.has(encodePos(pos)) || neighborTile !== tile) {
                    expandable = false
                  }
                  if (
                    n !== 2 &&
                    preferVerticalQube &&
                    (getTile([pos[0], pos[1], pos[2] - 1]) === tile ||
                      getTile([pos[0], pos[1], pos[2] + 1]) === tile)
                  ) {
                    expandable = false
                  }
                }
              }
              if (expandable) {
                expanding = true
                for (
                  let j = cover.qube[(n + 1) % 3];
                  j <= cover.qube[(n + 1) % 3] + cover.qube[((n + 1) % 3) + 3] && expandable;
                  ++j
                ) {
                  for (
                    let k = cover.qube[(n + 2) % 3];
                    k <= cover.qube[(n + 2) % 3] + cover.qube[((n + 2) % 3) + 3] && expandable;
                    ++k
                  ) {
                    const pos: Pos = [0, 0, 0]
                    pos[n] = i
                    pos[(n + 1) % 3] = j
                    pos[(n + 2) % 3] = k
                    done.add(encodePos(pos))
                  }
                }
                cover.qube[n] = Math.min(i, cover.qube[n])
                cover.qube[n + 3] = Math.max(i - cover.qube[n], cover.qube[n + 3] + 1)
              }
            }
            if (expanding && preferVerticalQube) break
          }
        } while (expanding)
        covers.push(cover)
        cover = null
      }
    }
  }
  return covers
}

/*
 * Solve Hamiltonian Shortest Path
 */
function _solveHSP(
  sortedAdj: number[][],
  adj: number[][],
  V: number,
  bound: number,
  weight: number,
  level: number,
  path: number[],
  visited: boolean[],
  shouldReturn: boolean,
  best: { path: number[]; weight: number }
) {
  if (level === V) {
    if (shouldReturn) weight += adj[path[level - 1]][path[0]]
    if (weight < best.weight) {
      for (let i = 0; i < V; ++i) best.path[i] = path[i]
      if (shouldReturn) best.path[V] = path[0]
      best.weight = weight
    }
    return
  }
  for (let i = 0; i < V; ++i) {
    if (adj[path[level - 1]][i] !== 0 && !visited[i]) {
      const nextWeight = weight + adj[path[level - 1]][i]
      const nextBound = bound - (sortedAdj[i][0] + sortedAdj[level - 1][level === 1 ? 0 : 1]) * 0.5
      if (nextBound + nextWeight < best.weight) {
        path[level] = i
        visited[i] = true
        _solveHSP(
          sortedAdj,
          adj,
          V,
          nextBound,
          nextWeight,
          level + 1,
          path,
          visited,
          shouldReturn,
          best
        )
      }
      visited.fill(false)
      for (let j = 0; j < level; ++j) if (path[j] !== -1) visited[path[j]] = true
    }
  }
}

export function solveHSP(adj: number[][], source = 0, shouldReturn = false) {
  const V = adj.length
  let bound = 0
  const visited = <boolean[]>Array(V + (shouldReturn ? 1 : 0)).fill(false)
  const path = <number[]>Array(V + (shouldReturn ? 1 : 0)).fill(-1)
  const best = {
    weight: Infinity,
    path: Array(V).fill(-1) as number[],
  }
  for (let i = 0; i < V; ++i)
    bound += [...adj[i]]
      .sort()
      .slice(0, 2)
      .reduce((agg, i) => agg + i)
  bound = Math.ceil(bound * 0.5)
  visited[source] = true
  path[0] = source
  const sortedAdj: number[][] = adj.map((row) => [...row].sort())
  _solveHSP(sortedAdj, adj, V, bound, 0, 1, path, visited, shouldReturn, best)
  return best.path
}

export function planCoverRoute<T>(covers: Cover<T>[], startPos?: Pos): Cover<T>[] {
  const V = covers.length
  const adjMat: number[][] = []
  for (let i = 0; i < V; ++i) {
    adjMat.push([])
    const p = covers[i].qube
    for (let j = 0; j < V; ++j) {
      const q = covers[j].qube
      adjMat[i][j] = Math.sqrt(
        Math.pow(p[0] + p[3] * 0.5 - q[0] - q[3] * 0.5, 2) +
          Math.pow(p[1] + p[4] * 0.5 - q[1] - q[4] * 0.5, 2) +
          Math.pow(p[2] + p[5] * 0.5 - q[2] - q[5] * 0.5, 2)
      )
    }
  }
  for (let i = 0; i < V; ++i) {
    adjMat[i][i] = Infinity
  }
  let minDist = Infinity,
    startCoverIndex = 0
  if (startPos) {
    for (let i = 0; i < V; ++i) {
      const p = covers[i].qube
      const dist = Math.sqrt(
        Math.pow(p[0] + p[3] * 0.5 - startPos[0], 2) +
          Math.pow(p[1] + p[4] * 0.5 - startPos[1], 2) +
          Math.pow(p[2] + p[5] * 0.5 - startPos[2], 2)
      )

      if (dist < minDist) {
        minDist = dist
        startCoverIndex = i
      }
    }
  }
  const route = solveHSP(adjMat, startCoverIndex)
  return route.map((i) => covers[i])
}
