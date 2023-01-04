import type { Pos, Qube } from './geometry'
import { qubeIter, encodePos, collision } from './geometry.js'
import { v4 } from 'uuid'
import { randomColors } from '../lib/random-colors.js'
import { cyrb53 } from './crypto.js'
import { deepCopy } from './deep-copy.js'

export type ID = string

const COLOR_SCHEME = randomColors({ count: 10, seed: 0 })

export interface LabelTile {
  pos: Pos
  passable?: boolean
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

export class LabelManager<T extends Label> {
  labels: Record<ID, Label> = {}
  hotkeys: Record<string, ID | null> = Object.fromEntries(LABEL_HOTKEYS.map((key) => [key, null]))
  setHotkey(hotkey: string, id: ID | null): ID | null {
    const lastId = this.hotkeys[hotkey]
    this.hotkeys[hotkey] = id
    return lastId
  }
  clearHotkey(hotkey: string): ID | null {
    return this.setHotkey(hotkey, null)
  }
  remove(id: string): { label: Label; hotkey: string | null } {
    const hotkey = Object.entries(this.hotkeys).find((entry) => entry[1] === id)?.[0] ?? null
    for (const key in this.hotkeys) if (this.hotkeys[key] === id) this.clearHotkey(key)
    const label = this.labels[id]
    delete this.labels[id]
    return { label, hotkey }
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
    const labels = id ? [this.labels[id]] : Object.values(this.labels)
    const updatedLabels: Set<string> = new Set()
    for (const pos of qubeIter(qube))
      for (const label of labels) if (label.tiles[encodePos(pos)]) updatedLabels.add(label.id)

    const originalLabels: Label[] = [...updatedLabels].map((id) => deepCopy(this.labels[id]))

    for (const pos of qubeIter(qube)) {
      for (const id of updatedLabels) {
        const label = this.labels[id]
        delete label.tiles[encodePos(pos)]
        label.tileCount -= 1
        if (label.tileCount === 0 || label.fixed) {
          delete this.labels[label.id]
          updatedLabels.delete(label.id)
        }
      }
    }
    for (const id of updatedLabels) this.recalculateBoundary(id)

    return originalLabels
  }

  add(data: LabelData): T {
    const id = v4()
    const tileEntries = Object.entries(data.tiles)
    const label: Label = {
      ...data,
      id,
      tileCount: tileEntries.length,
      boundary: getBoundary(tileEntries.map((v) => v[1].pos)),
      color: data.color ?? COLOR_SCHEME[cyrb53(id) % COLOR_SCHEME.length],
      fixed: data.fixed ?? false,
    }
    this.labels[id] = label
    return label as T
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
  get(id: ID): Label {
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
  labelsIntersectsWith(qube: Qube): Label[] {
    return this.getLabels().filter((label) =>
      collision(
        [
          ...label.boundary[0],
          ...label.boundary[1].map((e, i) => e - label.boundary[0][i]),
        ] as Qube,
        qube
      )
    )
  }
}
