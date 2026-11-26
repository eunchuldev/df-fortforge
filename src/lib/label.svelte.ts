import type { Pos, Qube } from './geometry'
import { qubeIter, encodePos, collision, subPos } from './geometry.js'
import { v4 } from 'uuid'
import { randomColors } from '../lib/random-colors.js'
import { cyrb53 } from './crypto.js'

export type ID = string

const COLOR_SCHEME = randomColors({ count: 10, seed: 0 })

export interface LabelTile {
  pos: Pos
  passable?: boolean
  glyph?: string
}

export const LABEL_HOTKEYS: string[] = [
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
]

export interface Label {
  id: ID
  name: string
  buildingType?: string
  tiles: Record<string, LabelTile>
  tileCount: number
  boundary: [Pos, Pos]
  color: string
  fixed: boolean
}

export type LabelData = Omit<Label, 'id' | 'color' | 'fixed' | 'boundary' | 'tileCount'> &
  Partial<Pick<Label, 'color' | 'fixed'>>

type Boundary = [Pos, Pos]

export interface StockPile extends Label {
  __stock_pile__: never
}

function getBoundary(poses: Pos[]): Boundary {
  const boundary: Boundary = [
    [Infinity, Infinity, Infinity],
    [-Infinity, -Infinity, -Infinity],
  ]
  for (const pos of poses) {
    for (let i = 0; i < 3; ++i) {
      boundary[0][i] = Math.min(pos[i], boundary[0][i])
      boundary[1][i] = Math.max(pos[i], boundary[1][i])
    }
  }
  return boundary
}

export function labelArea(tiles: Label['tiles']) {
  const positions = Object.values(tiles).map((tile) => tile.pos)
  return { tiles, tileCount: positions.length, boundary: getBoundary(positions) }
}

export function labelQube({ boundary: [min, max] }: Label): Qube {
  return [...min, ...subPos(max, min)]
}

export class LabelManager<T extends Label> {
  labels = $state<Record<ID, Label>>({})
  hotkeys = $state<Record<string, ID | null>>(
    Object.fromEntries(LABEL_HOTKEYS.map((key) => [key, null]))
  )
  setHotkey(hotkey: string, id: ID | null): ID | null {
    const lastId = this.hotkeys[hotkey]
    this.hotkeys[hotkey] = id
    return lastId
  }
  clearHotkey(hotkey: string): ID | null {
    return this.setHotkey(hotkey, null)
  }
  remove(id: string) {
    const hotkeys = Object.keys(this.hotkeys).filter((key) => this.hotkeys[key] === id)
    for (const key of hotkeys) this.hotkeys[key] = null
    const label = this.labels[id]
    delete this.labels[id]
    return { label, hotkeys, hotkey: hotkeys[0] ?? null }
  }
  protected recalculateBoundary(id: ID) {
    const label = this.labels[id]
    if (label === undefined) return
    label.boundary = getBoundary(
      Object.values(label.tiles)
        .filter((pos) => pos)
        .map(({ pos }) => pos)
    )
  }
  eraseArea(qube: Qube, id?: ID): Label[] {
    const inArea = (pos: Pos) => collision([...pos, 0, 0, 0], qube)
    const labels = id ? [this.labels[id]] : this.labelsIntersectsWith(qube)
    const originals: Label[] = []
    for (const label of labels) {
      const original = this.eraseTiles(label.id, inArea)
      if (original) originals.push(original)
    }
    return originals
  }

  eraseTiles(id: ID, contains: (pos: Pos) => boolean): Label | undefined {
    const label = this.labels[id]
    const entries = Object.entries(label.tiles)
    const remaining = entries.filter(([, tile]) => !contains(tile.pos))
    if (remaining.length === entries.length) return
    if (label.fixed || !remaining.length) return this.remove(id).label
    return this.replaceTiles(id, Object.fromEntries(remaining))
  }

  replaceTiles(id: ID, tiles: Label['tiles']): Label {
    const label = this.labels[id]
    const original = { ...label }
    Object.assign(label, labelArea(tiles))
    return original
  }

  add(data: LabelData, id = v4()): T {
    const label: Label = {
      ...data,
      ...labelArea(data.tiles),
      id,
      color: data.color ?? COLOR_SCHEME[cyrb53(id) % COLOR_SCHEME.length],
      fixed: data.fixed ?? false,
    }
    this.labels[id] = label
    return this.labels[id] as T
  }

  extendArea(id: string, qube: Qube): Pos[] {
    const newTiles: Pos[] = []
    const label = this.labels[id]
    for (const pos of qubeIter(qube)) {
      if (!label.tiles[encodePos(pos)]) {
        label.tiles[encodePos(pos)] = { pos }
        label.tileCount += 1
        newTiles.push(pos)
      }
    }
    this.recalculateBoundary(id)
    return newTiles
  }
  get(id: ID): Label | undefined {
    return this.labels[id]
  }
  getLabels(): Label[] {
    return Object.values(this.labels)
  }
  getHotkeys(): Record<string, ID | null> {
    return this.hotkeys
  }
  labelsAt(pos: Pos): Label[] {
    const tileKey = encodePos(pos)
    return this.getLabels().filter((label) => label.tiles[tileKey])
  }
  serialize(): string {
    return JSON.stringify({
      labels: this.labels,
      hotkeys: this.hotkeys,
    })
  }
  deserialize(code: string) {
    const data = JSON.parse(code) as {
      labels: Record<ID, Label>
      hotkeys: Record<string, ID | null>
    }

    this.labels = data.labels
    this.hotkeys = data.hotkeys
  }
  labelsIntersectsWith(qube: Qube, preview?: ReadonlyMap<ID, Label>): Label[] {
    const labels = this.getLabels()
    const displayed = preview?.size ? labels.map((label) => preview.get(label.id) ?? label) : labels
    return displayed.filter((label) => collision(labelQube(label), qube))
  }
}
