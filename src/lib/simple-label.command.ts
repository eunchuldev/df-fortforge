import type { Label, LabelTile } from './label.js'
import { LabelManagerCommand } from './label.command.js'
import { qubeIter, encodePos } from './geometry.js'
import type { Qube } from './geometry'

export interface SimpleLabel extends Label {
  __note__: never
}

export class SimpleLabelManagerCommand extends LabelManagerCommand<SimpleLabel> {
  addSimpleLabel(qube: Qube, name = 'Unnamed Label', color?: string): SimpleLabel {
    const tileEntries: [string, LabelTile][] = [...qubeIter(qube)].map((pos) => [
      encodePos(pos),
      { pos },
    ])
    const tiles: Record<string, LabelTile> = Object.fromEntries(tileEntries)
    return this.add({
      name,
      tiles,
      color,
    })
  }
}
