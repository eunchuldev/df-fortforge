import type { Tilemap } from './tilemap.js'
import { Tile } from './tilemap.js'
import type { Cover } from './algorithm'
import { decomposeIntoQubes, planCoverRoute } from './algorithm.js'
import type { Qube, Pos } from './geometry'
import { manhattanDistance } from './geometry'
import { snakeCase } from 'change-case'

enum Command {
  OpenMineMenu = 'D_DESIGNATE_DIG',
  DesignateDig = 'DESIGNATE_DIG',
  DesignateRamp = 'DESIGNATE_RAMP',
  DesignateChannel = 'DESIGNATE_CHANNEL',
  DesignateStair = 'DESIGNATE_STAIR_UPDOWN',
  CursorDownZ = 'CURSOR_DOWN_Z',
  CursorUpZ = 'CURSOR_UP_Z',
  CursorRight = 'KEYBOARD_CURSOR_RIGHT',
  CursorLeft = 'KEYBOARD_CURSOR_LEFT',
  CursorDown = 'KEYBOARD_CURSOR_DOWN',
  CursorDownRight = 'KEYBOARD_CURSOR_DOWNRIGHT',
  CursorDownLeft = 'KEYBOARD_CURSOR_DOWNLEFT',
  CursorUp = 'KEYBOARD_CURSOR_UP',
  CursorUpRight = 'KEYBOARD_CURSOR_UPRIGHT',
  CursorUpLeft = 'KEYBOARD_CURSOR_UPLEFT',
  Select = 'SELECT',
  Escape = 'LEAVESCREEN',
  SetRectDrawMode = 'DESIGNATE_RECTANGLE',
  SetFreeDrawMode = 'DESIGNATE_FREE_DRAW',
}

enum DrawModeState {
  Free,
  Rect,
  Unknown,
}

enum OpenMenuState {
  Mine,
  Build,
  Nothing,
}

interface State {
  drawMode: DrawModeState
  menu: OpenMenuState
}

export function genMacro(
  macroName: string,
  tilemap: Tilemap,
  startPos: Pos = [0, 0, 0],
  qube?: Qube
): string {
  if (macroName !== snakeCase(macroName))
    throw Error(
      `The macro name '${macroName}' is not a snake case(suggestion: '${snakeCase(macroName)}').`
    )
  const state: State = {
    drawMode: DrawModeState.Unknown,
    menu: OpenMenuState.Nothing,
  }
  const commands: Command[] = []
  const nostairCovers = decomposeIntoQubes({
    getTile: (pos: Pos) => {
      const tile = tilemap.tileAt(pos)
      if ([Tile.UpStair, Tile.DownStair, Tile.UpDownStair].includes(tile))
        return tilemap.defaultTile
      else return tile
    },
    qube: qube ?? tilemap.boundingQube,
    emptyTile: tilemap.defaultTile,
  })
  const stairCovers = decomposeIntoQubes({
    getTile: (pos: Pos) => {
      let tile = tilemap.tileAt(pos)
      pos = [...pos]
      if ([Tile.UpStair, Tile.DownStair, Tile.UpDownStair].includes(tile)) {
        while (tile !== Tile.UpStair) {
          pos[2] -= 1
          tile = tilemap.tileAt(pos)
        }
        return pos[2]
      } else return -1
    },
    qube: qube ?? tilemap.boundingQube,
    emptyTile: -1,
    preferVerticalQube: true,
  }).map((t) => ({ ...t, tile: Tile.UpDownStair }))
  const routedCovers = planCoverRoute([...nostairCovers, ...stairCovers], startPos)
  let pos = startPos
  for (const cover of routedCovers) {
    pos = genCoverMacro(pos, cover, commands, state)
  }
  const macroText =
    macroName +
    '\n' +
    commands.map((command) => '\t\t' + command).join('\n\tEnd of group\n') +
    '\n\tEnd of group' +
    '\nEnd of macro\n'

  return macroText
}

function genCursorMacro(fpos: Pos, tpos: Pos, commands: Command[]) {
  const dist = [0, 1, 2].map((i) => tpos[i] - fpos[i]).map(Math.floor) as Pos
  while (dist[2] !== 0) {
    if (dist[2] > 0) {
      commands.push(Command.CursorDownZ)
      dist[2] -= 1
    } else {
      commands.push(Command.CursorUpZ)
      dist[2] += 1
    }
  }
  while (dist[0] !== 0 || dist[1] !== 0) {
    if (dist[0] > 0 && dist[1] > 0) {
      commands.push(Command.CursorDownRight)
      dist[0] -= 1
      dist[1] -= 1
    } else if (dist[0] < 0 && dist[1] > 0) {
      commands.push(Command.CursorDownLeft)
      dist[0] += 1
      dist[1] -= 1
    } else if (dist[0] < 0 && dist[1] < 0) {
      commands.push(Command.CursorUpLeft)
      dist[0] += 1
      dist[1] += 1
    } else if (dist[0] > 0 && dist[1] < 0) {
      commands.push(Command.CursorUpRight)
      dist[0] -= 1
      dist[1] += 1
    } else if (dist[0] === 0 && dist[1] < 0) {
      commands.push(Command.CursorUp)
      dist[1] += 1
    } else if (dist[0] === 0 && dist[1] > 0) {
      commands.push(Command.CursorDown)
      dist[1] -= 1
    } else if (dist[0] > 0 && dist[1] === 0) {
      commands.push(Command.CursorRight)
      dist[0] -= 1
    } else if (dist[0] < 0 && dist[1] === 0) {
      commands.push(Command.CursorLeft)
      dist[0] += 1
    } else throw Error('?')
  }
}

function genCoverMacro(
  pos: Pos,
  { tile, qube }: Cover<Tile>,
  commands: Command[],
  state: State
): Pos {
  if (state.menu === OpenMenuState.Nothing) {
    commands.push(Command.OpenMineMenu)
    state.menu = OpenMenuState.Mine
  } else if (state.menu !== OpenMenuState.Mine) {
    commands.push(Command.Escape, Command.OpenMineMenu)
    state.menu = OpenMenuState.Mine
  }
  if (state.drawMode !== DrawModeState.Rect) {
    commands.push(Command.SetRectDrawMode)
    state.drawMode = DrawModeState.Rect
  }

  const qubeCenter = [0, 1, 2].map((i) => qube[i] + qube[i + 3] * 0.5) as Pos
  let qubeStart = [0, 1, 2].map((i) =>
    pos[i] < qubeCenter[i] ? qube[i] : qube[i] + qube[i + 3]
  ) as Pos
  let qubeEnd = [0, 1, 2].map((i) =>
    pos[i] >= qubeCenter[i] ? qube[i] : qube[i] + qube[i + 3]
  ) as Pos
  if (manhattanDistance(qubeStart, pos) > manhattanDistance(qubeEnd, pos)) {
    const temp = qubeStart
    qubeStart = qubeEnd
    qubeEnd = temp
  }
  genCursorMacro(pos, qubeStart, commands)

  if (tile === Tile.Floor) {
    commands.push(Command.DesignateDig)
  } else if (tile === Tile.Ramp) {
    commands.push(Command.DesignateRamp)
  } else if (tile === Tile.Channel) {
    commands.push(Command.DesignateChannel)
  } else if ([Tile.UpStair, Tile.UpDownStair, Tile.DownStair].includes(tile)) {
    commands.push(Command.DesignateStair)
  }

  commands.push(Command.Select)
  genCursorMacro(qubeStart, qubeEnd, commands)
  commands.push(Command.Select)

  return qubeEnd
}
