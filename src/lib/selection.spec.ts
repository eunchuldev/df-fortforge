import { expect, test } from 'vitest'
import { CommandManager } from './command.js'
import { qubeIter } from './geometry.js'
import { applyMove, previewMove, selectObject, selectPlan } from './selection.js'
import { SimpleLabelManagerCommand } from './simple-label.command.js'
import { TilemapCommand } from './tilemap.command.js'
import { Tile } from './tilemap.js'
import { WorkshopManagerCommand } from './workshop.command.js'

test('dragging an object or a mixed selection keeps its identity and commits the preview in one step', () => {
  const history = new CommandManager()
  const tilemap = new TilemapCommand(history, [8, 8, 3])
  const labels = new SimpleLabelManagerCommand(history)
  const workshops = new WorkshopManagerCommand(history)
  const plan = { tilemap, labels, workshops }
  const hall = labels.addSimpleLabel([1, 1, 0, 3, 0, 0], 'Hall', 'red')
  labels.extendArea(hall.id, [2, 1, 1, 0, 0, 0])
  labels.setHotkey('F1', hall.id)
  const shop = workshops.buildWorkshop('Carpenter', [2, 2, 0])
  const neighbor = workshops.buildWorkshop('Still', [4, 2, 0])
  tilemap.ramp([3, 1, 0, 0, 0, 0])
  tilemap.channel([4, 1, 0, 0, 0, 0])

  const object = selectObject(shop, 'workshops')
  const atEdge = previewMove(object, [20, 0, 1], tilemap.volume)!
  expect(atEdge.offset).toEqual([4, 0, 1])
  expect(workshops.labelsAt([1, 2, 0])[0].id).toBe(shop.id)
  applyMove(plan, object, atEdge)
  expect(workshops.get(shop.id)?.tiles['5,2,1']).toEqual({ pos: [5, 2, 1], passable: false })
  expect(workshops.labelsAt([1, 2, 0])).toEqual([])
  expect(tilemap.tileAt([3, 1, 0])).toBe(Tile.Ramp)
  expect(previewMove(selectObject(shop, 'workshops'), [1, 0, 0], tilemap.volume)).toBeUndefined()
  history.undo()
  expect(workshops.get(shop.id)?.tiles['1,2,0'].passable).toBe(false)

  const selection = selectPlan(plan, [...qubeIter([1, 1, 0, 2, 2, 0]), [3, 1, 0]])!
  const before = history.cursor
  const move = previewMove(selection, [1, 0, 0], tilemap.volume)!
  expect(move.labels.get(hall.id)?.tileCount).toBe(4)
  expect(hall.tileCount).toBe(5)
  expect(applyMove(plan, selection, move)).toHaveLength(9)
  expect(history.cursor).toBe(before + 1)
  expect(labels.get(hall.id)?.tiles['2,1,1']).toBeDefined()
  expect(labels.labelsAt([1, 1, 0])).toEqual([])
  expect(labels.hotkeys.F1).toBe(hall.id)
  expect(workshops.get(shop.id)?.boundary[0]).toEqual([2, 1, 0])
  expect(workshops.get(neighbor.id)?.boundary[0]).toEqual([3, 1, 0])
  expect(tilemap.tileAt([4, 1, 0])).toBe(Tile.Ramp)

  history.undo()
  expect(labels.get(hall.id)?.tileCount).toBe(5)
  expect(workshops.get(shop.id)?.boundary[0]).toEqual([1, 1, 0])
  expect(tilemap.tileAt([4, 1, 0])).toBe(Tile.Channel)
  history.redo()
  expect(labels.get(hall.id)?.tileCount).toBe(4)
  expect(workshops.get(shop.id)?.boundary[0]).toEqual([2, 1, 0])
  expect(tilemap.tileAt([4, 1, 0])).toBe(Tile.Ramp)
})
