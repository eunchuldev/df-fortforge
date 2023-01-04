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
