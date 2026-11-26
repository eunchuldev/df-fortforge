import { expect, test } from 'vitest'
import { BUILDINGS, buildingFootprint, buildingGlyph } from './buildings.js'
import { copySelection, pasteSelection } from './clipboard.js'
import { CommandManager } from './command.js'
import { genMacro } from './df-macros.js'
import type { Label } from './label.js'
import { SimpleLabelManagerCommand } from './simple-label.command.js'
import { TilemapCommand } from './tilemap.command.js'
import { BuildingManagerCommand } from './workshop.command.js'

test('opposite corners place one undoable area, with individually selectable wall tiles', () => {
  const history = new CommandManager()
  const tilemap = new TilemapCommand(history, [12, 12, 3])
  const workshops = new BuildingManagerCommand(history)
  const plan = { tilemap, workshops, labels: new SimpleLabelManagerCommand(history) }
  tilemap.dig([2, 2, 0, 3, 0, 0])
  const macro = genMacro('hall', tilemap)

  const wall = BUILDINGS.get('Wall')!
  const footprint = buildingFootprint(wall, [2, 2, 0], [5, 3, 0])
  const area = workshops.placeBuilding(wall, footprint)
  expect(area.tileCount).toBe(8)
  expect(area.boundary).toEqual([
    [2, 2, 0],
    [5, 3, 0],
  ])
  history.undo()
  expect(workshops.getLabels()).toHaveLength(0)
  history.redo()
  workshops.get(area.id)!.name = 'East wall'

  const clipped = copySelection(plan, [[2, 3, 0]], true)!
  expect(workshops.get(area.id)?.tileCount).toBe(7)
  pasteSelection(plan, clipped, [4, 4, 0])
  expect(workshops.labelsAt([4, 4, 0])[0]).toMatchObject({
    name: 'East wall',
    buildingType: 'Wall',
    tileCount: 1,
  })
  const depot = BUILDINGS.get('Trade depot')!
  const depotArea = workshops.placeBuilding(depot, buildingFootprint(depot, [7, 7, 0]))
  expect(depotArea.tileCount).toBe(25)
  expect(copySelection(plan, [[7, 7, 0]])?.workshops).toHaveLength(0)
  const stairs = BUILDINGS.get('Stairs')!
  workshops.placeBuilding(stairs, buildingFootprint(stairs, [1, 1, 0], [1, 1, 2]))
  const topStep = copySelection(plan, [[1, 1, 0]])!
  pasteSelection(plan, topStep, [0, 1, 1])
  expect(workshops.labelsAt([0, 1, 1])[0].tiles['0,1,1'].glyph).toBe('>')
  expect(genMacro('hall', tilemap)).toBe(macro)
})

test('wall junctions use neighbors on their floor and bridges use their own edges', () => {
  const wall = BUILDINGS.get('Wall')!
  const footprint = buildingFootprint(wall, [1, 1, 0])
  const neighbors = new Set(['0,1,0', '2,1,0', '1,0,0', '1,2,1'])
  expect(buildingGlyph(wall, [1, 1, 0], footprint, neighbors)).toBe('╩')
  neighbors.add('1,2,0')
  expect(buildingGlyph(wall, [1, 1, 0], footprint, neighbors)).toBe('╬')
  const bridge = BUILDINGS.get('Bridge')!
  const deck = buildingFootprint(bridge, [3, 3, 0], [1, 1, 0])
  expect(buildingGlyph(bridge, [1, 1, 0], deck, neighbors)).toBe('╔')
  expect(buildingGlyph(bridge, [2, 2, 0], deck, neighbors)).toBe('+')
  expect(buildingGlyph(bridge, [3, 3, 0], deck, neighbors)).toBe('╝')
})

test('old workshop saves keep known glyphs and renamed workshop footprints', () => {
  const manager = new BuildingManagerCommand(new CommandManager())
  const hive = manager.buildWorkshop('Hive', [1, 1, 0])
  const loom = manager.buildWorkshop('Loom', [4, 4, 0])
  loom.name = 'Weaving room'
  const oldSave: { labels: Record<string, Label> } = JSON.parse(manager.serialize())
  for (const label of Object.values(oldSave.labels)) {
    delete label.buildingType
    label.fixed = false
  }
  manager.deserialize(JSON.stringify(oldSave))
  expect(manager.get(hive.id)).toMatchObject({ buildingType: 'Hive', fixed: true })
  expect(manager.get(loom.id)).toMatchObject({ name: 'Weaving room', tileCount: 9, fixed: true })
})
