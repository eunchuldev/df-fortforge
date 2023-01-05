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

<script lang="ts">
  import type { Label } from '../lib/label.js'
  import { WorkshopManagerCommand } from '../lib/workshop.command.js'
  import { SimpleLabelManagerCommand } from '../lib/simple-label.command.js'
  import TopNav from './TopNav.svelte'
  import { Tile, tileToString } from '../lib/tilemap.js'
  import { TilemapCommand } from '../lib/tilemap.command.js'
  import { hotkey } from '../lib/svelte-actions/hotkey.js'
  import Minimap from './Minimap.svelte'
  import { CommandManager } from '../lib/command.js'
  import { snakeCase } from 'change-case'
  import WorkshopSelect from './WorkshopSelect.svelte'
  import Icon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { randomColors } from '../lib/random-colors.js'
  //import FortIcon from '@iconify-icons/mdi/castle';
  import DigIcon from '@iconify-icons/mdi/pickaxe'
  import MineIcon from '@iconify-icons/game-icons/dig-dug'
  import EraseIcon from '@iconify-icons/mdi/eraser'
  import StairIcon from '@iconify-icons/mdi/stairs'
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
  import LabelIcon from '@iconify-icons/mdi/label'
  import DeleteIcon from '@iconify-icons/mdi/delete-outline'
  import DeleteForeverIcon from '@iconify-icons/mdi/delete-forever-outline'
  import CloseIcon from '@iconify-icons/mdi/close'
  import WorkshopIcon from '@iconify-icons/mdi/store'

  import { genFortressName } from '../lib/df-name-gen.js'
  import { genMacro } from '../lib/df-macros.js'

  import type { Pos, Qube, Area, Volume } from '../lib/geometry'
  import { qubeIter, subPos } from '../lib/geometry.js'

  enum Action {
    DesignateMine = 1,
    RemoveDesignation,

    DesignateDig,
    DesignateRamp,
    DesignateChannel,
    DesignateStairs,

    Label,
    EraseLabelArea,
    PickLabelOfHotkey,

    Workshop,
    AddWorkshop,

    GFMacro,
    PickGFMacroStartPoint,
    SaveGFMacro,

    Select,
  }

  enum DrawMode {
    Rectangle = 1,
    Free,
  }
  enum DrawRectStage {
    StandBy = 1,
    Drawing,
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

  export let tileWidth = 32

  let fortName = genFortressName()

  const tilemapVolume: Volume = [100, 100, 100]

  let commandManager = new CommandManager()

  let tilemap: TilemapCommand = new TilemapCommand(commandManager, tilemapVolume)
  let action: ActionState = {
    level1: null,
    level2: null,
    drawMode: DrawMode.Rectangle,
    drawRect: [0, 0, 0, 0, 0, 0] as Qube,
    drawRectStage: DrawRectStage.StandBy,
  }

  $: if (action.level2 && ACTION_PARENT[action.level2] !== action.level1) {
    action.level2 = null
  }
  $: {
    const evaluatedAction = action.level2 ?? action.level1
    if (
      evaluatedAction &&
      ALLOWED_DRAW_MODES[evaluatedAction] &&
      !ALLOWED_DRAW_MODES[evaluatedAction]?.includes(action.drawMode)
    ) {
      action.drawMode = ALLOWED_DRAW_MODES[evaluatedAction]?.[0] ?? DrawMode.Rectangle
    }
  }

  /*  let drawMode: 'Brush' | 'Qube' = 'Qube'; */
  let cursor: Pos = [Math.floor(tilemapVolume[0] * 0.5), Math.floor(tilemapVolume[1] * 0.5), 0]
  let screenQube: Qube = [0, 0, 0, 100, 100, 0]
  let containerPixelArea: Area = [0, 0]
  let lastSavedAt: Date
  let shiftKey = false
  let ctrlKey = false
  let altKey = false
  $: screenQube[3] = Math.ceil(containerPixelArea[0] / tileWidth)
  $: screenQube[4] = Math.ceil(containerPixelArea[1] / tileWidth)

  const colorScheme = randomColors({ count: 10, seed: 0 })

  let labelManager = new SimpleLabelManagerCommand(commandManager)
  let focusLabel: Label | null = null
  let setWaitingHotkey = ''

  let workshopManager = new WorkshopManagerCommand(commandManager)
  let targetWorkshopName: string

  $: if (tilemap && fortName && labelManager && workshopManager) saveLastState()

  interface LabelDeprecated {
    id: string
    name: string
    tileSet: Record<string, Pos>
    tileCount: number
    boundary: [Pos, Pos]
    hotkey: string
    color: string
  }

  interface State {
    tilemap: string
    labels?: LabelDeprecated[] // deprecated
    labelManager: string
    workshopManager: string
    fortName: string
    cursor: Pos
    screenQube: Qube
    savedAt: string
    tileWidth: number
  }

  loadLastState()

  function decryptState(data: string) {
    const state = JSON.parse(data) as State

    if (state.tilemap) tilemap.deserialize(state.tilemap)
    if (state.labelManager) labelManager.deserialize(state.labelManager)
    if (state.workshopManager) workshopManager.deserialize(state.workshopManager)
    fortName = state.fortName ?? fortName
    cursor = state.cursor ?? cursor
    screenQube = state.screenQube ?? screenQube
    lastSavedAt = state.savedAt ? new Date(state.savedAt) : new Date()
    tilemap = tilemap
    tileWidth = state.tileWidth ?? tileWidth

    if (state.labels) {
      labelManager.labels = Object.fromEntries(
        state.labels.map((label) => [
          label.id,
          {
            id: label.id,
            name: label.name,
            tiles: Object.fromEntries(
              Object.entries(label.tileSet).map((e) => [e[0], { pos: e[1] }])
            ),
            tileCount: label.tileCount,
            boundary: label.boundary,
            color: label.color,
            fixed: false,
          },
        ])
      )
      state.labels.forEach((label) => {
        if (label.hotkey) labelManager.hotkeys[label.hotkey] = label.id
      })
    }
  }

  function encryptState(): string {
    return JSON.stringify({
      tilemap: tilemap.serialize(),
      labelManager: labelManager.serialize(),
      workshopManager: workshopManager.serialize(),
      fortName,
      cursor,
      screenQube,
      savedAt: new Date().toISOString(),
      tileWidth,
    })
  }

  function loadLastState() {
    try {
      const val = localStorage.getItem('state')
      if (val) decryptState(val)
    } catch (e) {
      alert('fail to load last state')
    }
  }

  function saveLastState() {
    let data = encryptState()
    localStorage.setItem('state', data)
    lastSavedAt = new Date()
  }

  function abandonFort() {
    if (confirm('Really Abandon Your Fortress?')) {
      tilemap = new TilemapCommand(commandManager, tilemapVolume)
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
    const targetTiles = tilemap.translate(
      selection,
      subPos(cursor, movingSelectionState.lastCursor)
    )

    clearSelection()
    targetTiles.map(({ pos }) => {
      selectPos(pos)
    })

    tilemap = tilemap
  }

  function followLabel(id: string) {
    const label = labelManager.get(id)
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

  function executeAction(action: Action, qube: Qube): boolean {
    let executing = true
    switch (action) {
      case Action.DesignateMine:
      case Action.DesignateDig:
        tilemap.dig(qube)
        tilemap = tilemap
        break
      case Action.DesignateRamp:
        tilemap.ramp(qube)
        tilemap = tilemap
        break
      case Action.DesignateChannel:
        tilemap.channel(qube)
        tilemap = tilemap
        break
      case Action.RemoveDesignation:
        tilemap.remove(qube)
        tilemap = tilemap
        break
      case Action.DesignateStairs:
        tilemap.stairs(qube)
        tilemap = tilemap
        break
      case Action.Select:
        select(qube)
        break
      case Action.Label:
        if (shiftKey && focusLabel) labelManager.extendArea(focusLabel.id, qube)
        else labelManager.addSimpleLabel(qube)
        labelManager = labelManager
        break
      case Action.EraseLabelArea:
        labelManager.eraseArea(qube)
        labelManager = labelManager
        break
      default:
        executing = false
        break
    }
    return executing
  }

  function execute(): boolean {
    let executing = false
    const evaluatedAction = action.level2 ?? action.level1
    if (action.level2 === Action.PickGFMacroStartPoint) {
      genDFMacro([...cursor])
      executing = true
    } else if (action.level2 === Action.PickLabelOfHotkey) {
      const label = labelManager.labelsAt(cursor)?.[0]
      if (label) labelManager.setHotkey(setWaitingHotkey, label.id)
      labelManager = labelManager
      action.level2 = null
    } else if (action.level1 === Action.Workshop && targetWorkshopName) {
      workshopManager.buildWorkshop(targetWorkshopName, cursor)
      targetWorkshopName = ''
      workshopManager = workshopManager
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
      labelManager.labelsAt(cursor).length
    ) {
      focusLabel = labelManager.labelsAt(cursor)?.[0]
    } else if (action.level1 === Action.Workshop && workshopManager.labelsAt(cursor).length) {
      focusLabel = workshopManager.labelsAt(cursor)?.[0]
    } else if (
      action.drawMode === DrawMode.Rectangle &&
      evaluatedAction &&
      ALLOWED_DRAW_MODES[evaluatedAction]?.includes(DrawMode.Rectangle)
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
        executing = executeAction(evaluatedAction, qube)
      }
    } else if (
      action.drawMode === DrawMode.Free &&
      evaluatedAction &&
      ALLOWED_DRAW_MODES[evaluatedAction]?.includes(DrawMode.Free)
    ) {
      executing = executeAction(evaluatedAction, [...cursor, 0, 0, 0])
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
    clipboard = tilemap.tilesAt(selection)
    clipboardPivot = selection.reduce((agg, pos) => [
      Math.min(pos[0], agg[0]),
      Math.min(pos[1], agg[1]),
      Math.min(pos[2], agg[2]),
    ])
  }
  function cutSelection() {
    clipboard = tilemap.removeDots(selection)
    clipboardPivot = selection.reduce((agg, pos) => [
      Math.min(pos[0], agg[0]),
      Math.min(pos[1], agg[1]),
      Math.min(pos[2], agg[2]),
    ])
    tilemap = tilemap
  }
  function pasteSelection() {
    const lastPasteData = tilemap.putTiles(
      clipboard.map(({ pos, tile }) => {
        let pastePos: Pos = [
          pos[0] - clipboardPivot[0] + cursor[0],
          pos[1] - clipboardPivot[1] + cursor[1],
          pos[2] - clipboardPivot[2] + cursor[2],
        ]
        return { pos: pastePos, tile }
      })
    )

    clearSelection()
    lastPasteData.map(({ pos }) => {
      selectPos(pos)
    })
    tilemap = tilemap
  }
  function rotateSelection(ccw = false) {
    const { tiles } = tilemap.rotate2d(selection, ccw)

    clearSelection()
    tiles.forEach(({ pos }) => {
      selectPos(pos)
    })
    tilemap = tilemap
  }
  function flipSelection(vertical = false) {
    const { tiles } = tilemap.flip2d(selection, vertical)

    clearSelection()
    tiles.forEach(({ pos }) => {
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

  let genDFMacroDeligate: (dfMacroText: string) => void
  function pickDFMacroStartPoint() {
    action.level2 = Action.PickGFMacroStartPoint
    action.level1 = Action.GFMacro
  }
  function genDFMacro(startPoint: Pos) {
    action.level1 = Action.GFMacro
    action.level2 = Action.SaveGFMacro
    genDFMacroDeligate(genMacro(snakeCase(fortName), tilemap, startPoint))
  }

  function blurOnEnterOrEscape(e: KeyboardEvent) {
    if (['Enter', 'Escape'].includes(e.key)) {
      ;(e.target as HTMLInputElement).blur()
      return false
    }
  }
</script>

<svelte:window on:keydown="{onKeyDown}" on:keyup="{onKeyUp}" />

<svelte:head>
  <title>{fortName} - DF Fort Forge</title>
</svelte:head>

<div
  class="overflow-hidden w-full h-full relative"
  bind:clientWidth="{containerPixelArea[0]}"
  bind:offsetHeight="{containerPixelArea[1]}"
>
  <svg
    class="w-full h-full"
    on:mousemove="{onMouseMove}"
    on:mousedown="{onMouseDown}"
    on:contextmenu="{onMouseRightClick}"
    on:mouseup="{onMouseUp}"
    on:wheel="{onWheel}"
  >
    <defs>
      <pattern id="hatch-diagonal" patternUnits="userSpaceOnUse" width="4" height="4">
        <path
          d="M-1,1 l2,-2
                 M0,4 l4,-4
                 M3,5 l2,-2"
          stroke-width="1"
          fill="none"
          stroke="white"></path>
      </pattern>
      <pattern id="hatch-cross" patternUnits="userSpaceOnUse" width="4" height="4">
        <path
          d="M-1,1 l2,-2
                 M0,4 l4,-4
                 M3,5 l2,-2
            M5,3 l2,6
            M4,0 l0,8
            M1,-1 l2,6
          "
          stroke-width="1"
          fill="none"
          stroke="white"></path>
      </pattern>
      <pattern id="hatch-diagonal-loose" patternUnits="userSpaceOnUse" width="8" height="8">
        <path
          d="M-1,1 l2,-2
                 M0,8 l8,-8
                 M7,9 l4,-4"
          stroke-width="1"
          fill="none"
          stroke="white"></path>
      </pattern>
      <mask id="hatch-diagonal-mask" x="0" y="0" width="1" height="1">
        <rect x="0" y="0" width="100%" height="100%" fill="url(#hatch-diagonal)"></rect>
      </mask>
      <mask id="hatch-diagonal-loose-mask" x="0" y="0" width="1" height="1">
        <rect x="0" y="0" width="100%" height="100%" fill="url(#hatch-diagonal-loose)"></rect>
      </mask>
      <mask id="hatch-cross-mask" x="0" y="0" width="1" height="1">
        <rect x="0" y="0" width="100%" height="100%" fill="url(#hatch-cross)"></rect>
      </mask>
      <pattern
        id="{tileToString(Tile.OpenSpace)}"
        width="{tileWidth}"
        height="{tileWidth}"
        patternUnits="userSpaceOnUse"
      >
        <rect width="{tileWidth}" height="{tileWidth}" fill="rgb(128, 148, 160)" fill-opacity="0.8"
        ></rect>
      </pattern>
      <pattern
        id="{tileToString(Tile.Wall)}"
        width="{tileWidth}"
        height="{tileWidth}"
        patternUnits="userSpaceOnUse"
      >
        <rect width="{tileWidth}" height="{tileWidth}" fill="rgb(49, 44, 52)"></rect>
      </pattern>
      <pattern
        id="{tileToString(Tile.Ramp)}"
        width="{tileWidth}"
        height="{tileWidth}"
        patternUnits="userSpaceOnUse"
      >
        <rect width="{tileWidth}" height="{tileWidth}" fill="url(#{tileToString(Tile.Floor)})"
        ></rect>
        <polygon
          points="{tileWidth * 0.5} 4, {tileWidth - 4} {tileWidth - 4}, 4 {tileWidth - 4}"
          fill="rgb(1, 205, 255)"></polygon>
      </pattern>
      <pattern
        id="{tileToString(Tile.Channel)}"
        width="{tileWidth}"
        height="{tileWidth}"
        patternUnits="userSpaceOnUse"
      >
        <rect width="{tileWidth}" height="{tileWidth}" fill="url(#{tileToString(Tile.OpenSpace)})"
        ></rect>
        <polygon
          points="4 4, {tileWidth - 4} 4, {tileWidth * 0.5} {tileWidth - 4}"
          fill="rgb(40, 88, 103)"></polygon>
      </pattern>
      <pattern
        id="{tileToString(Tile.UpStair)}"
        width="{tileWidth}"
        height="{tileWidth}"
        patternUnits="userSpaceOnUse"
      >
        <rect width="{tileWidth}" height="{tileWidth}" fill="url(#{tileToString(Tile.Floor)})"
        ></rect>
        <path
          d="M4 4, L{tileWidth - 4} {tileWidth * 0.5}, L4 {tileWidth - 4}"
          stroke="rgb(0, 0, 0)"
          stroke-width="3"
          fill="none"></path>
      </pattern>
      <pattern
        id="{tileToString(Tile.DownStair)}"
        width="{tileWidth}"
        height="{tileWidth}"
        patternUnits="userSpaceOnUse"
      >
        <rect width="{tileWidth}" height="{tileWidth}" fill="url(#{tileToString(Tile.Floor)})"
        ></rect>
        <path
          d="M{tileWidth - 4} 4, L4 {tileWidth * 0.5}, L{tileWidth - 4} {tileWidth - 4}"
          stroke="rgb(0, 0, 0)"
          stroke-width="3"
          fill="none"></path>
      </pattern>
      <pattern
        id="{tileToString(Tile.UpDownStair)}"
        width="{tileWidth}"
        height="{tileWidth}"
        patternUnits="userSpaceOnUse"
      >
        <rect width="{tileWidth}" height="{tileWidth}" fill="url(#{tileToString(Tile.Floor)})"
        ></rect>
        <path
          d="M4 4, L{tileWidth - 4} {tileWidth - 4}, M4 {tileWidth - 4}, L{tileWidth - 4} 4"
          stroke="rgb(0, 0, 0)"
          stroke-width="3"
          fill="none"></path>
      </pattern>
      <pattern
        id="{tileToString(Tile.Floor)}"
        width="{tileWidth}"
        height="{tileWidth}"
        patternUnits="userSpaceOnUse"
      >
        <rect width="{tileWidth}" height="{tileWidth}" fill="rgb(99, 94, 102)"></rect>
      </pattern>
      <pattern id="grid" width="{tileWidth}" height="{tileWidth}" patternUnits="userSpaceOnUse">
        <path
          d="M {tileWidth} 0 L 0 0 0 {tileWidth}"
          fill="none"
          stroke="rgb(158, 112, 41)"
          stroke-width="1"
          stroke-dasharray="3 3"></path>
      </pattern>
      <pattern
        id="grid10"
        width="{tileWidth * 10}"
        height="{tileWidth * 10}"
        patternUnits="userSpaceOnUse"
      >
        <rect width="{tileWidth * 10}" height="{tileWidth * 10}" fill="url(#grid)"></rect>
        <path
          d="M {tileWidth * 10} 0 L 0 0 0 {tileWidth * 10}"
          fill="none"
          stroke="rgb(158, 112, 41)"
          stroke-width="3"
          stroke-dasharray="3 3"></path>
      </pattern>
      {#each Object.values(WorkshopManagerCommand.WORKSHOPS).filter((workshop) => workshop.icon) as { name, icon }}
        {#if icon}
          <svg viewBox="0 0 {icon.width || 512} {icon.height || 512}" id="{name}">
            <g>
              {@html icon.body}
            </g>
          </svg>
        {/if}
      {/each}
    </defs>

    <rect width="100%" height="100%" fill="url(#{tileToString(tilemap.defaultTile)})"></rect>

    {#each [...tilemap.tiles(screenQube)] as { tile, pos }}
      <rect
        x="{(pos[0] - screenQube[0]) * tileWidth}"
        y="{(pos[1] - screenQube[1]) * tileWidth}"
        width="{tileWidth}"
        height="{tileWidth}"
        fill="url(#{tileToString(tile)})"></rect>
    {/each}

    {#if movingSelectionState.isMoving}
      {#each movingSelectionState.tiles.filter(({ pos }) => pos[2] === cursor[2]) as { pos }}
        <rect
          x="{(pos[0] - screenQube[0]) * tileWidth}"
          y="{(pos[1] - screenQube[1]) * tileWidth}"
          width="{tileWidth}"
          height="{tileWidth}"
          fill="url(#{tileToString(tilemap.defaultTile)})"></rect>
      {/each}
      {#each movingSelectionState.tiles.filter(({ pos }) => pos[2] === movingSelectionState.lastCursor[2]) as { tile, pos }}
        <rect
          x="{(cursor[0] - movingSelectionState.lastCursor[0] + pos[0] - screenQube[0]) *
            tileWidth}"
          y="{(cursor[1] - movingSelectionState.lastCursor[1] + pos[1] - screenQube[1]) *
            tileWidth}"
          width="{tileWidth}"
          height="{tileWidth}"
          fill="url(#{tileToString(tile)})"></rect>
      {/each}
    {/if}

    <rect
      x="-100%"
      y="-100%"
      width="300%"
      height="300%"
      fill="url(#grid10)"
      transform="translate({(-screenQube[0] % 10) * tileWidth}, {(-screenQube[1] % 10) *
        tileWidth})"></rect>

    {#if (0 - screenQube[0]) * tileWidth > 0}
      <rect x="0" y="0" width="{(0 - screenQube[0]) * tileWidth}" height="100%" fill="#000"></rect>
    {/if}
    {#if (0 - screenQube[1]) * tileWidth > 0}
      <rect x="0" y="0" width="100%" height="{(0 - screenQube[1]) * tileWidth}" fill="#000"></rect>
    {/if}
    <rect
      x="{(tilemap.volume[0] - screenQube[0] + 1) * tileWidth}"
      y="0"
      width="100%"
      height="100%"
      fill="#000"></rect>
    <rect
      x="0"
      y="{(tilemap.volume[1] - screenQube[1] + 1) * tileWidth}"
      width="100%"
      height="100%"
      fill="#000"></rect>

    <rect
      x="{(cursor[0] - screenQube[0]) * tileWidth}"
      y="{(cursor[1] - screenQube[1]) * tileWidth}"
      width="{tileWidth}"
      height="{tileWidth}"
      stroke="rgb(158, 112, 41)"
      stroke-width="2"
      fill="none"></rect>

    <text
      font-size="0.8em"
      alignment-baseline="before-edge"
      fill="rgb(158, 112, 41)"
      x="{(cursor[0] - screenQube[0] + 1) * tileWidth + 4}"
      y="{(cursor[1] - screenQube[1]) * tileWidth}"
    >
      {cursor[0]}, {cursor[1]}, {-cursor[2]}
    </text>

    {#if action.drawMode === DrawMode.Rectangle && action.drawRectStage === DrawRectStage.Drawing}
      <rect
        x="{(Math.min(action.drawRect[0], action.drawRect[0] + action.drawRect[3]) -
          screenQube[0]) *
          tileWidth}"
        y="{(Math.min(action.drawRect[1], action.drawRect[1] + action.drawRect[4]) -
          screenQube[1]) *
          tileWidth}"
        width="{(Math.abs(action.drawRect[3]) + 1) * tileWidth}"
        height="{(Math.abs(action.drawRect[4]) + 1) * tileWidth}"
        fill="rgb(255, 255, 255)"
        fill-opacity="0.1"
        stroke="rgb(255, 255, 255)"></rect>
    {/if}

    {#each labelManager.labelsIntersectsWith(screenQube) as label}
      <text
        x="{(label.boundary[0][0] - screenQube[0]) * tileWidth}"
        y="{(label.boundary[0][1] - screenQube[1]) * tileWidth - 2}"
        fill="{label.color}"
        fill-opacity="{label.id === focusLabel?.id ? 0.8 : 0.4}"
      >
        {label.name}
      </text>
      {#each Object.values(label.tiles).filter((tile) => tile && tile.pos[2] === screenQube[2]) as tile}
        <rect
          x="{(tile.pos[0] - screenQube[0]) * tileWidth}"
          y="{(tile.pos[1] - screenQube[1]) * tileWidth}"
          width="{tileWidth}"
          height="{tileWidth}"
          fill="{label.color}"
          fill-opacity="{label.id === focusLabel?.id ? 0.8 : 0.4}"
          mask="url(#hatch-diagonal-loose-mask)"></rect>
      {/each}
    {/each}

    {#if targetWorkshopName}
      {@const tiles = workshopManager.workshopTiles(targetWorkshopName, cursor)}
      {@const height = WorkshopManagerCommand.WORKSHOPS[targetWorkshopName].height}
      <text
        text-anchor="middle"
        x="{(cursor[0] - screenQube[0]) * tileWidth}"
        y="{(cursor[1] - Math.ceil(height * 0.5) - screenQube[1]) * tileWidth - 2}"
        fill="#fff"
      >
        {targetWorkshopName}
      </text>

      {#each tiles as tile}
        <rect
          x="{(tile.pos[0] - screenQube[0]) * tileWidth}"
          y="{(tile.pos[1] - screenQube[1]) * tileWidth}"
          width="{tileWidth}"
          height="{tileWidth}"
          fill="{'#fff'}"
          fill-opacity="1.0"
          opacity="{tile.passable ? 1.0 : 0.5}"
          mask="url(#hatch-diagonal-mask)"></rect>
      {/each}
    {/if}
    {#each workshopManager.labelsIntersectsWith(screenQube) as label}
      <use
        x="{(label.boundary[0][0] - screenQube[0]) * tileWidth - 23}"
        y="{(label.boundary[0][1] - screenQube[1]) * tileWidth - 18}"
        xlink:href="#{label.name}"
        width="1.4em"
        height="1.4em"
        fill-opacity="{label.id === focusLabel?.id ? 0.8 : 0.6}"
        style="color: {label.color}"></use>
      <text
        x="{(label.boundary[0][0] - screenQube[0]) * tileWidth}"
        y="{(label.boundary[0][1] - screenQube[1]) * tileWidth - 2}"
        fill="{label.color}"
        fill-opacity="{label.id === focusLabel?.id ? 0.8 : 0.6}"
      >
        {label.name}
      </text>
      {#each Object.values(label.tiles).filter((tile) => tile && tile.pos[2] === screenQube[2]) as tile}
        <rect
          x="{(tile.pos[0] - screenQube[0]) * tileWidth}"
          y="{(tile.pos[1] - screenQube[1]) * tileWidth}"
          width="{tileWidth}"
          height="{tileWidth}"
          fill="{label.color}"
          fill-opacity="{label.id === focusLabel?.id ? 1.0 : 0.8}"
          opacity="{tile.passable ? 1.0 : 0.5}"
          mask="{!tile.passable ? 'url(#hatch-cross-mask)' : ''}"></rect>
      {/each}
    {/each}

    {#if focusLabel}
      <rect
        x="{(focusLabel.boundary[0][0] - screenQube[0]) * tileWidth}"
        y="{(focusLabel.boundary[0][1] - screenQube[1]) * tileWidth}"
        width="{(focusLabel.boundary[1][0] - focusLabel.boundary[0][0] + 1) * tileWidth}"
        height="{(focusLabel.boundary[1][1] - focusLabel.boundary[0][1] + 1) * tileWidth}"
        fill="none"
        stroke="{focusLabel.color}"
        stroke-dasharray="4"></rect>
    {/if}

    {#if action.level1 === Action.Select}
      {#if screenQube[2] >= selectionBoundary[0][2] && screenQube[2] <= selectionBoundary[1][2]}
        <rect
          x="{(selectionBoundary[0][0] - screenQube[0]) * tileWidth}"
          y="{(selectionBoundary[0][1] - screenQube[1]) * tileWidth}"
          width="{(selectionBoundary[1][0] - selectionBoundary[0][0] + 1) * tileWidth}"
          height="{(selectionBoundary[1][1] - selectionBoundary[0][1] + 1) * tileWidth}"
          fill="none"
          stroke="rgb(128, 128, 128)"
          opacity="1.0"
          class="selection-boundary"></rect>
      {/if}

      {#if !movingSelectionState.isMoving}
        {#each selection as pos}
          {#if pos[2] === screenQube[2]}
            <rect
              x="{(pos[0] - screenQube[0]) * tileWidth}"
              y="{(pos[1] - screenQube[1]) * tileWidth}"
              width="{tileWidth}"
              height="{tileWidth}"
              fill="none"
              stroke="rgb(255, 255, 255)"
              class="selection"></rect>
          {/if}
        {/each}
      {:else}
        {#each selection as pos}
          {#if pos[2] - movingSelectionState.lastCursor[2] + cursor[2] === screenQube[2]}
            <rect
              x="{(cursor[0] - movingSelectionState.lastCursor[0] + pos[0] - screenQube[0]) *
                tileWidth}"
              y="{(cursor[1] - movingSelectionState.lastCursor[1] + pos[1] - screenQube[1]) *
                tileWidth}"
              width="{tileWidth}"
              height="{tileWidth}"
              fill="none"
              stroke="rgb(255, 255, 255)"
              class="selection"></rect>
          {/if}
        {/each}
      {/if}
    {/if}

    {#if action.level2 && [Action.PickGFMacroStartPoint, Action.PickLabelOfHotkey].includes(action.level2)}
      <rect
        x="{(cursor[0] - screenQube[0]) * tileWidth}"
        y="{(cursor[1] - screenQube[1]) * tileWidth}"
        width="{tileWidth}"
        height="{tileWidth}"
        stroke="rgb(255, 0, 0)"
        stroke-width="3"
        class="selection"
        fill="none"></rect>
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
  <div
    class="-mt-10"
    style="position: absolute; 
      left: {(focusLabel.boundary[0][0] - screenQube[0]) * tileWidth}px; 
      top:{(focusLabel.boundary[0][1] - screenQube[1]) * tileWidth}px"
  >
    <div title="label color" class="flex">
      {#each colorScheme as color, i (color)}
        <div class="relative">
          <input
            id="label-colorscheme-{i}"
            class="hidden peer"
            type="radio"
            name="label-colorscheme"
            value="{color}"
            bind:group="{focusLabel.color}"
            on:change="{() => (labelManager = labelManager)}"
          />
          <label
            class="peer-checked:border-2 border-white w-4 h-4 inline-block"
            style="background-color: {color}"
            for="label-colorscheme-{i}"></label>
          {#if color === focusLabel.color}
            <div class="absolute bottom-5 left-1 text-center text-white">↓</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div
    class="-mt-5 -ml-8"
    style="position: absolute; 
        left: {(focusLabel.boundary[0][0] - screenQube[0]) * tileWidth}px; 
        top:{(focusLabel.boundary[0][1] - screenQube[1]) * tileWidth}px"
  >
    <button
      id="remove-label"
      class="w-6 h-6 flex items-center justify-center rounded-full text-white group"
      on:click="{() => {
        if (focusLabel && labelManager.get(focusLabel.id)) {
          labelManager.remove(focusLabel.id)
          labelManager = labelManager
        } else if (focusLabel && workshopManager.get(focusLabel.id)) {
          workshopManager.remove(focusLabel.id)
          workshopManager = workshopManager
        }
        focusLabel = null
      }}"
    >
      <Icon icon="{DeleteIcon}" height="1.5em" class="group-hover:hidden" />
      <Icon icon="{DeleteForeverIcon}" height="1.5em" class="group-hover:block hidden" />
    </button>
  </div>
  <input
    id="label-name-input"
    bind:value="{focusLabel.name}"
    on:keydown|stopPropagation="{blurOnEnterOrEscape}"
    on:blur="{() => (labelManager = labelManager)}"
    class="h-4 -mt-4"
    style="position: absolute; 
      left: {(focusLabel.boundary[0][0] - screenQube[0]) * tileWidth}px; 
      top:{(focusLabel.boundary[0][1] - screenQube[1]) * tileWidth}px"
  />
{/if}

<div
  id="minimap"
  class="fixed top-0 right-0 w-64 h-64 pointer-events-none bg-white bg-opacity-5 rounded-bl-lg"
>
  <Minimap tilemap="{tilemap}" cursor="{cursor}" screenQube="{screenQube}" />
</div>

<div
  id="label-hotkeys-control"
  class="fixed bottom-0 right-0 bg-white flex items-center flex-nowrap opacity-40 hover:opacity-100 shadow rounded-lg m-4 p-2"
>
  <table class="table-auto">
    <caption class="mb-2">Label Hotkeys</caption>
    <tbody>
      {#each Object.entries(labelManager.getHotkeys()) as [key, labelId]}
        {@const label = labelId ? labelManager.get(labelId) : null}
        <tr>
          <td class="text-sm border-b p-2 text-center">
            <button
              use:hotkey="{key}"
              class:text-slate-400="{!label}"
              class:underline="{label}"
              disabled="{!label}"
              on:click="{() => {
                if (label) followLabel(label.id)
              }}"
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
                  on:click="{() => {
                    labelManager.clearHotkey(key)
                  }}"
                >
                  <Icon icon="{CloseIcon}" />
                </button>
                <button
                  class="grow text-left"
                  use:hotkey="{key}"
                  on:click="{() => followLabel(label.id)}"
                >
                  {label.name}
                </button>
              {:else}
                <button
                  class="rounded bg-slate-200 p-1 hover:bg-slate-300"
                  on:click="{() => {
                    action.level1 = Action.Label
                    action.level2 = Action.PickLabelOfHotkey
                    setWaitingHotkey = key
                  }}"
                >
                  Pick
                </button>
              {/if}
            </div>
          </td>
        </tr><tr></tr>{/each}
    </tbody>
  </table>
</div>

<div class="fixed bottom-14 m-8 flex flex-col">
  <WorkshopSelect
    bind:targetWorkshopName="{targetWorkshopName}"
    open="{action.level1 === Action.Workshop}"
  />
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
          value="{Action.Label}"
          bind:group="{action.level2}"
          use:hotkey="{'l'}"
          checked="{action.level1 === Action.Label}"
        />
        <label for="action-label" title="label">
          <Icon icon="{LabelIcon}" height="1.5em" />
          <span class="hotkey"> l </span>
        </label>
      </div>
      <div>
        <input
          id="action-erase-label-area"
          type="radio"
          name="action"
          class="hidden"
          value="{Action.EraseLabelArea}"
          bind:group="{action.level2}"
          use:hotkey="{'x'}"
        />
        <label for="action-erase-label-area" title="erase label area">
          <Icon icon="{EraseIcon}" height="1.5em" />
          <span class="hotkey"> x </span>
        </label>
      </div>
    {:else if action.level1 === Action.DesignateMine}
      <div>
        <input
          id="action-designate-dig"
          type="radio"
          name="action"
          class="hidden"
          value="{Action.DesignateDig}"
          bind:group="{action.level2}"
          use:hotkey="{'m'}"
          checked="{action.level1 === Action.DesignateMine}"
        />
        <label for="action-designate-dig">
          <Icon icon="{DigIcon}" height="1.5em" />
          <span class="hotkey"> m </span>
        </label>
      </div>
      <div>
        <input
          id="action-designate-staris"
          type="radio"
          name="action"
          class="hidden"
          value="{Action.DesignateStairs}"
          bind:group="{action.level2}"
          use:hotkey="{'t'}"
        />
        <label for="action-designate-staris">
          <Icon icon="{StairIcon}" height="1.5em" />
          <span class="hotkey"> t </span>
        </label>
      </div>
      <div>
        <input
          id="action-designate-channel"
          type="radio"
          name="action"
          class="hidden"
          value="{Action.DesignateChannel}"
          bind:group="{action.level2}"
          use:hotkey="{'u'}"
        />
        <label for="action-designate-channel">
          <Icon icon="{ChannelIcon}" height="1.5em" />
          <span class="hotkey"> u </span>
        </label>
      </div>
      <div>
        <input
          id="action-designate-ramp"
          type="radio"
          name="action"
          class="hidden"
          value="{Action.DesignateRamp}"
          bind:group="{action.level2}"
          use:hotkey="{'r'}"
        />
        <label for="action-designate-ramp">
          <Icon icon="{RampIcon}" height="1.5em" />
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
          value="{Action.Select}"
          bind:group="{action.level1}"
          use:hotkey="{'Control+g'}"
        />
        <label for="action-select-l2" title="select">
          <Icon icon="{SelectIcon}" height="1.5em" />
        </label>
      </div>
      <div>
        <button id="action-copy-selection" on:click="{copySelection}" use:hotkey="{'Control+c'}">
          <Icon icon="{CopyIcon}" height="1.5em" />
          <span class="hotkey"> ctrl+c </span>
        </button>
      </div>
      <div>
        <button id="action-cut-selection" on:click="{cutSelection}" use:hotkey="{'Control+x'}">
          <Icon icon="{CutIcon}" height="1.5em" />
          <span class="hotkey"> ctrl+x </span>
        </button>
      </div>
      <div>
        <button id="action-paste-selection" on:click="{pasteSelection}" use:hotkey="{'Control+v'}">
          <Icon icon="{PasteIcon}" height="1.5em" />
          <span class="hotkey"> ctrl+v </span>
        </button>
      </div>

      <div class="ml-2">
        <button
          id="action-rotate-selection-cw"
          on:click="{() => rotateSelection(false)}"
          use:hotkey="{'Control+r'}"
        >
          <Icon icon="{RotateCWIcon}" height="1.5em" />
          <span class="hotkey"> ctrl+r </span>
        </button>
      </div>
      <div>
        <button
          id="action-rotate-selection-ccw"
          on:click="{() => rotateSelection(true)}"
          use:hotkey="{'Control+R'}"
        >
          <Icon icon="{RotateCCWIcon}" height="1.5em" />
          <span class="hotkey"> ctrl+R </span>
        </button>
      </div>
      <div class="ml-2">
        <button
          id="action-flip-selection-horiz"
          on:click="{() => flipSelection(false)}"
          use:hotkey="{'Control+f'}"
        >
          <Icon icon="{FlipHorizIcon}" height="1.5em" />
          <span class="hotkey"> ctrl+f </span>
        </button>
      </div>
      <div>
        <button
          id="action-flip-selection-vert"
          on:click="{() => flipSelection(true)}"
          use:hotkey="{'Control+F'}"
        >
          <Icon icon="{FlipVertIcon}" height="1.5em" />
          <span class="hotkey"> ctrl+F </span>
        </button>
      </div>
    {/if}

    <div id="actionbox-drawmode" class="flex pl-8 [&>*]:m-0.5">
      {#if (action.level2 && ALLOWED_DRAW_MODES[action.level2]?.includes(DrawMode.Rectangle)) || (action.level1 && ALLOWED_DRAW_MODES[action.level1]?.includes(DrawMode.Rectangle))}
        <div>
          <input
            id="drawmode-rectangle"
            type="radio"
            name="drawmode"
            class="hidden"
            value="{DrawMode.Rectangle}"
            bind:group="{action.drawMode}"
            use:hotkey="{'b'}"
          />
          <label for="drawmode-rectangle">
            <Icon icon="{RectDrawIcon}" height="1.5em" />
            <span class="hotkey"> b </span>
          </label>
        </div>
      {/if}
      {#if (action.level2 && ALLOWED_DRAW_MODES[action.level2]?.includes(DrawMode.Free)) || (action.level1 && ALLOWED_DRAW_MODES[action.level1]?.includes(DrawMode.Free))}
        <div>
          <input
            id="drawmode-free"
            type="radio"
            name="drawmode"
            class="hidden"
            value="{DrawMode.Free}"
            bind:group="{action.drawMode}"
            use:hotkey="{'B'}"
          />
          <label for="drawmode-free">
            <Icon icon="{FreeDrawIcon}" height="1.5em" />
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
        value="{Action.DesignateMine}"
        bind:group="{action.level1}"
        use:hotkey="{'m'}"
      />
      <label for="action-designate-mine" title="desinate mine">
        <Icon icon="{MineIcon}" height="1.5em" />
        <span class="hotkey"> m </span>
      </label>
    </div>

    <div>
      <input
        id="action-remove-designation"
        type="radio"
        name="action"
        class="hidden"
        value="{Action.RemoveDesignation}"
        bind:group="{action.level1}"
        use:hotkey="{'x'}"
      />
      <label for="action-remove-designation" title="remove desination">
        <Icon icon="{EraseIcon}" height="1.5em" />
        <span class="hotkey"> x </span>
      </label>
    </div>

    <div>
      <input
        id="action-workshop"
        type="radio"
        name="action"
        class="hidden"
        value="{Action.Workshop}"
        bind:group="{action.level1}"
        use:hotkey="{'o'}"
      />
      <label for="action-workshop" title="build workshop">
        <Icon icon="{WorkshopIcon}" height="1.5em" />
        <span class="hotkey"> o </span>
      </label>
    </div>

    <div class="pl-4">
      <input
        id="action-select"
        type="radio"
        name="action"
        class="hidden"
        value="{Action.Select}"
        bind:group="{action.level1}"
        use:hotkey="{'Control+g'}"
      />
      <label for="action-select" title="select">
        <Icon icon="{SelectIcon}" height="1.5em" />
        <span class="hotkey"> ctrl+g </span>
      </label>
    </div>

    <div class="pl-4">
      <input
        id="action-label"
        type="radio"
        name="action-group"
        class="hidden"
        value="{Action.Label}"
        bind:group="{action.level1}"
        use:hotkey="{'Control+l'}"
      />
      <label for="action-label" title="label">
        <Icon icon="{LabelIcon}" height="1.5em" />
        <span class="hotkey"> ctrl+l </span>
      </label>
    </div>

    <div class="pl-4">
      <button
        id="action-undo"
        title="undo"
        on:click="{() => {
          commandManager.undo()
          tilemap = tilemap
          labelManager = labelManager
          workshopManager = workshopManager
        }}"
        use:hotkey="{'Control+z'}"
      >
        <Icon icon="{UndoIcon}" height="1.5em" />
        <span class="hotkey"> ctrl+z </span>
      </button>
    </div>

    <div>
      <button
        id="action-redo"
        title="redo"
        on:click="{() => {
          commandManager.redo()
          tilemap = tilemap
          labelManager = labelManager
          workshopManager = workshopManager
        }}"
        use:hotkey="{'Control+Z'}"
        use:hotkey="{'Control+y'}"
      >
        <Icon icon="{RedoIcon}" height="1.5em" />
        <span class="hotkey"> ctrl+Z </span>
      </button>
    </div>
  </div>
</div>

<TopNav
  bind:fortName="{fortName}"
  on:genDFMacro="{(e) => {
    genDFMacroDeligate = e.detail
    pickDFMacroStartPoint()
  }}"
  on:abandonFort="{abandonFort}"
  on:resize="{(e) => {
    tilemap.resize(e.detail)
    tilemap = tilemap
  }}"
  on:uploadFort="{(e) => decryptState(e.detail)}"
  on:downloadFort="{(e) => e.detail(encryptState())}"
/>
