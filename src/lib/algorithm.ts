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
  preferWideQube = false,
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

        let expanding = true
        while (expanding) {
          expanding = false
          const dimensionOrder = preferVerticalQube ? [2, 0, 1] : [0, 1, 2]
          if (preferVerticalQube) {
            if (Math.random() > 0.5) {
              dimensionOrder[1] = 1 - dimensionOrder[1]
              dimensionOrder[2] = 1 - dimensionOrder[2]
            }
          } else if (preferWideQube) {
            if (Math.random() > 0.5) {
              dimensionOrder[0] = 1 - dimensionOrder[0]
              dimensionOrder[1] = 1 - dimensionOrder[1]
            }
          } else {
            dimensionOrder.sort(() => 0.5 - Math.random())
          }
          for (const n of dimensionOrder) {
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
                if (i < cover.qube[n] || i - cover.qube[n] > cover.qube[n + 3]) {
                  expanding = true
                }
                cover.qube[n] = Math.min(i, cover.qube[n])
                cover.qube[n + 3] = Math.max(i - cover.qube[n], cover.qube[n + 3])
              }
            }
            if (expanding && preferVerticalQube && n === dimensionOrder[0]) break
            else if (expanding && preferWideQube && n === dimensionOrder[1]) break
          }
        }
        if (cover) {
          covers.push(cover)
          cover = null
        }
      }
    }
  }
  return covers
}

/*
 * Solve Hamiltonian Shortest Path
 */
function _solveHSPBnB(
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
    if (adj[path[level - 1]][i] !== Infinity && adj[path[level - 1]][i] !== 0 && !visited[i]) {
      const nextWeight = weight + adj[path[level - 1]][i]
      const nextBound = bound - (sortedAdj[i][0] + sortedAdj[level - 1][level === 1 ? 0 : 1]) * 0.5
      if (nextBound + nextWeight < best.weight) {
        path[level] = i
        visited[i] = true
        _solveHSPBnB(
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

export function solveHSPBnB(adj: number[][], source = 0, shouldReturn = false) {
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
  _solveHSPBnB(sortedAdj, adj, V, bound, 0, 1, path, visited, shouldReturn, best)
  return best.path
}

export function solveHSPOpt2(adj: number[][], source = 0, shouldReturn = false) {
  const V = adj.length
  let path = [...Array(V).keys()]
    .map((v) => [v, Math.random()])
    .sort((a, b) => a[1] - b[1])
    .map((a) => a[0])
  const t = path.indexOf(source)
  path[t] = path[0]
  path[0] = source

  let swapped = true
  while (swapped) {
    swapped = false
    for (let i = 0; i <= V - 2; ++i) {
      for (let j = i + 1; j <= V - 1; ++j) {
        if (
          adj[path[i]][path[j]] +
            (j + 1 < V || shouldReturn ? adj[path[(i + 1) % V]][path[(j + 1) % V]] : 0) <
          adj[path[i]][path[(i + 1) % V]] +
            (j + 1 < V || shouldReturn ? adj[path[j]][path[(j + 1) % V]] : 0)
        ) {
          path = [
            ...path.slice(0, i + 1),
            ...path.slice(i + 1, j + 1).reverse(),
            ...path.slice(j + 1, V),
          ]
          swapped = true
        }
      }
    }
  }
  return path
}

function center2centerEqulaidan(p: Qube, q: Qube) {
  return Math.sqrt(
    Math.pow(p[0] + p[3] * 0.5 - q[0] - q[3] * 0.5, 2) +
      Math.pow(p[1] + p[4] * 0.5 - q[1] - q[4] * 0.5, 2) +
      Math.pow(p[2] + p[5] * 0.5 - q[2] - q[5] * 0.5, 2)
  )
}

export function planCoverRoute<T>(
  covers: Cover<T>[],
  startPos?: Pos,
  maxNeighbors = 0,
  distanceFn: (_p: Qube, _q: Qube) => number = center2centerEqulaidan
): Cover<T>[] {
  const V = covers.length
  if (V === 1) return covers

  const adjMat: number[][] = []
  for (let i = 0; i < V; ++i) {
    adjMat.push([])
    const p = covers[i].qube
    for (let j = 0; j < V; ++j) {
      const q = covers[j].qube
      adjMat[i][j] = distanceFn(p, q)
    }
  }

  for (let i = 0; i < V; ++i) adjMat[i][i] = Infinity

  if (maxNeighbors) {
    for (let i = 0; i < V; ++i) {
      const indices = [...new Array(V).keys()]
      indices.sort((j, k) => (adjMat[i][j] < adjMat[i][k] ? -1 : 1))
      indices.slice(maxNeighbors).forEach((j) => (adjMat[i][j] = Infinity))
    }
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
  if (V == 2) return [covers[startCoverIndex], covers[1 - startCoverIndex]]

  const route =
    V < 100 ? solveHSPBnB(adjMat, startCoverIndex) : solveHSPOpt2(adjMat, startCoverIndex)
  return route.map((i) => covers[i])
}
