<script lang="ts">
  import { Tile, Tilemap, tileToString } from '../lib/tilemap.js'
  import { hotkey } from '../lib/svelte-actions/hotkey.js'
  import { v4 } from 'uuid'
  import Modal from './Modal.svelte'
  import Dropdown from './Dropdown.svelte'
  import Minimap from './Minimap.svelte'
  import { snakeCase } from 'change-case'
  import { CommandManager } from '../lib/command.js'
  import { version, supportDFVersion, build } from '../lib/constants.js'
  import Icon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import FortIcon from '@iconify-icons/fa-brands/fort-awesome-alt'
  import { randomColors } from '../lib/random-colors.js'
  //import FortIcon from '@iconify-icons/mdi/castle';
  import SaveAsIcon from '@iconify-icons/mdi/download'
  import UploadIcon from '@iconify-icons/mdi/upload'
  import AbandonIcon from '@iconify-icons/mdi/close'
  import GenMacroIcon from '@iconify-icons/mdi/creation'
  import DigIcon from '@iconify-icons/mdi/pickaxe'
  import MineIcon from '@iconify-icons/game-icons/dig-dug'
  import EraseIcon from '@iconify-icons/mdi/eraser'
  import StairIcon from '@iconify-icons/mdi/stairs'
  import MoreIcon from '@iconify-icons/mdi/dots-vertical'
  import ResizeIcon from '@iconify-icons/mdi/arrow-expand'
  import HotkeysIcon from '@iconify-icons/mdi/keyboard'
  import RampIcon from '@iconify-icons/mdi/image-filter-hdr'
  import ChannelIcon from '@iconify-icons/mdi/shovel'
  import FreeDrawIcon from '@iconify-icons/mdi/brush'
  import RectDrawIcon from '@iconify-icons/mdi/vector-rectangle'
  import SelectIcon from '@iconify-icons/mdi/select'
  import CopyIcon from '@iconify-icons/mdi/content-copy'
  import CutIcon from '@iconify-icons/mdi/content-cut'
  import PasteIcon from '@iconify-icons/mdi/content-paste'
  import RotateCWIcon from '@iconify-icons/mdi/reload'
  import RotateCCWIcon from '@iconify-icons/mdi/restore'
  import FlipHorizIcon from '@iconify-icons/mdi/flip-horizontal'
  import FlipVertIcon from '@iconify-icons/mdi/flip-vertical'
  import UndoIcon from '@iconify-icons/mdi/undo'
  import RedoIcon from '@iconify-icons/mdi/redo'
  import GithubIcon from '@iconify-icons/mdi/github'
  import AboutIcon from '@iconify-icons/mdi/information'
  import LabelIcon from '@iconify-icons/mdi/label'
  import DeleteIcon from '@iconify-icons/mdi/delete-outline'
  import DeleteForeverIcon from '@iconify-icons/mdi/delete-forever-outline'
  import CloseIcon from '@iconify-icons/mdi/close'

  import { genFortressName } from '../lib/df-name-gen.js'
  import { genMacro } from '../lib/df-macros.js'

  import type { Pos, Qube, Area, Volume } from '../lib/geometry'
  import { encodePos, qubeIter } from '../lib/geometry.js'
  import { deepCopy } from '../lib/deep-copy.js'

  enum Action {
    DesignateMine,
    RemoveDesignation,

    DesignateDig,
    DesignateRamp,
    DesignateChannel,
    DesignateStairs,

    Label,
    EraseLabelArea,
    PickLabelOfHotkey,

    GFMacro,
    PickGFMacroStartPoint,
    SaveGFMacro,

    Select,
  }

  enum DrawMode {
    Rectangle,
    Free,
  }
  enum DrawRectStage {
    StandBy,
    Drawing,
  }
  enum Modals {
    None,
    GenDFMacro,
    ResizeTilemap,
    ShowUsefulHotkeys,
    DownloadFort,
    About,
  }
  interface ActionState {
    level1: Action | null
    level2: Action | null
    drawMode: DrawMode
    drawRect: Qube
    drawRectStage: DrawRectStage
  }

  const ALLOWED_DRAW_MODES: Partial<Record<Action, DrawMode[]>> = {
    [Action.DesignateDig]: [DrawMode.Rectangle, DrawMode.Free],
    [Action.DesignateRamp]: [DrawMode.Rectangle, DrawMode.Free],
    [Action.DesignateChannel]: [DrawMode.Rectangle, DrawMode.Free],
    [Action.RemoveDesignation]: [DrawMode.Rectangle, DrawMode.Free],
    [Action.DesignateStairs]: [DrawMode.Rectangle],
    [Action.DesignateMine]: [DrawMode.Rectangle, DrawMode.Free],
    [Action.Select]: [DrawMode.Rectangle, DrawMode.Free],
    [Action.Label]: [DrawMode.Rectangle, DrawMode.Free],
    [Action.EraseLabelArea]: [DrawMode.Rectangle, DrawMode.Free],
  }
  const ACTION_PARENT: Partial<Record<Action, Action>> = {
    [Action.DesignateDig]: Action.DesignateMine,
    [Action.DesignateRamp]: Action.DesignateMine,
    [Action.DesignateChannel]: Action.DesignateMine,
    [Action.DesignateStairs]: Action.DesignateMine,
    [Action.Label]: Action.Label,
    [Action.EraseLabelArea]: Action.Label,
    [Action.PickLabelOfHotkey]: Action.Label,
    [Action.PickGFMacroStartPoint]: Action.GFMacro,
    [Action.SaveGFMacro]: Action.GFMacro,
  }

  const LABEL_HOTKEY_LIST = [
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

  export let tileWidth = 32

  let fortName = genFortressName()

  const tilemapVolume: Volume = [100, 100, 100]

  let commandManager = new CommandManager()

  let tilemap: Tilemap = new Tilemap(tilemapVolume)
  let action: ActionState = {
    level1: null,
    level2: null,
    drawMode: DrawMode.Rectangle,
    drawRect: [0, 0, 0, 0, 0, 0] as Qube,
    drawRectStage: DrawRectStage.StandBy,
  }

  $: if (ACTION_PARENT[action.level2] !== action.level1) {
    action.level2 = null
  }
  $: if (
    ALLOWED_DRAW_MODES[action.level2 ?? action.level1] &&
    !ALLOWED_DRAW_MODES[action.level2 ?? action.level1].includes(action.drawMode)
  ) {
    action.drawMode = ALLOWED_DRAW_MODES[action.level2 ?? action.level1][0]
  }

  /*  let drawMode: 'Brush' | 'Qube' = 'Qube'; */
  let cursor: Pos = [Math.floor(tilemapVolume[0] * 0.5), Math.floor(tilemapVolume[1] * 0.5), 0]
  let screenQube: Qube = [0, 0, 0, 100, 100, 0]
  let containerPixelArea: Area = [0, 0]
  let lastSavedAt: Date
  let dfMacroText = ''
  let openedModal: Modals = Modals.None
  let shiftKey = false
  let ctrlKey = false
  let altKey = false
  $: screenQube[3] = Math.ceil(containerPixelArea[0] / tileWidth)
  $: screenQube[4] = Math.ceil(containerPixelArea[1] / tileWidth)

  const colorScheme = randomColors({ count: 10, seed: 0 })

  interface Label {
    id: string
    name: string
    tileSet: Record<string, Pos>
    tileCount: number
    boundary: [Pos, Pos]
    hotkey: string
    color: string
  }
  let labels: Label[] = []
  let labelHotkeys: Record<typeof LABEL_HOTKEY_LIST[number], Label | null> = Object.fromEntries(
    LABEL_HOTKEY_LIST.map((key) => [key, null])
  )
  let focusLabel: Label | null = null

  let setWaitingHotkey = ''

  $: if (tilemap && fortName && labels) saveLastState()

  interface State {
    tilemap: string
    labels: Label[]
    fortName: string
    cursor: Pos
    screenQube: Qube
    savedAt: string
    tileWidth: number
  }

  loadLastState()

  function setState(state: State) {
    tilemap.deserialize(state.tilemap)
    fortName = state.fortName ?? fortName
    cursor = state.cursor ?? cursor
    screenQube = state.screenQube ?? screenQube
    lastSavedAt = state.savedAt ? new Date(state.savedAt) : new Date()
    tilemap = tilemap
    tileWidth = state.tileWidth ?? tileWidth
    labels = state.labels ?? []
    labelHotkeys = Object.fromEntries(
      LABEL_HOTKEY_LIST.map((key) => [key, labels.find((label) => label.hotkey === key)])
    )
  }

  function getState(): State {
    return {
      tilemap: tilemap.serialize(),
      fortName,
      cursor,
      screenQube,
      savedAt: new Date().toISOString(),
      labels,
      tileWidth,
    }
  }

  function loadLastState() {
    try {
      if (localStorage.getItem('state')) {
        let state: State = JSON.parse(localStorage.getItem('state')) as State
        setState(state)
      }
      tilemap = tilemap
    } catch (e) {
      alert('fail to load last state')
    }
  }

  function saveLastState() {
    let state = getState()
    localStorage.setItem('state', JSON.stringify(state))
    lastSavedAt = new Date(state.savedAt)
  }

  function abandonFortress() {
    if (confirm('Really Abandon Your Fortress?')) {
      tilemap = new Tilemap(tilemapVolume)
      cursorAt(Math.floor(tilemapVolume[0] * 0.5), Math.floor(tilemapVolume[1] * 0.5), 0)
      screenQube[0] = Math.floor(cursor[0] - screenQube[3] * 0.5)
      screenQube[1] = Math.floor(cursor[1] - screenQube[4] * 0.5)
    }
  }

  function updateScreenQube() {
    const cursorRelativeX = cursor[0] - screenQube[0]
    const cursorRelativeY = cursor[1] - screenQube[1]
    if (cursorRelativeX < 0) screenQube[0] += cursorRelativeX
    else if (cursorRelativeX + 1 >= screenQube[3])
      screenQube[0] += cursorRelativeX + 1 - screenQube[3]
    if (cursorRelativeY < 0) screenQube[1] += cursorRelativeY
    else if (cursorRelativeY + 1 >= screenQube[4])
      screenQube[1] += cursorRelativeY + 1 - screenQube[4]
    screenQube[2] = cursor[2]
  }
  function updateDrawRect() {
    if (action.drawRectStage === DrawRectStage.Drawing) {
      for (let i = 0; i < 3; ++i) action.drawRect[i + 3] = cursor[i] - action.drawRect[i]
    }
  }
  function clampPos(pos: Pos | Qube) {
    pos[0] = Math.min(Math.max(pos[0], 0), tilemap.volume[0])
    pos[1] = Math.min(Math.max(pos[1], 0), tilemap.volume[1])
    pos[2] = Math.min(Math.max(pos[2], 0), tilemap.volume[2])
    return pos
  }
  function cursorAt(x: number, y: number, z: number) {
    if (x !== cursor[0] || y !== cursor[1] || z !== cursor[2]) {
      cursor[0] = x
      cursor[1] = y
      cursor[2] = z
      clampPos(cursor)
      updateScreenQube()
      updateDrawRect()
    }
  }
  function cursorBy(x: number, y: number, z: number) {
    cursor[0] += x
    cursor[1] += y
    cursor[2] += z
    clampPos(cursor)
    updateScreenQube()
    updateDrawRect()
  }
  function panBy(pos: Pos) {
    for (let i = 0; i < 3; ++i) {
      if (cursor[i] + pos[i] >= 0 && cursor[i] + pos[i] <= tilemap.volume[i]) {
        cursor[i] += pos[i]
        screenQube[i] += pos[i]
      }
    }
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button === 0) if (execute()) e.preventDefault()
  }
  function onMouseRightClick(e: MouseEvent) {
    if (escape()) e.preventDefault()
  }
  function onMouseUp() {
    if (movingSelectionState.isMoving) {
      stopMoveSelection()
    }
  }
  function onWheel(e: WheelEvent) {
    if (e.deltaY > 0) cursorBy(0, 0, 1)
    else cursorBy(0, 0, -1)
  }
  function onMouseMove(e: MouseEvent) {
    let cursorPos: Pos = [
      Math.floor(e.offsetX / tileWidth) + screenQube[0],
      Math.floor(e.offsetY / tileWidth) + screenQube[1],
      screenQube[2],
    ]
    cursorAt(...cursorPos)
    updateDrawRect()
    if (movingSelectionState.isMoving) {
      e.preventDefault()
    }
  }

  let movingSelectionState = {
    isMoving: false as boolean,
    tiles: [] as { tile: Tile; pos: Pos }[],
    lastCursor: [0, 0, 0] as Pos,
  }
  function startMoveSelection() {
    if (!movingSelectionState.isMoving) {
      movingSelectionState.isMoving = true
      //movingSelectionState.pivot = cursor.map((v, i) => v - selectionBoundary[0][i]) as Pos;
      movingSelectionState.tiles = selection.map((pos) => ({ pos, tile: tilemap.tileAt(pos) }))
      movingSelectionState.lastCursor = [...cursor]
    }
  }
  function stopMoveSelection() {
    movingSelectionState.isMoving = false
    const targetTiles = movingSelectionState.tiles.map(({ pos, tile }) => ({
      pos: pos.map((p, i) => p + cursor[i] - movingSelectionState.lastCursor[i]) as Pos,
      tile,
    }))
    const targetOriginalTiles = targetTiles.map(({ pos }) => ({ pos, tile: tilemap.tileAt(pos) }))
    const sourceTiles = movingSelectionState.tiles

    commandManager.execute({
      forward: () => {
        sourceTiles.map(({ pos }) => {
          tilemap.dot(tilemap.defaultTile, pos)
        })
        targetTiles.map(({ pos, tile }) => {
          tilemap.dot(tile, pos)
        })
      },
      backward: () => {
        targetOriginalTiles.map(({ pos, tile }) => {
          tilemap.dot(tile, pos)
        })
        sourceTiles.map(({ pos, tile }) => {
          tilemap.dot(tile, pos)
        })
      },
    })

    clearSelection()
    targetTiles.map(({ pos }) => {
      selectPos(pos)
    })

    tilemap = tilemap
  }

  function setLabelHotkey(hotkey: string, label: Label) {
    if (labelHotkeys[hotkey]) labelHotkeys[hotkey].hotkey = ''
    labelHotkeys[hotkey] = label
    if (label.hotkey && label.hotkey !== hotkey) {
      labelHotkeys[label.hotkey] = null
    }
    label.hotkey = hotkey
    labels = labels
  }
  function removeLabelHotkey(hotkey: string) {
    if (labelHotkeys[hotkey]) labelHotkeys[hotkey].hotkey = ''
    labelHotkeys[hotkey] = null
    labels = labels
  }
  function followLabel(label: Label) {
    const center = [...Array(3).keys()]
      .map((i) => 0.5 * (label.boundary[0][i] + label.boundary[1][i]))
      .map(Math.floor)
    for (let i = 0; i < 3; ++i) {
      cursor[i] = center[i]
    }
    screenQube[2] = cursor[2]
    for (let i = 0; i < 2; ++i) {
      screenQube[i] = Math.floor(cursor[i] - screenQube[i + 3] * 0.5)
    }
  }

  function removeLabel(id: string) {
    let index = labels.findIndex((label) => label.id === id)
    if (index >= 0) {
      if (labels[index].hotkey) labelHotkeys[labels[index].hotkey] = null
      labels.splice(index, 1)
    }
    labels = labels
  }
  function eraseLabelArea(qube: Qube) {
    let originalLabels: Record<string, Label> = {}
    let changedLabels: Record<string, Label> = {}
    let removedLabels: string[] = []
    for (let pos of qubeIter(qube)) {
      for (let label of labels) {
        if (label.tileSet[encodePos(pos)]) {
          if (!changedLabels[label.id]) {
            changedLabels[label.id] = deepCopy(label)
            originalLabels[label.id] = deepCopy(label)
          }
          changedLabels[label.id].tileSet[encodePos(pos)] = undefined
          delete changedLabels[label.id].tileSet[encodePos(pos)]
          changedLabels[label.id].tileCount -= 1
          if (changedLabels[label.id].tileCount === 0) removedLabels.push(label.id)
        }
      }
    }

    for (const label of Object.values(changedLabels)) {
      label.boundary = [
        [Infinity, Infinity, Infinity],
        [0, 0, 0],
      ]
      Object.values(label.tileSet).forEach((pos) => {
        for (let i = 0; i < 3; ++i) {
          label.boundary[0][i] = Math.min(pos[i], label.boundary[0][i])
          label.boundary[1][i] = Math.max(pos[i], label.boundary[1][i])
        }
      })
    }

    commandManager.execute({
      forward: () => {
        for (let newLabel of Object.values(changedLabels)) {
          Object.assign(
            labels.find((label) => label.id === newLabel.id),
            newLabel
          )
        }
        for (let id of removedLabels) {
          let index = labels.findIndex((label) => label.id === id)
          if (index >= 0) {
            labels.splice(index, 1)
          }
        }
        labels = labels
      },
      backward: () => {
        for (let newLabel of Object.values(originalLabels)) {
          let oldLabel = labels.find((label) => label.id === newLabel.id)
          if (oldLabel) Object.assign(oldLabel, newLabel)
          else labels.push(deepCopy(newLabel))
        }
        labels = labels
      },
    })
  }
  function addLabel(qube: Qube) {
    let lastLabel = shiftKey ? focusLabel : null
    let lastLabelClone = lastLabel ? deepCopy(focusLabel) : null
    let newLabel: Label = lastLabel
      ? deepCopy(lastLabel)
      : {
          name: 'Unnamed Label',
          boundary: [
            [qube[0], qube[1], qube[2]],
            [qube[0] + qube[3], qube[1] + qube[4], qube[2] + qube[5]],
          ],
          tileSet: {},
          tileCount: 0,
          color: colorScheme[labels.length],
          hotkey: '',
          id: v4(),
        }

    for (let pos of qubeIter(qube)) {
      if (!newLabel.tileSet[encodePos(pos)]) {
        newLabel.tileSet[encodePos(pos)] = pos
        newLabel.tileCount += 1
        for (let i = 0; i < 3; ++i) {
          newLabel.boundary[0][i] = Math.min(pos[i], newLabel.boundary[0][i])
          newLabel.boundary[1][i] = Math.max(pos[i], newLabel.boundary[1][i])
        }
      }
    }

    commandManager.execute({
      forward: () => {
        if (!lastLabel) {
          labels.push(newLabel)
        } else {
          Object.assign(lastLabel, newLabel)
        }
        labels = labels
      },
      backward: () => {
        if (lastLabel)
          Object.assign(
            labels.find((label) => label.id === newLabel.id),
            lastLabelClone
          )
        else
          labels.splice(
            labels.findIndex((label) => label.id === newLabel.id),
            1
          )
        labels = labels
      },
    })
    focusLabel = lastLabel
  }

  function executeAction(action: Action, qube: Qube): boolean {
    let executing = true
    switch (action) {
      case Action.DesignateMine:
      case Action.DesignateDig: {
        let lastTiles = [...tilemap.tiles(qube)]
        commandManager.execute({
          forward: () => tilemap.dig(qube),
          backward: () => {
            tilemap.remove(qube)
            lastTiles.forEach(({ tile, pos }) => tilemap.dot(tile, pos))
          },
        })
        break
      }
      case Action.DesignateRamp: {
        let lastTiles = [...tilemap.tiles(qube)]
        commandManager.execute({
          forward: () => tilemap.ramp(qube),
          backward: () => {
            tilemap.remove(qube)
            lastTiles.forEach(({ tile, pos }) => tilemap.dot(tile, pos))
          },
        })
        break
      }
      case Action.DesignateChannel: {
        let lastTiles = [...tilemap.tiles(qube)]
        commandManager.execute({
          forward: () => tilemap.channel(qube),
          backward: () => {
            tilemap.remove(qube)
            lastTiles.forEach(({ tile, pos }) => tilemap.dot(tile, pos))
          },
        })
        break
      }
      case Action.RemoveDesignation: {
        let lastTiles = [...tilemap.tiles(qube)]
        commandManager.execute({
          forward: () => tilemap.remove(qube),
          backward: () => {
            tilemap.remove(qube)
            lastTiles.forEach(({ tile, pos }) => tilemap.dot(tile, pos))
          },
        })
        tilemap.remove(qube)
        break
      }
      case Action.DesignateStairs: {
        let lastTiles = [...tilemap.tiles(qube)]
        commandManager.execute({
          forward: () => tilemap.stairs(qube),
          backward: () => {
            tilemap.remove(qube)
            lastTiles.forEach(({ tile, pos }) => tilemap.dot(tile, pos))
          },
        })
        break
      }
      case Action.Select:
        select(qube)
        break
      case Action.Label:
        addLabel(qube)
        break
      case Action.EraseLabelArea:
        eraseLabelArea(qube)
        break
      default:
        executing = false
        break
    }
    if (executing) tilemap = tilemap
    return executing
  }

  function execute(): boolean {
    let executing = false
    if (action.level2 === Action.PickGFMacroStartPoint) {
      genDFMacro([...cursor])
      executing = true
    } else if (action.level2 === Action.PickLabelOfHotkey) {
      let label = labels.find((label) => label.tileSet[encodePos(cursor)])
      if (label) setLabelHotkey(setWaitingHotkey, label)
      action.level2 = null
    } else if (
      !shiftKey &&
      action.level1 === Action.Select &&
      action.drawRectStage !== DrawRectStage.Drawing &&
      selection.find((s) => s[0] === cursor[0] && s[1] === cursor[1] && s[2] === cursor[2]) &&
      !movingSelectionState.isMoving
    ) {
      startMoveSelection()
      executing = true
    } else if (
      !shiftKey &&
      action.level1 === Action.Label &&
      action.level2 !== Action.EraseLabelArea &&
      action.drawRectStage !== DrawRectStage.Drawing &&
      labels.find((label) => label.tileSet[encodePos(cursor)])
    ) {
      focusLabel = labels.find((label) => label.tileSet[encodePos(cursor)])
    } else if (
      action.drawMode === DrawMode.Rectangle &&
      ALLOWED_DRAW_MODES[action.level2 ?? action.level1]?.includes(DrawMode.Rectangle)
    ) {
      if (action.drawRectStage === DrawRectStage.StandBy) {
        if (action.level1 === Action.Select && selection.length > 0 && !shiftKey) clearSelection()
        else if (action.level1 === Action.Label && !shiftKey) focusLabel = null
        action.drawRectStage = DrawRectStage.Drawing
        action.drawRect = [...cursor, 0, 0, 0]
        executing = true
      } else if (action.drawRectStage === DrawRectStage.Drawing) {
        action.drawRectStage = DrawRectStage.StandBy
        let qube: Qube = [...action.drawRect]
        for (let i = 0; i < 3; ++i) {
          if (qube[i + 3] < 0) {
            qube[i] += qube[i + 3]
            qube[i + 3] = -qube[i + 3]
          }
        }
        executing = executeAction(action.level2 ?? action.level1, qube)
      }
    } else if (
      action.drawMode === DrawMode.Free &&
      ALLOWED_DRAW_MODES[action.level2 ?? action.level1]?.includes(DrawMode.Free)
    ) {
      executing = executeAction(action.level2 ?? action.level1, [...cursor, 0, 0, 0])
    }
    return executing
  }

  function escape() {
    let escaping = false
    if (movingSelectionState.isMoving) {
      stopMoveSelection()
      escaping = true
    }
    if (action.level2 === Action.PickGFMacroStartPoint) {
      action.level2 = null
      action.level1 = null
      escaping = true
    }
    if (action.drawRectStage === DrawRectStage.Drawing) {
      action.drawRectStage = DrawRectStage.StandBy
      escaping = true
    } else if (action.level1 === Action.Select && selection.length && !shiftKey) {
      clearSelection()
      escaping = true
    } else if (focusLabel) {
      focusLabel = null
      escaping = true
    } else if (action.level2 !== null) {
      action.level2 = null
      escaping = true
    } else if (action.level1 !== null) {
      action.level1 = null
      escaping = true
    }
    return escaping
  }

  function zoomIn() {
    if (tileWidth < 128) tileWidth += 12
    const screenCenter = [screenQube[0] + screenQube[3] * 0.5, screenQube[1] + screenQube[4] * 0.5]
    screenQube[3] = Math.ceil(containerPixelArea[0] / tileWidth)
    screenQube[4] = Math.ceil(containerPixelArea[1] / tileWidth)
    screenQube[0] = Math.floor(screenCenter[0] - screenQube[3] * 0.5)
    screenQube[1] = Math.floor(screenCenter[1] - screenQube[4] * 0.5)
  }
  function zoomOut() {
    if (tileWidth >= 20) tileWidth -= 12
    const screenCenter = [screenQube[0] + screenQube[3] * 0.5, screenQube[1] + screenQube[4] * 0.5]
    screenQube[3] = Math.ceil(containerPixelArea[0] / tileWidth)
    screenQube[4] = Math.ceil(containerPixelArea[1] / tileWidth)
    screenQube[0] = Math.ceil(screenCenter[0] - screenQube[3] * 0.5)
    screenQube[1] = Math.ceil(screenCenter[1] - screenQube[4] * 0.5)
  }

  let selection: Pos[] = []
  let selectionBoundary: [Pos, Pos] = [
    [Infinity, Infinity, Infinity],
    [0, 0, 0],
  ]
  function clearSelection() {
    selection = []
    selectionBoundary = [
      [Infinity, Infinity, Infinity],
      [0, 0, 0],
    ]
  }
  function selectPos(pos: Pos) {
    selection.push(pos)
    for (let i = 0; i < 3; ++i) {
      selectionBoundary[0][i] = Math.min(pos[i], selectionBoundary[0][i])
      selectionBoundary[1][i] = Math.max(pos[i], selectionBoundary[1][i])
    }
  }
  function select(qube: Qube) {
    if (!shiftKey) clearSelection()
    for (let pos of qubeIter(qube)) {
      selectPos(pos)
    }
    selection = selection
  }
  let clipboard: { pos: Pos; tile: Tile }[] = []
  let clipboardPivot: Pos = [0, 0, 0]
  function copySelection() {
    clipboard = selection.map((pos) => ({ pos, tile: tilemap.tileAt(pos) }))
    clipboardPivot = selection.reduce((agg, pos) => [
      Math.min(pos[0], agg[0]),
      Math.min(pos[1], agg[1]),
      Math.min(pos[2], agg[2]),
    ])
  }
  function removeSelection() {
    let selectionClone = [...selection]
    let lastTiles = selection.map((pos) => ({ pos, tile: tilemap.tileAt(pos) }))
    commandManager.execute({
      forward: () => {
        selectionClone.forEach((pos) => tilemap.dot(tilemap.defaultTile, pos))
      },
      backward: () => {
        lastTiles.forEach(({ tile, pos }) => tilemap.dot(tile, pos))
      },
    })
  }
  function cutSelection() {
    copySelection()
    removeSelection()
    tilemap = tilemap
  }
  function pasteSelection() {
    let lastPasteData = clipboard.map(({ pos, tile }) => {
      let pastePos: Pos = [
        pos[0] - clipboardPivot[0] + cursor[0],
        pos[1] - clipboardPivot[1] + cursor[1],
        pos[2] - clipboardPivot[2] + cursor[2],
      ]
      return { pos: pastePos, tile }
    })
    let lastOverwriteTiles = lastPasteData.map(({ pos }) => ({ pos, tile: tilemap.tileAt(pos) }))

    commandManager.execute({
      forward: () => {
        lastPasteData.map(({ pos, tile }) => {
          tilemap.dot(tile, pos)
        })
      },
      backward: () => {
        lastOverwriteTiles.forEach(({ tile, pos }) => tilemap.dot(tile, pos))
      },
    })

    clearSelection()
    lastPasteData.map(({ pos }) => {
      selectPos(pos)
    })

    tilemap = tilemap
  }
  function rotateSelection(ccw = false) {
    const pivot = [
      (selectionBoundary[0][0] + selectionBoundary[1][0]) * 0.5,
      (selectionBoundary[0][1] + selectionBoundary[1][1]) * 0.5,
    ]

    const rotateTargetTiles: { pos: Pos; tile: Tile }[] = selection.map((pos) => {
      const newPos: Pos = ccw
        ? [pos[1] - pivot[1] + pivot[0], -pos[0] + pivot[0] + pivot[1], pos[2]]
        : [-pos[1] + pivot[1] + pivot[0], pos[0] - pivot[0] + pivot[1], pos[2]]
      return { pos: newPos.map(Math.round) as Pos, tile: tilemap.tileAt(pos) }
    })
    const lastRotateTargetTiles = rotateTargetTiles.map(({ pos }) => ({
      pos,
      tile: tilemap.tileAt(pos),
    }))
    const selectionClone = [...selection]
    const rotationSourceTiles = selection.map((pos) => ({ pos, tile: tilemap.tileAt(pos) }))

    commandManager.execute({
      forward: () => {
        selectionClone.forEach((pos) => tilemap.dot(tilemap.defaultTile, pos))
        rotateTargetTiles.forEach(({ pos, tile }) => {
          tilemap.dot(tile, pos)
        })
      },
      backward: () => {
        lastRotateTargetTiles.forEach(({ tile, pos }) => tilemap.dot(tile, pos))
        rotationSourceTiles.forEach(({ tile, pos }) => tilemap.dot(tile, pos))
      },
    })

    clearSelection()
    rotateTargetTiles.forEach(({ pos }) => {
      selectPos(pos)
    })

    tilemap = tilemap
  }
  function flipSelection(vertical = false) {
    const pivot = [
      (selectionBoundary[0][0] + selectionBoundary[1][0]) * 0.5,
      (selectionBoundary[0][1] + selectionBoundary[1][1]) * 0.5,
    ]

    const flipTargetTiles: { pos: Pos; tile: Tile }[] = selection.map((pos) => {
      const newPos: Pos = vertical
        ? [pos[0], pivot[1] * 2 - pos[1], pos[2]]
        : [pivot[0] * 2 - pos[0], pos[1], pos[2]]
      return { pos: newPos, tile: tilemap.tileAt(pos) }
    })
    const lastFlipTargetTiles = flipTargetTiles.map(({ pos }) => ({
      pos,
      tile: tilemap.tileAt(pos),
    }))
    const selectionClone = [...selection]
    const flipSourceTiles = selection.map((pos) => ({ pos, tile: tilemap.tileAt(pos) }))

    commandManager.execute({
      forward: () => {
        selectionClone.forEach((pos) => tilemap.dot(tilemap.defaultTile, pos))
        flipTargetTiles.forEach(({ pos, tile }) => {
          tilemap.dot(tile, pos)
        })
      },
      backward: () => {
        lastFlipTargetTiles.forEach(({ tile, pos }) => tilemap.dot(tile, pos))
        flipSourceTiles.forEach(({ tile, pos }) => tilemap.dot(tile, pos))
      },
    })

    clearSelection()
    flipTargetTiles.map(({ pos }) => {
      selectPos(pos)
    })

    tilemap = tilemap
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === 'Shift') {
      shiftKey = false
    } else if (e.key === 'Control') ctrlKey = false
    else if (e.key === 'Alt') altKey = false
  }

  function onKeyDown(e: KeyboardEvent) {
    const cursorStep = e.shiftKey ? 10 : 1
    const panStep = e.altKey ? 1 : e.shiftKey ? 20 : 10
    shiftKey = e.shiftKey
    ctrlKey = e.ctrlKey
    altKey = e.altKey
    if (e.ctrlKey) return
    switch (e.key) {
      case 'ArrowLeft':
        cursorBy(-cursorStep, 0, 0)
        break
      case 'ArrowRight':
        cursorBy(cursorStep, 0, 0)
        break
      case 'ArrowDown':
        cursorBy(0, cursorStep, 0)
        break
      case 'ArrowUp':
        cursorBy(0, -cursorStep, 0)
        break
      case 'E':
      case 'e':
        cursorBy(0, 0, -cursorStep)
        break
      case 'C':
      case 'c':
        cursorBy(0, 0, cursorStep)
        break
      case 'w':
        panBy([0, -panStep, 0])
        break
      case 'd':
        panBy([panStep, 0, 0])
        break
      case 's':
        panBy([0, panStep, 0])
        break
      case 'a':
        panBy([-panStep, 0, 0])
        break
      case 'Enter':
        execute()
        break
      case 'Escape':
        escape()
        break
      case '[':
        zoomOut()
        break
      case ']':
        zoomIn()
        break
      default:
        return
    }
    e.preventDefault()
  }

  /*enum GenDFMacroStage {
    PickStartPoint,
    SaveMacro,
  }*/
  //let macroStage: GenDFMacroStage | null = null

  function pickDFMacroStartPoint() {
    action.level2 = Action.PickGFMacroStartPoint
    action.level1 = Action.GFMacro
    //macroStage = GenDFMacroStage.PickStartPoint
  }
  function genDFMacro(startPoint: Pos) {
    action.level1 = Action.GFMacro
    action.level2 = Action.SaveGFMacro
    dfMacroText = genMacro(snakeCase(fortName), tilemap, startPoint)
    openedModal = Modals.GenDFMacro
  }

  function resizeTilemapAndCloseModal() {
    const volume = ['resize-x', 'resize-y', 'resize-z'].map((id) =>
      parseInt((<HTMLInputElement>document.getElementById(id)).value)
    ) as Volume
    tilemap.resize(volume)
    tilemap = tilemap
    openedModal = Modals.None
  }

  function uploadFort(e: Event) {
    const reader = new FileReader()
    reader.onload = () => {
      setState(JSON.parse(reader.result.toString()) as State)
    }
    reader.readAsText((<HTMLInputElement>e.target).files[0])
  }

  function blurOnEnterOrEscape(e: KeyboardEvent) {
    if (['Enter', 'Escape'].includes(e.key)) {
      ;(e.target as HTMLInputElement).blur()
      return false
    }
  }
</script>

<svelte:window on:keydown={onKeyDown} on:keyup={onKeyUp} />

<svelte:head>
  <title>{fortName} - DF Fort Forge</title>
</svelte:head>

<div
  class="overflow-hidden w-full h-full relative"
  bind:clientWidth={containerPixelArea[0]}
  bind:offsetHeight={containerPixelArea[1]}
>
  <svg
    class="w-full h-full"
    on:mousemove={onMouseMove}
    on:mousedown={onMouseDown}
    on:contextmenu={onMouseRightClick}
    on:mouseup={onMouseUp}
    on:wheel={onWheel}
  >
    <defs>
      <pattern id="hatch-diagonal" patternUnits="userSpaceOnUse" width="4" height="4">
        <path
          d="M-1,1 l2,-2
                 M0,4 l4,-4
                 M3,5 l2,-2"
          stroke-width="1"
          fill="none"
          stroke="white"
        />
      </pattern>
      <pattern id="hatch-diagonal-loose" patternUnits="userSpaceOnUse" width="8" height="8">
        <path
          d="M-1,1 l2,-2
                 M0,8 l8,-8
                 M7,9 l4,-4"
          stroke-width="1"
          fill="none"
          stroke="white"
        />
      </pattern>

      <mask id="hatch-diagonal-mask" x="0" y="0" width="1" height="1">
        <rect x="0" y="0" width="100%" height="100%" fill="url(#hatch-diagonal-loose)" />
      </mask>
      <pattern
        id={tileToString(Tile.OpenSpace)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="rgb(128, 148, 160)" fill-opacity="0.8" />
      </pattern>
      <pattern
        id={tileToString(Tile.Wall)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="rgb(49, 44, 52)" />
      </pattern>
      <pattern
        id={tileToString(Tile.Ramp)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="url(#{tileToString(Tile.Floor)})" />
        <polygon
          points="{tileWidth * 0.5} 4, {tileWidth - 4} {tileWidth - 4}, 4 {tileWidth - 4}"
          fill="rgb(1, 205, 255)"
        />
      </pattern>
      <pattern
        id={tileToString(Tile.Channel)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="url(#{tileToString(Tile.OpenSpace)})" />
        <polygon
          points="4 4, {tileWidth - 4} 4, {tileWidth * 0.5} {tileWidth - 4}"
          fill="rgb(40, 88, 103)"
        />
      </pattern>
      <pattern
        id={tileToString(Tile.UpStair)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="url(#{tileToString(Tile.Floor)})" />
        <path
          d="M4 4, L{tileWidth - 4} {tileWidth * 0.5}, L4 {tileWidth - 4}"
          stroke="rgb(0, 0, 0)"
          stroke-width="3"
          fill="none"
        />
      </pattern>
      <pattern
        id={tileToString(Tile.DownStair)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="url(#{tileToString(Tile.Floor)})" />
        <path
          d="M{tileWidth - 4} 4, L4 {tileWidth * 0.5}, L{tileWidth - 4} {tileWidth - 4}"
          stroke="rgb(0, 0, 0)"
          stroke-width="3"
          fill="none"
        />
      </pattern>
      <pattern
        id={tileToString(Tile.UpDownStair)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="url(#{tileToString(Tile.Floor)})" />
        <path
          d="M4 4, L{tileWidth - 4} {tileWidth - 4}, M4 {tileWidth - 4}, L{tileWidth - 4} 4"
          stroke="rgb(0, 0, 0)"
          stroke-width="3"
          fill="none"
        />
      </pattern>
      <pattern
        id={tileToString(Tile.Floor)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="rgb(99, 94, 102)" />
      </pattern>
      <pattern id="grid" width={tileWidth} height={tileWidth} patternUnits="userSpaceOnUse">
        <path
          d="M {tileWidth} 0 L 0 0 0 {tileWidth}"
          fill="none"
          stroke="rgb(158, 112, 41)"
          stroke-width="1"
          stroke-dasharray="3 3"
        />
      </pattern>
      <pattern
        id="grid10"
        width={tileWidth * 10}
        height={tileWidth * 10}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth * 10} height={tileWidth * 10} fill="url(#grid)" />
        <path
          d="M {tileWidth * 10} 0 L 0 0 0 {tileWidth * 10}"
          fill="none"
          stroke="rgb(158, 112, 41)"
          stroke-width="3"
          stroke-dasharray="3 3"
        />
      </pattern>
    </defs>

    <rect width="100%" height="100%" fill="url(#{tileToString(tilemap.defaultTile)})" />

    {#each [...tilemap.tiles(screenQube)] as { tile, pos }}
      <rect
        x={(pos[0] - screenQube[0]) * tileWidth}
        y={(pos[1] - screenQube[1]) * tileWidth}
        width={tileWidth}
        height={tileWidth}
        fill="url(#{tileToString(tile)})"
      />
    {/each}

    {#if movingSelectionState.isMoving}
      {#each movingSelectionState.tiles.filter(({ pos }) => pos[2] === cursor[2]) as { pos }}
        <rect
          x={(pos[0] - screenQube[0]) * tileWidth}
          y={(pos[1] - screenQube[1]) * tileWidth}
          width={tileWidth}
          height={tileWidth}
          fill="url(#{tileToString(tilemap.defaultTile)})"
        />
      {/each}
      {#each movingSelectionState.tiles.filter(({ pos }) => pos[2] === movingSelectionState.lastCursor[2]) as { tile, pos }}
        <rect
          x={(cursor[0] - movingSelectionState.lastCursor[0] + pos[0] - screenQube[0]) * tileWidth}
          y={(cursor[1] - movingSelectionState.lastCursor[1] + pos[1] - screenQube[1]) * tileWidth}
          width={tileWidth}
          height={tileWidth}
          fill="url(#{tileToString(tile)})"
        />
      {/each}
    {/if}

    <rect
      x="-100%"
      y="-100%"
      width="300%"
      height="300%"
      fill="url(#grid10)"
      transform="translate({(-screenQube[0] % 10) * tileWidth}, {(-screenQube[1] % 10) *
        tileWidth})"
    />

    {#if (0 - screenQube[0]) * tileWidth > 0}
      <rect x="0" y="0" width={(0 - screenQube[0]) * tileWidth} height="100%" fill="#000" />
    {/if}
    {#if (0 - screenQube[1]) * tileWidth > 0}
      <rect x="0" y="0" width="100%" height={(0 - screenQube[1]) * tileWidth} fill="#000" />
    {/if}
    <rect
      x={(tilemap.volume[0] - screenQube[0] + 1) * tileWidth}
      y="0"
      width="100%"
      height="100%"
      fill="#000"
    />
    <rect
      x="0"
      y={(tilemap.volume[1] - screenQube[1] + 1) * tileWidth}
      width="100%"
      height="100%"
      fill="#000"
    />

    <rect
      x={(cursor[0] - screenQube[0]) * tileWidth}
      y={(cursor[1] - screenQube[1]) * tileWidth}
      width={tileWidth}
      height={tileWidth}
      stroke="rgb(158, 112, 41)"
      stroke-width="2"
      fill="none"
    />

    <text
      font-size="0.8em"
      alignment-baseline="before-edge"
      fill="rgb(158, 112, 41)"
      x={(cursor[0] - screenQube[0] + 1) * tileWidth + 4}
      y={(cursor[1] - screenQube[1]) * tileWidth}
    >
      {cursor[0]}, {cursor[1]}, {-cursor[2]}
    </text>

    {#if action.drawMode === DrawMode.Rectangle && action.drawRectStage === DrawRectStage.Drawing}
      <rect
        x={(Math.min(action.drawRect[0], action.drawRect[0] + action.drawRect[3]) - screenQube[0]) *
          tileWidth}
        y={(Math.min(action.drawRect[1], action.drawRect[1] + action.drawRect[4]) - screenQube[1]) *
          tileWidth}
        width={(Math.abs(action.drawRect[3]) + 1) * tileWidth}
        height={(Math.abs(action.drawRect[4]) + 1) * tileWidth}
        fill="rgb(255, 255, 255)"
        fill-opacity="0.1"
        stroke="rgb(255, 255, 255)"
      />
    {/if}

    {#each labels.filter(({ boundary }) => boundary[0][2] <= screenQube[2] && boundary[1][2] >= screenQube[2]) as label}
      <text
        x={(label.boundary[0][0] - screenQube[0]) * tileWidth}
        y={(label.boundary[0][1] - screenQube[1]) * tileWidth - 2}
        fill={label.color}
        fill-opacity={label === focusLabel ? 0.8 : 0.4}
      >
        {label.name}
      </text>
      {#each Object.values(label.tileSet).filter((tile) => tile[2] === screenQube[2]) as tile}
        <rect
          x={(tile[0] - screenQube[0]) * tileWidth}
          y={(tile[1] - screenQube[1]) * tileWidth}
          width={tileWidth}
          height={tileWidth}
          fill={label.color}
          fill-opacity={label === focusLabel ? 0.8 : 0.4}
          mask="url(#hatch-diagonal-mask)"
        />
      {/each}
    {/each}
    {#if focusLabel}
      <rect
        x={(focusLabel.boundary[0][0] - screenQube[0]) * tileWidth}
        y={(focusLabel.boundary[0][1] - screenQube[1]) * tileWidth}
        width={(focusLabel.boundary[1][0] - focusLabel.boundary[0][0] + 1) * tileWidth}
        height={(focusLabel.boundary[1][1] - focusLabel.boundary[0][1] + 1) * tileWidth}
        fill="none"
        stroke={focusLabel.color}
        stroke-dasharray="4"
      />
    {/if}
    <!--
      <rect
        x={(label.tile[0]- screenQube[0]) *
          tileWidth}
        y={(Math.min(action.drawRect[1], action.drawRect[1] + action.drawRect[4]) - screenQube[1]) *
          tileWidth}
        width={(Math.abs(action.drawRect[3]) + 1) * tileWidth}
        height={(Math.abs(action.drawRect[4]) + 1) * tileWidth}
        fill="rgb(255, 255, 255)"
        fill-opacity="0.1"
        stroke="rgb(255, 255, 255)"
      />
-->

    {#if action.level1 === Action.Select}
      {#if screenQube[2] >= selectionBoundary[0][2] && screenQube[2] <= selectionBoundary[1][2]}
        <rect
          x={(selectionBoundary[0][0] - screenQube[0]) * tileWidth}
          y={(selectionBoundary[0][1] - screenQube[1]) * tileWidth}
          width={(selectionBoundary[1][0] - selectionBoundary[0][0] + 1) * tileWidth}
          height={(selectionBoundary[1][1] - selectionBoundary[0][1] + 1) * tileWidth}
          fill="none"
          stroke="rgb(128, 128, 128)"
          opacity="1.0"
          class="selection-boundary"
        />
      {/if}

      {#if !movingSelectionState.isMoving}
        {#each selection as pos}
          {#if pos[2] === screenQube[2]}
            <rect
              x={(pos[0] - screenQube[0]) * tileWidth}
              y={(pos[1] - screenQube[1]) * tileWidth}
              width={tileWidth}
              height={tileWidth}
              fill="none"
              stroke="rgb(255, 255, 255)"
              class="selection"
            />
          {/if}
        {/each}
      {:else}
        {#each selection as pos}
          {#if pos[2] - movingSelectionState.lastCursor[2] + cursor[2] === screenQube[2]}
            <rect
              x={(cursor[0] - movingSelectionState.lastCursor[0] + pos[0] - screenQube[0]) *
                tileWidth}
              y={(cursor[1] - movingSelectionState.lastCursor[1] + pos[1] - screenQube[1]) *
                tileWidth}
              width={tileWidth}
              height={tileWidth}
              fill="none"
              stroke="rgb(255, 255, 255)"
              class="selection"
            />
          {/if}
        {/each}
      {/if}
    {/if}

    {#if [Action.PickGFMacroStartPoint, Action.PickLabelOfHotkey].includes(action.level2)}
      <rect
        x={(cursor[0] - screenQube[0]) * tileWidth}
        y={(cursor[1] - screenQube[1]) * tileWidth}
        width={tileWidth}
        height={tileWidth}
        stroke="rgb(255, 0, 0)"
        stroke-width="3"
        class="selection"
        fill="none"
      />
      {#if action.level2 === Action.PickGFMacroStartPoint}
        <text font-size="1em" fill="rgb(255, 0, 0)" x="30%" y="30%"> Pick a macro start point</text>
      {:else if action.level2 === Action.PickLabelOfHotkey}
        <text font-size="1em" fill="rgb(255, 0, 0)" x="30%" y="30%">
          Pick a label of {setWaitingHotkey} key</text
        >
      {/if}
    {/if}
  </svg>
</div>

{#if focusLabel}
  <!--
  <div 
    class="h-4 ml-6"
    style="position: absolute; 
      left: {(focusLabel.boundary[1][0] - screenQube[0]) * tileWidth}px; 
      top:{(focusLabel.boundary[0][1] - screenQube[1]) * tileWidth}px"
  >
    <div title="no hotkey">
      <input 
        id="label-hotkey-input-empty"
        type="radio"
        name="label-hotkey"
        value=''
        bind:group={focusLabel.hotkey}
      />
      <label class="text-white" for="label-hotkey-input-empty"> No Hotkey </label>
    </div>
    {#each [...Array(11).keys()].map(i => `F${i+1}`) as hotkey}
      <div title="set hotkey {hotkey} of this label">
        <input 
          id="label-hotkey-input-{hotkey}"
          type="radio"
          name="label-hotkey"
          value={hotkey}
          bind:group={focusLabel.hotkey}
        />
        <label class="text-white" for="label-hotkey-input-{hotkey}"> {hotkey} </label>
      </div>
    {/each}
  </div>
  -->
  <div
    class="-mt-5 -ml-8"
    style="position: absolute; 
        left: {(focusLabel.boundary[0][0] - screenQube[0]) * tileWidth}px; 
        top:{(focusLabel.boundary[0][1] - screenQube[1]) * tileWidth}px"
  >
    <button
      id="remove-label"
      class="w-6 h-6 flex items-center justify-center rounded-full text-white group"
      on:click={() => {
        removeLabel(focusLabel.id)
        focusLabel = null
      }}
    >
      <Icon icon={DeleteIcon} height="1.5em" class="group-hover:hidden" />
      <Icon icon={DeleteForeverIcon} height="1.5em" class="group-hover:block hidden" />
    </button>
  </div>
  <input
    id="label-name-input"
    bind:value={focusLabel.name}
    on:change={() => (labelHotkeys = labelHotkeys)}
    on:keydown|stopPropagation={blurOnEnterOrEscape}
    on:blur={() => (labels = labels)}
    class="h-4 -mt-4"
    style="position: absolute; 
      left: {(focusLabel.boundary[0][0] - screenQube[0]) * tileWidth}px; 
      top:{(focusLabel.boundary[0][1] - screenQube[1]) * tileWidth}px"
  />
{/if}

<div
  id="topnav"
  class="fixed top-0 left-0 bg-white flex items-center flex-nowrap opacity-50 hover:opacity-100 rounded-br-full shadow pr-4"
>
  <label class="p-1 h-12" for="fort-name">
    <Icon icon={FortIcon} inline={true} height="2.5em" />
  </label>
  <input
    class="rounded pl-4 self-stretch focus:pl-3 text-slate-500 focus:text-black focus:tracking-normal tracking-wide"
    id="fort-name"
    bind:value={fortName}
    on:keydown|stopPropagation={blurOnEnterOrEscape}
  />
  <button
    class="flex items-center rounded-full px-3 h-8 hover:bg-slate-200"
    on:click={pickDFMacroStartPoint}
  >
    <Icon icon={GenMacroIcon} inline={true} />
    <span class="mx-1">gen macro</span>
    <Icon icon={GenMacroIcon} inline={true} />
  </button>
  <button
    class="flex items-center rounded-full px-3 h-8 hover:bg-slate-200"
    on:click={abandonFortress}
  >
    <Icon icon={AbandonIcon} inline={true} />
    <span>abandon fort</span>
    <Icon icon={AbandonIcon} inline={true} />
  </button>

  <Dropdown>
    <button
      slot="head"
      class="hover:bg-slate-200 rounded-full w-8 h-8 text-center flex items-center justify-center mr-4"
    >
      <Icon icon={MoreIcon} width="1.5em" inline={true} />
    </button>
    <button
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center"
      on:click={() => (openedModal = Modals.DownloadFort)}
    >
      <Icon icon={SaveAsIcon} inline={true} />
      <span class="ml-1"> save to desktop</span>
    </button>
    <input type="file" class="hidden" id="upload-fort" on:change={uploadFort} accept=".dffort" />
    <label
      for="upload-fort"
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center cursor-pointer"
    >
      <Icon icon={UploadIcon} inline={true} />
      <span class="ml-1"> upload from destktop </span>
    </label>
    <button
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center"
      on:click={() => (openedModal = Modals.ResizeTilemap)}
    >
      <Icon icon={ResizeIcon} inline={true} />
      <span class="ml-1"> resize tilemap </span>
    </button>
    <button
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center"
      on:click={() => (openedModal = Modals.ShowUsefulHotkeys)}
    >
      <Icon icon={HotkeysIcon} inline={true} />
      <span class="ml-1"> show useful hotkeys </span>
    </button>

    <a
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center"
      href="https://github.com/eunchuldev/df-fortforge"
    >
      <Icon icon={GithubIcon} inline={true} />
      <span class="ml-1"> visit repo </span>
    </a>

    <button
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center"
      on:click={() => (openedModal = Modals.About)}
    >
      <Icon icon={AboutIcon} inline={true} />
      <span class="ml-1"> about </span>
    </button>
  </Dropdown>
</div>

<div
  id="minimap"
  class="fixed top-0 right-0 w-64 h-64 pointer-events-none bg-white bg-opacity-5 rounded-bl-lg"
>
  <Minimap {tilemap} {cursor} {screenQube} />
</div>

<div
  id="label-hotkeys-control"
  class="fixed bottom-0 right-0 bg-white flex items-center flex-nowrap opacity-40 hover:opacity-100 shadow rounded-lg m-4 p-2"
>
  <table class="table-auto">
    <caption class="mb-2">Label Hotkeys</caption>
    <tbody>
      {#each Object.entries(labelHotkeys) as [key, label]}
        <tr>
          <td class="text-sm border-b p-2 text-center">
            <button
              use:hotkey={key}
              class:text-slate-400={!label}
              class:underline={label}
              disabled={!label}
              on:click={() => {
                if (label) followLabel(label)
              }}
            >
              {key}
            </button>
          </td>
          <td>
            <div
              class="w-48 flex justify-center items-center overflow-hidden text-ellipsis text-xs border-b p-2 text-center whitespace-nowrap"
            >
              {#if label}
                <button
                  class="rounded-full p-1 hover:bg-slate-300 mr-2"
                  on:click={() => removeLabelHotkey(key)}
                >
                  <Icon icon={CloseIcon} />
                </button>
                <button class="grow text-left" use:hotkey={key} on:click={() => followLabel(label)}>
                  {label.name}
                </button>
              {:else}
                <button
                  class="rounded bg-slate-200 p-1 hover:bg-slate-300"
                  on:click={() => {
                    action.level1 = Action.Label
                    action.level2 = Action.PickLabelOfHotkey
                    setWaitingHotkey = key
                  }}
                >
                  Pick
                </button>
              {/if}
            </div>
          </td>
        </tr><tr />{/each}
    </tbody>
  </table>
</div>

<div id="actionbox" class="fixed bottom-0 m-8 flex flex-col">
  <div id="actionbox-level2" class="flex [&>*]:m-0.5">
    {#if action.level1 === Action.Label}
      <div>
        <input
          id="action-label"
          type="radio"
          name="action"
          class="hidden"
          value={Action.Label}
          bind:group={action.level2}
          use:hotkey={'l'}
          checked={action.level1 === Action.Label}
        />
        <label for="action-label" title="label">
          <Icon icon={LabelIcon} height="1.5em" />
          <span class="hotkey"> l </span>
        </label>
      </div>
      <div>
        <input
          id="action-erase-label-area"
          type="radio"
          name="action"
          class="hidden"
          value={Action.EraseLabelArea}
          bind:group={action.level2}
          use:hotkey={'x'}
        />
        <label for="action-erase-label-area" title="erase label area">
          <Icon icon={EraseIcon} height="1.5em" />
          <span class="hotkey"> x </span>
        </label>
      </div>
    {/if}
    {#if action.level1 === Action.DesignateMine}
      <div>
        <input
          id="action-designate-dig"
          type="radio"
          name="action"
          class="hidden"
          value={Action.DesignateDig}
          bind:group={action.level2}
          use:hotkey={'m'}
          checked={action.level1 === Action.DesignateMine}
        />
        <label for="action-designate-dig">
          <Icon icon={DigIcon} height="1.5em" />
          <span class="hotkey"> m </span>
        </label>
      </div>
      <div>
        <input
          id="action-designate-staris"
          type="radio"
          name="action"
          class="hidden"
          value={Action.DesignateStairs}
          bind:group={action.level2}
          use:hotkey={'t'}
        />
        <label for="action-designate-staris">
          <Icon icon={StairIcon} height="1.5em" />
          <span class="hotkey"> t </span>
        </label>
      </div>
      <div>
        <input
          id="action-designate-channel"
          type="radio"
          name="action"
          class="hidden"
          value={Action.DesignateChannel}
          bind:group={action.level2}
          use:hotkey={'u'}
        />
        <label for="action-designate-channel">
          <Icon icon={ChannelIcon} height="1.5em" />
          <span class="hotkey"> u </span>
        </label>
      </div>
      <div>
        <input
          id="action-designate-ramp"
          type="radio"
          name="action"
          class="hidden"
          value={Action.DesignateRamp}
          bind:group={action.level2}
          use:hotkey={'r'}
        />
        <label for="action-designate-ramp">
          <Icon icon={RampIcon} height="1.5em" />
          <span class="hotkey"> r </span>
        </label>
      </div>
    {:else if action.level1 === Action.Select}
      <div>
        <input
          id="action-select-l2"
          type="radio"
          name="action-group"
          class="hidden"
          value={Action.Select}
          bind:group={action.level1}
          use:hotkey={'Control+g'}
        />
        <label for="action-select-l2" title="select">
          <Icon icon={SelectIcon} height="1.5em" />
        </label>
      </div>
      <div>
        <button id="action-copy-selection" on:click={copySelection} use:hotkey={'Control+c'}>
          <Icon icon={CopyIcon} height="1.5em" />
          <span class="hotkey"> ctrl+c </span>
        </button>
      </div>
      <div>
        <button id="action-cut-selection" on:click={cutSelection} use:hotkey={'Control+x'}>
          <Icon icon={CutIcon} height="1.5em" />
          <span class="hotkey"> ctrl+x </span>
        </button>
      </div>
      <div>
        <button id="action-paste-selection" on:click={pasteSelection} use:hotkey={'Control+v'}>
          <Icon icon={PasteIcon} height="1.5em" />
          <span class="hotkey"> ctrl+v </span>
        </button>
      </div>

      <div>
        <button
          id="action-rotate-selection-cw"
          on:click={() => rotateSelection(false)}
          use:hotkey={'Control+r'}
        >
          <Icon icon={RotateCWIcon} height="1.5em" />
          <span class="hotkey"> ctrl+r </span>
        </button>
      </div>
      <div>
        <button
          id="action-rotate-selection-ccw"
          on:click={() => rotateSelection(true)}
          use:hotkey={'Control+R'}
        >
          <Icon icon={RotateCCWIcon} height="1.5em" />
          <span class="hotkey"> ctrl+R </span>
        </button>
      </div>
      <div>
        <button
          id="action-flip-selection-horiz"
          on:click={() => flipSelection(false)}
          use:hotkey={'Control+f'}
        >
          <Icon icon={FlipHorizIcon} height="1.5em" />
          <span class="hotkey"> ctrl+f </span>
        </button>
      </div>
      <div>
        <button
          id="action-flip-selection-vert"
          on:click={() => flipSelection(true)}
          use:hotkey={'Control+F'}
        >
          <Icon icon={FlipVertIcon} height="1.5em" />
          <span class="hotkey"> ctrl+F </span>
        </button>
      </div>
    {/if}

    <div id="actionbox-drawmode" class="flex pl-8 [&>*]:m-0.5">
      {#if ALLOWED_DRAW_MODES[action.level2 ?? action.level1]?.includes(DrawMode.Rectangle)}
        <div>
          <input
            id="drawmode-rectangle"
            type="radio"
            name="drawmode"
            class="hidden"
            value={DrawMode.Rectangle}
            bind:group={action.drawMode}
            use:hotkey={'b'}
          />
          <label for="drawmode-rectangle">
            <Icon icon={RectDrawIcon} height="1.5em" />
            <span class="hotkey"> b </span>
          </label>
        </div>
      {/if}
      {#if ALLOWED_DRAW_MODES[action.level2 ?? action.level1]?.includes(DrawMode.Free)}
        <div>
          <input
            id="drawmode-free"
            type="radio"
            name="drawmode"
            class="hidden"
            value={DrawMode.Free}
            bind:group={action.drawMode}
            use:hotkey={'B'}
          />
          <label for="drawmode-free">
            <Icon icon={FreeDrawIcon} height="1.5em" />
            <span class="hotkey"> B </span>
          </label>
        </div>
      {/if}
    </div>
  </div>

  <div id="actionbox-level1" class="flex [&>*]:m-0.5">
    <div>
      <input
        id="action-designate-mine"
        type="radio"
        name="action-group"
        class="hidden"
        value={Action.DesignateMine}
        bind:group={action.level1}
        use:hotkey={'m'}
      />
      <label for="action-designate-mine" title="desinate mine">
        <Icon icon={MineIcon} height="1.5em" />
        <span class="hotkey"> m </span>
      </label>
    </div>

    <div>
      <input
        id="action-remove-designation"
        type="radio"
        name="action"
        class="hidden"
        value={Action.RemoveDesignation}
        bind:group={action.level1}
        use:hotkey={'x'}
      />
      <label for="action-remove-designation" title="remove desination">
        <Icon icon={EraseIcon} height="1.5em" />
        <span class="hotkey"> x </span>
      </label>
    </div>

    <div class="pl-4">
      <input
        id="action-select"
        type="radio"
        name="action"
        class="hidden"
        value={Action.Select}
        bind:group={action.level1}
        use:hotkey={'Control+g'}
      />
      <label for="action-select" title="select">
        <Icon icon={SelectIcon} height="1.5em" />
        <span class="hotkey"> ctrl+g </span>
      </label>
    </div>

    <div class="pl-4">
      <input
        id="action-label"
        type="radio"
        name="action-group"
        class="hidden"
        value={Action.Label}
        bind:group={action.level1}
        use:hotkey={'Control+l'}
      />
      <label for="action-label" title="label">
        <Icon icon={LabelIcon} height="1.5em" />
        <span class="hotkey"> ctrl+l </span>
      </label>
    </div>

    <div class="pl-4">
      <button
        id="action-undo"
        title="undo"
        on:click={() => {
          commandManager.undo()
          tilemap = tilemap
        }}
        use:hotkey={'Control+z'}
      >
        <Icon icon={UndoIcon} height="1.5em" />
        <span class="hotkey"> ctrl+z </span>
      </button>
    </div>

    <div>
      <button
        id="action-redo"
        title="redo"
        on:click={() => {
          commandManager.redo()
          tilemap = tilemap
        }}
        use:hotkey={'Control+Z'}
        use:hotkey={'Control+y'}
      >
        <Icon icon={RedoIcon} height="1.5em" />
        <span class="hotkey"> ctrl+Z </span>
      </button>
    </div>
  </div>
</div>

{#if openedModal === Modals.GenDFMacro}
  <Modal on:close={() => (openedModal = Modals.None)}>
    <div class="m-4">
      <h3 class="text-lg mb-6">Your macro is ready!</h3>
      <ol class="list-decimal list-inside [&>li]:mt-4">
        <li>
          Click the link below to download the macro
          <a
            class="px-2 py-1 flex items-center border rounded-full inline-block w-fit bg-slate-200 hover:bg-slate-300"
            href={window.URL.createObjectURL(new Blob([dfMacroText], { type: 'plain/text' }))}
            download="{snakeCase(fortName)}.mak"
          >
            <Icon icon={SaveAsIcon} inline={true} />
            <span class="ml-1"> {snakeCase(fortName)}.mak </span>
          </a>
          <span class="text-xs">
            {dfMacroText.split('\n').length}lines
          </span>
        </li>
        <li>
          Place the macro file on the Dwarf fortress macros directory.
          <ul class="ml-6 list-disc">
            <li>
              windows: <span class="code">
                C:\Program Files\Steam\steamapps\common/Dwarf Fortress/prefs/macros/
              </span>
            </li>
            <li>
              linux: <span class="code">
                ~/.steam/steam/steamapps/common/Dwarf Fortress/prefs/macros/
              </span>
            </li>
          </ul>
        </li>
        <li>
          While playing Dwarf Fortress, you can load macros by press <span class="code">
            Ctrl + l
          </span>
          and replay it by press <span class="code"> Ctrl + p </span>
        </li>
      </ol>
      <button
        on:click={() => (openedModal = Modals.None)}
        class="p-2 px-4 rounded mt-8 bg-slate-200 hover:bg-slate-300 active:bg-slate-200"
      >
        Done
      </button>
    </div>
  </Modal>
{:else if openedModal === Modals.ResizeTilemap}
  <Modal on:close={() => (openedModal = Modals.None)}>
    <div class="m-4">
      <h3 class="text-lg mb-6">Resize Tile Map</h3>
      <div>
        <label for="resize-x" class="block text-sm"> width </label>
        <input
          class="border p-2"
          type="number"
          step="1"
          min="1"
          max="1000"
          id="resize-x"
          value={tilemap.volume[0]}
        />
      </div>
      <div class="mt-2">
        <label for="resize-y" class="block text-sm"> height </label>
        <input
          class="border p-2"
          type="number"
          step="1"
          min="1"
          max="1000"
          id="resize-y"
          value={tilemap.volume[1]}
        />
      </div>
      <div class="mt-2">
        <label for="resize-z" class="block text-sm"> depth </label>
        <input
          class="border p-2"
          type="number"
          step="1"
          min="1"
          max="1000"
          id="resize-z"
          value={tilemap.volume[2]}
        />
      </div>
      <div class="italic text-red-500 mt-8">Warning: Too high volume can cause errors</div>
      <button
        class="p-2 px-4 rounded mt-8 bg-slate-200 hover:bg-slate-300 active:bg-slate-200"
        on:click={resizeTilemapAndCloseModal}
      >
        Apply
      </button>
    </div>
  </Modal>
{:else if openedModal === Modals.DownloadFort}
  <Modal on:close={() => (openedModal = Modals.None)}>
    <div class="m-4">
      <a
        class="px-2 py-1 flex items-center border rounded-full inline-block w-fit bg-slate-200 hover:bg-slate-300"
        href={window.URL.createObjectURL(
          new Blob([JSON.stringify(getState())], { type: 'plain/text' })
        )}
        download="{snakeCase(fortName)}.dffort"
        on:click={() => (openedModal = Modals.None)}
      >
        <Icon icon={SaveAsIcon} inline={true} />
        <span class="ml-1"> {snakeCase(fortName)}.dffort </span>
      </a>
    </div>
  </Modal>
{:else if openedModal === Modals.ShowUsefulHotkeys}
  <Modal on:close={() => (openedModal = Modals.None)}>
    <div class="m-4">
      <h3 class="text-lg mb-6">Hotkey Cheatsheet</h3>
      <table class="table-auto w-full text-left [&_tr]:border-b [&_th]:p-2 [&_td]:p-2 leading-8">
        <thead>
          <tr class="border-b">
            <th> Description </th>
            <th> Hotkey </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="2" class="bg-slate-100 px-2 font-bold text-center"> Screen Control </td>
          </tr>
          <tr>
            <td> Pan the screen </td>
            <td class="">
              <span class="code"> w </span>
              <span class="code"> a </span>
              <span class="code"> s </span>
              <span class="code"> d </span>

              <br />

              <span class="code"> Shift + w </span>
              <span class="code"> Shift + a </span>
              <span class="code"> Shift + s </span>
              <span class="code"> Shift + d </span>

              <br />

              <span class="code"> Alt + w </span>
              <span class="code"> Alt + a </span>
              <span class="code"> Alt + s </span>
              <span class="code"> Alt + d </span>
            </td>
          </tr>
          <tr>
            <td> Change tile size </td>
            <td>
              <span class="code"> [ </span>
              <span class="code"> ] </span>
            </td>
          </tr>
          <tr>
            <td> Move cursor vertical <br /> (z-axis) </td>
            <td>
              <span class="code"> e </span>
              <span class="code"> c </span>
              <br />
              <span class="code"> Shift + e </span>
              <span class="code"> Shift + c </span>
            </td>
          </tr>
          <tr>
            <td> Move cursor horizontal <br /> (x-axis, y-axis) </td>
            <td>
              <span class="code"> Arrow </span>
              <br />
              <span class="code"> Shift + Arrow </span>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="bg-slate-100 px-2 font-bold text-center"> Selection </td>
          </tr>
          <tr>
            <td> Extend Selection </td>
            <td>
              <span class="code"> Shift + Select </span>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="bg-slate-100 px-2 font-bold text-center"> Label </td>
          </tr>
          <tr>
            <td> Extend Label Area </td>
            <td>
              <span class="code"> SelectLabel + Shift + Select </span>
            </td>
          </tr>
        </tbody>
      </table>
      <button
        class="p-2 px-4 rounded mt-8 bg-slate-200 hover:bg-slate-300 active:bg-slate-200"
        on:click={() => (openedModal = Modals.None)}
      >
        Close
      </button>
    </div>
  </Modal>
{:else if openedModal === Modals.About}
  <Modal on:close={() => (openedModal = Modals.None)}>
    <div class="m-4">
      <h1 class="text-2xl block mt-4 mb-8">About</h1>
      <table class="auto w-full [&_td]:p-2 [&_td]:border-t">
        <tbody>
          <tr>
            <td> App Name </td>
            <td> DF FortForge </td>
          </tr>
          <tr>
            <td> Version </td>
            <td> <span class="code"> {version} </span> </td>
          </tr>
          <tr>
            <td> Build </td>
            <td> <span class="code"> {build} </span> </td>
          </tr>
          <tr>
            <td> Support DF Version </td>
            <td> <span class="code"> {supportDFVersion} </span> </td>
          </tr>
          <tr>
            <td> Author </td>
            <td> Eunchul Song </td>
          </tr>
          <tr>
            <td> Email </td>
            <td>
              <a href="mailto:eunchulsong9@gmail.com" class="text-blue-500">
                eunchulsong9@gmail.com
              </a>
            </td>
          </tr>
        </tbody>
      </table>
      <button
        class="p-2 px-4 rounded mt-8 bg-slate-200 hover:bg-slate-300 active:bg-slate-200"
        on:click={() => (openedModal = Modals.None)}
      >
        Close
      </button>
    </div>
  </Modal>
{/if}

<style lang="postcss">
  #actionbox :is(label, button) {
    @apply relative grid bg-white w-12 h-12 rounded-lg shadow hover:bg-slate-300 place-items-center;
  }
  #actionbox input[type='radio']:checked + label {
    @apply bg-slate-500;
  }
  #actionbox .hotkey {
    @apply absolute top-0.5 left-1 text-xs;
  }

  #actionbox #actionbox-drawmode :is(label, button) {
    @apply rounded-2xl;
  }
  #actionbox #actionbox-drawmode .hotkey {
    @apply absolute top-1.5 left-1.5 text-xs;
  }

  .code {
    @apply text-xs bg-slate-100 text-red-600 py-1 px-2 tracking-wide border rounded;
  }

  .selection {
    stroke-dasharray: 4;
    animation: dash 5s linear infinite;
    cursor: move;
    pointer-events: fill;
  }

  .selection-boundary {
    stroke-dasharray: 16;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 128;
    }
  }
</style>
