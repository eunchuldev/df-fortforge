export interface Command<T = unknown> {
  forward: () => T
  backward: (_: T) => void
}

export interface CommandWithResult<T = unknown> {
  forward: () => T
  res: T
  backward: (_: T) => void
}

export class CommandManager {
  commands: CommandWithResult<any>[] = []
  cursor = 0
  execute<T>(command: Command<T>): T {
    const res = command.forward()
    this.commands[this.cursor] = { ...command, res }
    this.commands.length = this.cursor + 1
    this.cursor += 1
    return res
  }
  undo() {
    if (this.cursor > 0) {
      this.commands[this.cursor - 1].backward(this.commands[this.cursor - 1].res)
      this.cursor -= 1
    }
  }
  redo() {
    if (this.cursor < this.commands.length) {
      this.commands[this.cursor].res = this.commands[this.cursor].forward()
      this.cursor += 1
    }
  }
}

const COMMAND = new CommandManager()

export function undo() {
  COMMAND.undo()
}
export function redo() {
  COMMAND.redo()
}

export function undoable<V = any, T = any, U extends any[] = any[]>(
  undo: (obj: V, args: U, result: T) => void
) {
  return function (
    _target: V,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(this: V, ...args: U) => T>
  ) {
    const fn = descriptor.value
    if (fn === undefined)
      throw Error('fail to implement undoable decorator: descriptor.value is empty')
    descriptor.value = function (this: V, ...args: U) {
      return COMMAND.execute({
        forward: () => fn.apply(this, args),
        backward: (result: T) => undo(this, args, result),
      })
    }
    return descriptor
  }
}
