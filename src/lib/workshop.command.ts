import { buildingFootprint, WORKSHOPS, type Building } from './buildings.js'
import { encodePos, qubeIter, type Pos, type Qube } from './geometry.js'
import { LabelManagerCommand } from './label.command.js'
import type { Label, LabelTile } from './label.js'

export function* buildingTiles(building: Building, footprint: Qube): Iterable<LabelTile> {
  const [left, top, z, , , depth] = footprint
  for (const pos of qubeIter(footprint)) {
    const blocked = building.impassables?.some(
      ([x, y]) => x === pos[0] - left && y === pos[1] - top
    )
    const tile: LabelTile = { pos, passable: !blocked }
    if (building.name === 'Stairs' && depth > 0) {
      if (pos[2] === z) tile.glyph = '>'
      else if (pos[2] === z + depth) tile.glyph = '<'
    }
    yield tile
  }
}

export class BuildingManagerCommand extends LabelManagerCommand<Label> {
  placeBuilding(building: Building, footprint: Qube) {
    const tiles = Object.fromEntries(
      Array.from(buildingTiles(building, footprint), (tile) => [encodePos(tile.pos), tile])
    )
    return this.add({
      name: building.name,
      buildingType: building.name,
      color: building.color,
      fixed: building.rectangle !== 'tiles',
      tiles,
    })
  }

  buildWorkshop(name: string, pos: Pos) {
    const workshop = WORKSHOPS[name]
    return this.placeBuilding(workshop, buildingFootprint(workshop, pos))
  }

  override deserialize(code: string) {
    super.deserialize(code)
    for (const building of this.getLabels()) {
      if (building.buildingType) continue
      // Older forts stored only the editable workshop name. Preserve renamed footprints too.
      building.fixed = true
      if (Object.hasOwn(WORKSHOPS, building.name)) building.buildingType = building.name
    }
  }
}

export { BuildingManagerCommand as WorkshopManagerCommand }
