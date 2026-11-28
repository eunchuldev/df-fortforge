import { expect, test } from 'vitest'
import { copySelection, pasteSelection } from './clipboard.js'
import { CommandManager } from './command.js'
import { qubeIter } from './geometry.js'
import type { Pos } from './geometry'
import { SimpleLabelManagerCommand } from './simple-label.command.js'
import { Tile } from './tilemap.js'
import { TilemapCommand } from './tilemap.command.js'
import { WorkshopManagerCommand } from './workshop.command.js'

function createPlan() {
  const history = new CommandManager()
  return {
    history,
    tilemap: new TilemapCommand(history, [12, 10, 4]),
    labels: new SimpleLabelManagerCommand(history),
    workshops: new WorkshopManagerCommand(history),
  }
}

test('paste copies sparse label areas and complete workshop footprints across levels', () => {
  const plan = createPlan()
  const { tilemap, labels, workshops, history } = plan
  const hall = labels.addSimpleLabel([2, 2, 0, 2, 0, 0], 'Hall', 'red')
  labels.extendArea(hall.id, [1, 1, 1, 0, 0, 0])
  labels.setHotkey('F1', hall.id)
  labels.addSimpleLabel([2, 2, 1, 0, 0, 0], 'Outside selection')
  const carpenter = workshops.buildWorkshop('Carpenter', [2, 2, 0])
  carpenter.name = 'Joinery'
  workshops.buildWorkshop('Still', [4, 2, 0])
  tilemap.ramp([2, 2, 0, 0, 0, 0])
  tilemap.channel([7, 5, 1, 0, 0, 0])
  const selection: Pos[] = [...qubeIter([1, 1, 0, 2, 2, 0]), [1, 1, 1], [2, 2, 0]]
  const beforeCopy = history.cursor
  const clipboard = copySelection(plan, selection)!
  expect(history.cursor).toBe(beforeCopy)
  hall.name = 'Renamed after copying'

  expect(pasteSelection(plan, clipboard, [6, 4, 1])).toHaveLength(10)
  const [copy] = labels.labelsAt([7, 5, 1])
  expect(copy).toMatchObject({
    name: 'Hall',
    color: 'red',
    tileCount: 3,
    boundary: [
      [6, 4, 1],
      [8, 5, 2],
    ],
    tiles: {
      '7,5,1': { pos: [7, 5, 1] },
      '8,5,1': { pos: [8, 5, 1] },
      '6,4,2': { pos: [6, 4, 2] },
    },
  })
  expect(copy.id).not.toBe(hall.id)
  expect(labels.hotkeys.F1).toBe(hall.id)
  expect(labels.labelsAt([7, 5, 2])).toEqual([])
  const [shop] = workshops.labelsAt([6, 4, 1])
  expect(shop).toMatchObject({
    name: 'Joinery',
    color: carpenter.color,
    tileCount: 9,
    boundary: [
      [6, 4, 1],
      [8, 6, 1],
    ],
    tiles: { '6,5,1': { passable: false }, '6,4,1': { passable: true } },
  })
  expect(workshops.getLabels()).toHaveLength(3)
  expect(tilemap.tileAt([7, 5, 1])).toBe(Tile.Ramp)

  history.undo()
  expect(labels.get(copy.id)).toBeUndefined()
  expect(workshops.get(shop.id)).toBeUndefined()
  expect(tilemap.tileAt([7, 5, 1])).toBe(Tile.Channel)
  history.redo()
  expect(labels.get(copy.id)?.name).toBe('Hall')
  expect(workshops.get(shop.id)?.tileCount).toBe(9)
  expect(tilemap.tileAt([7, 5, 1])).toBe(Tile.Ramp)

  pasteSelection(plan, clipboard, [0, 6, 0])
  expect(labels.labelsAt([1, 7, 0])[0].id).not.toBe(copy.id)
  expect(workshops.labelsAt([0, 6, 0])[0].id).not.toBe(shop.id)
  pasteSelection(plan, clipboard, [11, 0, 0])
  expect(workshops.labelsAt([11, 0, 0])).toEqual([])
  expect(labels.labelsAt([11, 0, 1])[0].tileCount).toBe(1)
  expect(tilemap.tileAt([0, 2, 0])).toBe(Tile.Wall)
})

test('cut and undo affect all selected layers together and preserve the rest of each label', () => {
  const plan = createPlan()
  const { tilemap, labels, workshops, history } = plan
  const hall = labels.addSimpleLabel([1, 1, 0, 2, 0, 0], 'Hall')
  const office = labels.addSimpleLabel([2, 1, 0, 0, 0, 0], 'Office')
  labels.setHotkey('F1', office.id)
  labels.setHotkey('F2', office.id)
  const hive = workshops.buildWorkshop('Hive', [2, 1, 0])
  const loom = workshops.buildWorkshop('Loom', [3, 1, 0])
  tilemap.putTiles([{ pos: [2, 1, 0], tile: Tile.Wall, character: 'H' }])
  tilemap.setAnnotation([2, 1, 0], 'memo', 'Check bee access')
  tilemap.dig([2, 1, 0, 0, 0, 0])

  const clipboard = copySelection(
    plan,
    [
      [2, 1, 0],
      [2, 1, 0],
    ],
    true
  )!
  expect(tilemap.tileAt([2, 1, 0])).toBe(Tile.Wall)
  expect(tilemap.characterAt([2, 1, 0])).toBeUndefined()
  expect(tilemap.memoAt([2, 1, 0])).toBeUndefined()
  expect(labels.get(hall.id)?.tileCount).toBe(2)
  expect(labels.labelsAt([2, 1, 0])).toEqual([])
  expect(labels.hotkeys).toMatchObject({ F1: null, F2: null })
  expect(workshops.labelsAt([2, 1, 0]).map((shop) => shop.id)).toEqual([loom.id])

  history.undo()
  expect(tilemap.tileAt([2, 1, 0])).toBe(Tile.Floor)
  expect(tilemap.characterAt([2, 1, 0])).toBe('H')
  expect(tilemap.memoAt([2, 1, 0])).toBe('Check bee access')
  expect(labels.get(hall.id)?.tileCount).toBe(3)
  expect(labels.get(office.id)?.name).toBe('Office')
  expect(labels.hotkeys).toMatchObject({ F1: office.id, F2: office.id })
  expect(workshops.get(hive.id)?.name).toBe('Hive')
  history.redo()
  expect(labels.labelsAt([2, 1, 0])).toEqual([])
  expect(workshops.get(hive.id)).toBeUndefined()
  expect(tilemap.tileAt([2, 1, 0])).toBe(Tile.Wall)
  pasteSelection(plan, clipboard, [8, 7, 1])
  expect(tilemap.tileAt([8, 7, 1])).toBe(Tile.Floor)
  expect(tilemap.characterAt([8, 7, 1])).toBe('H')
  expect(tilemap.memoAt([8, 7, 1])).toBe('Check bee access')
  expect(labels.labelsAt([8, 7, 1]).map((label) => label.name)).toEqual(['Hall', 'Office'])
  expect(workshops.labelsAt([8, 7, 1])[0].name).toBe('Hive')
})
