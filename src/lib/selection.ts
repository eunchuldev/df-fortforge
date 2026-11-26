import { clampPos, encodePos, getBoundary, inBounds, sumPos } from './geometry.js'
import type { Pos, Qube, Volume } from './geometry'
import { labelArea, labelQube, type Label } from './label.js'
import type { LabelManagerCommand } from './label.command'
import type { TilemapCommand } from './tilemap.command'

export { inBounds }

export interface Plan {
  tilemap: TilemapCommand
  labels: LabelManagerCommand<Label>
  workshops: LabelManagerCommand<Label>
}

export interface SelectedLabel {
  label: Label
  tiles: Label['tiles']
}

export interface PlanSelection {
  positions: Pos[]
  boundary: Qube
  labels: SelectedLabel[]
  workshops: SelectedLabel[]
}

export function selectPlan(
  { tilemap, labels, workshops }: Plan,
  selection: Pos[]
): PlanSelection | undefined {
  const selected = new Set<string>()
  const positions: Pos[] = []
  for (const pos of selection) {
    const key = encodePos(pos)
    if (!selected.has(key) && inBounds(pos, tilemap.volume)) {
      selected.add(key)
      positions.push(pos)
    }
  }
  if (!positions.length) return
  const boundary = getBoundary(positions)

  function selectedLabels(manager: LabelManagerCommand<Label>) {
    const parts: SelectedLabel[] = []
    for (const label of manager.labelsIntersectsWith(boundary)) {
      const tiles = Object.entries(label.tiles)
      const matches = tiles.filter(([key]) => selected.has(key))
      if (!matches.length || (label.fixed && matches.length !== tiles.length)) continue
      parts.push({
        label,
        tiles: matches.length === tiles.length ? label.tiles : Object.fromEntries(matches),
      })
    }
    return parts
  }

  return {
    positions,
    boundary,
    labels: selectedLabels(labels),
    workshops: selectedLabels(workshops),
  }
}

export function selectObject(label: Label, layer: 'labels' | 'workshops'): PlanSelection {
  return {
    positions: [],
    boundary: labelQube(label),
    labels: [],
    workshops: [],
    [layer]: [{ label, tiles: label.tiles }],
  }
}

export function previewMove(selection: PlanSelection, delta: Pos, volume: Volume) {
  if (!delta.some(Boolean)) return
  const [x, y, z, w, h, d] = selection.boundary
  const min: Pos = [-x, -y, -volume[2] - z]
  const max: Pos = [volume[0] - 1 - x - w, volume[1] - 1 - y - h, volume[2] - z - d]
  if (min.some((value, axis) => value > max[axis])) return
  const offset = clampPos(delta, min, max)
  if (!offset.some(Boolean)) return

  function movedLabels(parts: SelectedLabel[]) {
    const moved = new Map<string, Label>()
    for (const { label, tiles } of parts) {
      const result: Label['tiles'] = {}
      if (tiles !== label.tiles) {
        for (const [key, tile] of Object.entries(label.tiles)) {
          if (!(key in tiles)) result[key] = tile
        }
      }
      for (const tile of Object.values(tiles)) {
        const pos = sumPos(tile.pos, offset)
        result[encodePos(pos)] = { ...tile, pos }
      }
      moved.set(label.id, { ...label, ...labelArea(result) })
    }
    return moved
  }

  return {
    offset,
    labels: movedLabels(selection.labels),
    workshops: movedLabels(selection.workshops),
  }
}

export function applyMove(
  { tilemap, labels, workshops }: Plan,
  selection: PlanSelection,
  preview: NonNullable<ReturnType<typeof previewMove>>
): Pos[] {
  return tilemap.commandManager.group(() => {
    for (const label of preview.labels.values()) labels.replaceTiles(label.id, label.tiles)
    for (const workshop of preview.workshops.values())
      workshops.replaceTiles(workshop.id, workshop.tiles)
    return selection.positions.length
      ? tilemap.translate(selection.positions, preview.offset).map(({ pos }) => pos)
      : []
  })
}
