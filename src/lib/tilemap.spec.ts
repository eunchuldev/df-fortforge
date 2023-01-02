import { expect, test } from 'vitest'

import { Tilemap, Tile } from './tilemap.js'

test('tilemap.tiles', () => {
  const tilemap = new Tilemap()

  tilemap.dig([10, 5, 7, 0, 0, 0])
  tilemap.ramp([11, 6, 7, 0, 0, 0])

  const res = [...tilemap.tiles([10, 5, 7, 2, 1, 0])]
  expect(res).toStrictEqual([
    {
      tile: Tile.Floor,
      pos: [10, 5, 7],
    },
    {
      tile: Tile.Ramp,
      pos: [11, 6, 7],
    },
  ])
})

test('tilemap.boundingQube', () => {
  const tilemap = new Tilemap()

  tilemap.dig([10, 5, 7, 0, 0, 0])
  tilemap.ramp([11, 6, 7, 0, 0, 0])

  const res = tilemap.boundingQube
  expect(res).toStrictEqual([10, 5, 7, 1, 1, 0])
})
