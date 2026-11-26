import { expect, test } from 'vitest'

import { Tilemap, Tile } from './tilemap.js'
import { CommandManager } from './command.js'
import type { Pos } from './geometry'
import { TilemapCommand } from './tilemap.command.js'

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

test('tile queries clip to the map and keep rows in save order', () => {
  const map = new Tilemap([4, 3, 3])
  map.dig([3, 2, 0, 0, 0, 1])
  map.ramp([1, 1, 1, 0, 0, 0])
  map.channel([0, 1, 1, 0, 0, 0])
  map.channel([2, 0, 2, 0, 0, 0])

  expect(map.tiles([1, -1, 0, 5, 5, 1])).toEqual([
    { tile: Tile.Floor, pos: [3, 2, 0] },
    { tile: Tile.Ramp, pos: [1, 1, 1] },
    { tile: Tile.Floor, pos: [3, 2, 1] },
  ])
})

test('old fort tiles keep their floors when adding upper levels, resizing, and reloading', () => {
  const map = new Tilemap([2, 2, 100])
  map.deserialize(
    JSON.stringify({
      volume: [2, 2, 100],
      defaultTile: Tile.Wall,
      boundingQube: [1, 1, 7, 0, 0, 0],
      tilePieces: [{ pos: [1, 1, 7], tile: Tile.Channel }],
    })
  )
  map.dig([1, 1, -100, 0, 0, 0])
  map.ramp([1, 1, 100, 0, 0, 0])
  map.resize([3, 3, 101])
  map.deserialize(map.serialize())

  expect(map.tiles(map.boundingQube)).toEqual([
    { pos: [1, 1, -100], tile: Tile.Floor },
    { pos: [1, 1, 7], tile: Tile.Channel },
    { pos: [1, 1, 100], tile: Tile.Ramp },
  ])
})

test('character overlays follow overlapping selections, undo, and resizing', () => {
  const history = new CommandManager()
  const map = new TilemapCommand(history, [4, 4, 1])
  const a: Pos = [1, 1, -1]
  const b: Pos = [2, 1, -1]
  map.putTiles([
    { pos: a, tile: Tile.Floor, character: 'A' },
    { pos: b, tile: Tile.Wall, character: 'B' },
  ])
  const before = map.serialize()
  map.flip2d([a, b, a])
  expect(map.characterAt(a)).toBe('B')
  expect(map.characterAt(b)).toBe('A')
  history.undo()
  expect(map.tilesAt([a, b]).map(({ character }) => character)).toEqual(['A', 'B'])
  history.redo()
  map.resize([2, 2, 1])
  expect(map.characterAt(a)).toBe('B')
  expect(map.characterAt(b)).toBeUndefined()
  map.deserialize(before)
  expect(map.characterAt(b)).toBe('B')
})
