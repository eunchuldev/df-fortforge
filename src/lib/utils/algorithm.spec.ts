import { test, expect } from 'vitest'
import { Tilemap } from '../fortforge/tilemap.js'
import { decomposeIntoQubes, solveHSPBnB, solveHSPOpt2 } from './algorithm.js'
import type { Pos } from './geometry'

test('decomposeIntoQubes(tilemap)', () => {
  const tilemap = new Tilemap()

  tilemap.dig([10, 5, 7, 0, 1, 0])
  tilemap.ramp([9, 6, 6, 0, 1, 1])

  const res = decomposeIntoQubes({
    getTile: (pos: Pos) => tilemap.tileAt(pos),
    qube: tilemap.boundingQube,
    emptyTile: tilemap.defaultTile,
  })
  expect(res).toStrictEqual([
    {
      qube: [9, 6, 6, 0, 1, 1],
      tile: 3,
    },
    {
      qube: [10, 5, 7, 0, 1, 0],
      tile: 1,
    },
  ])
})

test('decomposeIntoQubes(tilemap, qube)', () => {
  const tilemap = new Tilemap()

  tilemap.dig([10, 5, 7, 0, 1, 0])
  tilemap.ramp([9, 6, 6, 0, 1, 1])

  const res = decomposeIntoQubes({
    getTile: (pos: Pos) => tilemap.tileAt(pos),
    qube: [9, 6, 6, 0, 1, 0],
    emptyTile: tilemap.defaultTile,
  })
  expect(res).toStrictEqual([
    {
      qube: [9, 6, 6, 0, 1, 0],
      tile: 3,
    },
  ])
})

test('decomposeIntoQubes(tilemap, preferVerticalQube)', () => {
  const tilemap = new Tilemap()

  tilemap.dig([3, 3, 4, 1, 1, 0])
  tilemap.dig([4, 4, 5, 0, 0, 0])

  const res = decomposeIntoQubes({
    getTile: (pos: Pos) => tilemap.tileAt(pos),
    qube: tilemap.boundingQube,
    emptyTile: tilemap.defaultTile,
    preferVerticalQube: true,
  })

  expect(res).toContainEqual({
    qube: [4, 4, 4, 0, 0, 1],
    tile: 1,
  })
})

test('solveHSPBnB', () => {
  const adjMat = [
    [Infinity, 9, 0],
    [2, Infinity, 9],
    [9, 1, Infinity],
  ]
  const res = solveHSPBnB(adjMat, 2)

  expect(res).toStrictEqual([2, 1, 0])
})

test('solveHSPOpt2', () => {
  const adjMat = [
    [Infinity, 9, 0],
    [2, Infinity, 9],
    [9, 1, Infinity],
  ]
  const res = solveHSPOpt2(adjMat, 2)

  expect(res).toStrictEqual([2, 1, 0])
})

test('solveHSPOpt2', () => {
  const adjMat = [
    [Infinity, 9, 100],
    [2, Infinity, 9],
    [9, 1, Infinity],
  ]
  const res = solveHSPOpt2(adjMat, 2)

  expect(res).toStrictEqual([2, 1, 0])
})
