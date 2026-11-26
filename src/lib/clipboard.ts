import { encodePos, subPos, sumPos } from './geometry.js'
import type { Pos } from './geometry'
import type { Label, LabelTile } from './label'
import type { LabelManagerCommand } from './label.command'
import type { TilePiece } from './tilemap'
import { inBounds, selectPlan, type Plan, type SelectedLabel } from './selection.js'

type CopiedLabel = Pick<Label, 'name' | 'color' | 'fixed' | 'buildingType'> & { tiles: LabelTile[] }

export interface SelectionClipboard {
  tiles: TilePiece[]
  labels: CopiedLabel[]
  workshops: CopiedLabel[]
}

export function copySelection(
  plan: Plan,
  selection: Pos[],
  cut = false
): SelectionClipboard | undefined {
  const selected = selectPlan(plan, selection)
  if (!selected) return
  const { tilemap, labels, workshops } = plan
  const [x, y, z] = selected.boundary
  const origin: Pos = [x, y, z]

  function copyLabels(manager: LabelManagerCommand<Label>, parts: SelectedLabel[]) {
    return parts.map(({ label, tiles }) => {
      if (cut) manager.eraseTiles(label.id, (pos) => !!tiles[encodePos(pos)])
      return {
        name: label.name,
        buildingType: label.buildingType,
        color: label.color,
        fixed: label.fixed,
        tiles: Object.values(tiles).map((tile) => ({ ...tile, pos: subPos(tile.pos, origin) })),
      }
    })
  }

  return tilemap.commandManager.group(() => {
    const tiles = cut ? tilemap.removeDots(selected.positions) : tilemap.tilesAt(selected.positions)
    return {
      tiles: tiles.map((piece) => ({ ...piece, pos: subPos(piece.pos, origin) })),
      labels: copyLabels(labels, selected.labels),
      workshops: copyLabels(workshops, selected.workshops),
    }
  })
}

export function pasteSelection(
  { tilemap, labels, workshops }: Plan,
  clipboard: SelectionClipboard,
  cursor: Pos
): Pos[] {
  function placeTiles<T extends { pos: Pos }>(tiles: T[]) {
    return tiles
      .map((tile) => ({ ...tile, pos: sumPos(tile.pos, cursor) }))
      .filter(({ pos }) => inBounds(pos, tilemap.volume))
  }

  function pasteLabels(manager: LabelManagerCommand<Label>, copies: CopiedLabel[]) {
    for (const { tiles, ...label } of copies) {
      const placed = placeTiles(tiles)
      if (!placed.length || (label.fixed && placed.length !== tiles.length)) continue
      manager.add({
        ...label,
        tiles: Object.fromEntries(placed.map((tile) => [encodePos(tile.pos), tile])),
      })
    }
  }

  const tiles = placeTiles(clipboard.tiles)
  if (tiles.length) {
    tilemap.commandManager.group(() => {
      tilemap.putTiles(tiles)
      pasteLabels(labels, clipboard.labels)
      pasteLabels(workshops, clipboard.workshops)
    })
  }
  return tiles.map(({ pos }) => pos)
}
