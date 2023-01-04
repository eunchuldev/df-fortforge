import type { Pos, Qube } from './geometry'
import { LabelManager } from './label.js'
import type { ID, LabelData } from './label'
import { encodePos } from './geometry.js'
import type { Label } from './label'
import type { CommandManager } from './command'

export class LabelManagerCommand<T extends Label> extends LabelManager<T> {
  command: CommandManager
  constructor(command: CommandManager) {
    super()
    this.command = command
  }
  setHotkey(hotkey: string, id: ID | null) {
    return this.command.execute({
      forward: () => super.setHotkey(hotkey, id),
      backward: (id: string | null) => super.setHotkey(hotkey, id),
    })
  }
  clearHotkey(hotkey: string): ID | null {
    return this.setHotkey(hotkey, null)
  }
  remove(id: string) {
    return this.command.execute({
      forward: () => super.remove(id),
      backward: ({ hotkey, label }) => {
        this.labels[id] = label
        if (hotkey) this.hotkeys[hotkey] = id
      },
    })
  }
  eraseArea(qube: Qube, id?: ID): Label[] {
    return this.command.execute({
      forward: () => super.eraseArea(qube, id),
      backward: (labels) => labels.forEach((label) => (this.labels[label.id] = label)),
    })
  }
  add(data: LabelData): T {
    return this.command.execute({
      forward: () => super.add(data),
      backward: (label) => super.remove(label.id),
    })
  }
  extendArea(id: string, qube: Qube): Pos[] {
    return this.command.execute({
      forward: () => super.extendArea(id, qube),
      backward: (tiles) => {
        const label = this.labels[id]
        for (const pos of tiles) {
          delete label.tiles[encodePos(pos)]
          label.tileCount -= 1
        }
        this.recalculateBoundary(id)
      },
    })
  }
}
