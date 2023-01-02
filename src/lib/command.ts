interface Command {
  forward: () => void
  backward: () => void
}

export class CommandManager {
  commands: Command[] = []
  cursor = 0
  execute(command: Command, merge = false) {
    command.forward()
    if (!merge) {
      this.commands[this.cursor] = command
      this.commands.length = this.cursor + 1
      this.cursor += 1
    } else {
      const lastCommand = this.commands[this.cursor - 1]
      this.commands[this.cursor - 1] = {
        forward: () => {
          lastCommand.forward()
          command.forward()
        },
        backward: () => {
          command.backward()
          lastCommand.backward()
        },
      }
    }
  }
  undo() {
    if (this.cursor > 0) {
      this.commands[this.cursor - 1].backward()
      this.cursor -= 1
    }
  }
  redo() {
    if (this.cursor < this.commands.length) {
      this.commands[this.cursor].forward()
      this.cursor += 1
    }
  }
}
