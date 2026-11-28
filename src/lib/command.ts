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
  private groupHistory?: CommandManager

  clear() {
    this.commands.length = 0
    this.cursor = 0
  }

  group<T>(edit: () => T): T {
    const history = new CommandManager()
    const parent = this.groupHistory
    const undo = () => {
      while (history.cursor > 0) history.undo()
    }
    this.groupHistory = history
    let result: T
    try {
      result = edit()
    } catch (error) {
      undo()
      throw error
    } finally {
      this.groupHistory = parent
    }
    if (history.cursor) {
      this.execute({
        forward: () => {
          while (history.cursor < history.commands.length) history.redo()
        },
        backward: undo,
      })
    }
    return result
  }

  execute<T>(command: Command<T>): T {
    if (this.groupHistory) return this.groupHistory.execute(command)
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
