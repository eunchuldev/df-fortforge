<style lang="postcss">
  @reference "tailwindcss";

  #actionbox :is(label, button) {
    @apply relative grid bg-white w-12 h-12 rounded-lg shadow-sm hover:bg-slate-300 place-items-center;
  }
  #actionbox input[type='radio']:checked + label {
    @apply bg-slate-500;
  }
  #actionbox button[aria-pressed='true'] {
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
  import { untrack } from 'svelte'
  import { BuildingManagerCommand, buildingTiles } from '../lib/workshop.command.js'
  import {
    BUILD_MENU,
    BUILDINGS,
    buildingGlyph,
    buildingFootprint,
    type BuildEntry,
  } from '../lib/buildings.js'
  import { SimpleLabelManagerCommand } from '../lib/simple-label.command.js'
  import TopNav from './TopNav.svelte'
  import MemoEditor from './MemoEditor.svelte'
  import { Tile, tileToString } from '../lib/tilemap.js'
  import { TilemapCommand } from '../lib/tilemap.command.js'
  import { hotkey } from '../lib/hotkey.js'
  import Minimap from './Minimap.svelte'
  import { CommandManager } from '../lib/command.js'
  import { copySelection, pasteSelection, type SelectionClipboard } from '../lib/clipboard.js'
  import {
    applyMove,
    inBounds,
    previewMove,
    selectObject,
    selectPlan,
    type PlanSelection,
  } from '../lib/selection.js'
  import { snakeCase } from 'change-case'
  import BuildSelect from './BuildSelect.svelte'
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
  import CharacterIcon from '@iconify-icons/mdi/format-text'
  import MemoIcon from '@iconify-icons/mdi/note-text'
  import DeleteIcon from '@iconify-icons/mdi/delete-outline'
  import DeleteForeverIcon from '@iconify-icons/mdi/delete-forever-outline'
  import CloseIcon from '@iconify-icons/mdi/close'
  import BuildIcon from '@iconify-icons/mdi/hammer'

  import { genFortressName } from '../lib/df-name-gen.js'
  import { genMacro } from '../lib/df-macros.js'

  import type { Pos, Qube, Area, Volume } from '../lib/geometry'
  import {
    clampPos,
    clampQube,
    collision,
    encodePos,
    getBoundary,
    qubeIter,
    subPos,
    sumPos,
  } from '../lib/geometry.js'
  import { labelQube } from '../lib/label.js'
  import { Action, DrawMode, DrawRectStage } from '../lib/constants.js'

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
  let { tileWidth = $bindable(32) }: { tileWidth?: number } = $props()

  let fortName = $state(genFortressName())

  const tilemapVolume: Volume = [100, 100, 100]

  let commandManager = new CommandManager()

  let tilemap = $state(new TilemapCommand(commandManager, tilemapVolume))
  const action = $state<ActionState>({
    level1: null,
    level2: null,
    drawMode: DrawMode.Rectangle,
    drawRect: [0, 0, 0, 0, 0, 0],
    drawRectStage: DrawRectStage.StandBy,
  })
  const activeAction = $derived(action.level2 ?? action.level1)
  let characterCell = $state.raw<Pos | null>(null)
  let memoCell = $state.raw<Pos | null>(null)
  let characterKey: string | undefined
  const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  const canGrabEither = $derived(
    action.drawRectStage === DrawRectStage.StandBy &&
      (!activeAction || activeAction === Action.Select)
  )
  const drawModes = $derived(activeAction ? (ALLOWED_DRAW_MODES[activeAction] ?? []) : [])

  function selectAction(primary: Action | null, secondary: Action | null = null) {
    characterCell = null
    memoCell = null
    endDrag(false)
    if (primary === Action.Build || action.level1 === Action.Build) {
      setBuildPath([BUILD_MENU])
    }
    action.level1 = primary
    action.level2 = secondary
    if (drawModes.length && !drawModes.includes(action.drawMode)) action.drawMode = drawModes[0]
    if (primary === Action.Character) {
      action.drawRectStage = DrawRectStage.StandBy
      startCharacterEdit(cursor)
    } else if (primary === Action.Memo) {
      action.drawRectStage = DrawRectStage.StandBy
      focusedId = null
      mapElement.focus({ preventScroll: true })
    }
  }

  let cursor = $state<Pos>([
    Math.floor(tilemapVolume[0] * 0.5),
    Math.floor(tilemapVolume[1] * 0.5),
    0,
  ])
  let screenOrigin = $state<Pos>([0, 0, 0])
  let screenDepth = $state(0)
  const containerPixelArea = $state<Area>([0, 0])
  const screenQube = $derived<Qube>([
    ...screenOrigin,
    Math.ceil(containerPixelArea[0] / tileWidth),
    Math.ceil(containerPixelArea[1] / tileWidth),
    screenDepth,
  ])
  let shiftKey = false

  const colorScheme = randomColors({ count: 10, seed: 0 })

  let labelManager = $state(new SimpleLabelManagerCommand(commandManager))
  let buildingManager = $state(new BuildingManagerCommand(commandManager))
  const savedTiles = $derived(tilemap.serialize())
  const savedLabels = $derived(labelManager.serialize())
  const savedBuildings = $derived(buildingManager.serialize())
  let focusedId = $state<string | null>(null)
  const focusLabel = $derived(
    focusedId ? (labelManager.get(focusedId) ?? buildingManager.get(focusedId)) : null
  )
  let setWaitingHotkey = $state('')
  let buildPath = $state.raw<BuildEntry[]>([BUILD_MENU])
  const buildEntry = $derived(buildPath[buildPath.length - 1])
  const building = $derived(
    action.level1 === Action.Build && !('children' in buildEntry) ? buildEntry : undefined
  )
  const drawing = $derived(action.drawRectStage === DrawRectStage.Drawing)
  const footprint = $derived(
    building &&
      buildingFootprint(
        building,
        cursor,
        drawing ? [action.drawRect[0], action.drawRect[1], action.drawRect[2]] : undefined
      )
  )
  const footprintFits = $derived.by(() => {
    if (!footprint) return false
    const [x, y, z, w, h, d] = footprint
    return inBounds([x, y, z], tilemap.volume) && inBounds([x + w, y + h, z + d], tilemap.volume)
  })

  function setBuildPath(path: BuildEntry[]) {
    buildPath = path
    action.drawRectStage = DrawRectStage.StandBy
    focusedId = null
    if (!('children' in path[path.length - 1])) {
      updateScreenQube()
      mapElement?.focus({ preventScroll: true })
    }
  }
  let mapElement: SVGSVGElement
  let drag = $state.raw<{
    contents: PlanSelection
    start: Pos
    pointerId?: number
    selectOnClick: boolean
  }>()
  const dragTiles = $derived(drag ? tilemap.tilesAt(drag.contents.positions) : [])
  const move = $derived(
    drag && previewMove(drag.contents, subPos(cursor, drag.start), tilemap.volume)
  )
  const dragOffset = $derived<Pos>(
    move && drag?.contents.positions.length ? move.offset : [0, 0, 0]
  )
  const canOpenMemo = $derived(
    !drag && !characterCell && (!activeAction || activeAction === Action.Memo)
  )
  const memoSize = $derived(Math.min(24, Math.ceil(tileWidth * 0.6)))
  const draggedCells = $derived(new Set(drag?.contents.positions.map(encodePos)))
  const visibleMemos = $derived.by(() => {
    const visible = []
    for (const cell of tilemap.getMemos()) {
      let pos = cell.pos
      if (move && draggedCells.size) {
        if (draggedCells.has(encodePos(pos))) pos = sumPos(pos, move.offset)
        else if (draggedCells.has(encodePos(subPos(pos, move.offset)))) continue
      }
      if (pos[2] === screenQube[2] && collision(screenQube, [...pos, 0, 0, 0])) {
        visible.push({ pos, memo: cell.memo })
      }
    }
    return visible
  })
  const visibleBuildings = $derived(
    buildingManager.labelsIntersectsWith(screenQube, move?.workshops)
  )
  const wallPositions = $derived.by(() => {
    const positions = new Set<string>()
    for (const label of buildingManager.getLabels()) {
      if (label.buildingType === 'Wall') {
        const tiles = move?.workshops.get(label.id)?.tiles ?? label.tiles
        for (const key of Object.keys(tiles)) positions.add(key)
      }
    }
    return positions
  })

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

  if (typeof window !== 'undefined') loadLastState()
  $effect(() => {
    if (fortName) localStorage.setItem('state', encryptState())
  })

  function decryptState(data: string) {
    const state = JSON.parse(data) as State

    selectAction(null)
    if (state.tilemap) tilemap.deserialize(state.tilemap)
    if (state.labelManager) labelManager.deserialize(state.labelManager)
    if (state.workshopManager) buildingManager.deserialize(state.workshopManager)
    else buildingManager = new BuildingManagerCommand(commandManager)
    fortName = state.fortName ?? fortName
    cursor = state.cursor ?? cursor
    if (state.screenQube) {
      const [x, y, z, , , depth] = state.screenQube
      screenOrigin = [x, y, z]
      screenDepth = depth
    }
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
    commandManager.clear()
  }

  function encryptState(): string {
    return JSON.stringify({
      tilemap: savedTiles,
      labelManager: savedLabels,
      workshopManager: savedBuildings,
      fortName,
      // Include the current view in each save without writing a fort on every mouse move.
      ...untrack(() => ({ cursor: [...cursor], screenQube, tileWidth })),
      savedAt: new Date().toISOString(),
    })
  }

  function loadLastState() {
    try {
      const val = localStorage.getItem('state')
      if (val) decryptState(val)
    } catch {
      alert('fail to load last state')
    }
  }

  function abandonFort() {
    if (confirm('Really Abandon Your Fortress?')) {
      selectAction(null)
      commandManager = new CommandManager()
      tilemap = new TilemapCommand(commandManager, tilemapVolume)
      labelManager = new SimpleLabelManagerCommand(commandManager)
      buildingManager = new BuildingManagerCommand(commandManager)

      cursorAt(Math.floor(tilemapVolume[0] * 0.5), Math.floor(tilemapVolume[1] * 0.5), 0)
      screenOrigin[0] = Math.floor(cursor[0] - screenQube[3] * 0.5)
      screenOrigin[1] = Math.floor(cursor[1] - screenQube[4] * 0.5)
    }
  }

  function updateScreenQube() {
    const cursorRelativeX = cursor[0] - screenQube[0]
    const cursorRelativeY = cursor[1] - screenQube[1]
    if (cursorRelativeX < 0) screenOrigin[0] += cursorRelativeX
    else if (cursorRelativeX + 1 >= screenQube[3])
      screenOrigin[0] += cursorRelativeX + 1 - screenQube[3]
    if (cursorRelativeY < 0) screenOrigin[1] += cursorRelativeY
    else if (cursorRelativeY + 1 >= screenQube[4])
      screenOrigin[1] += cursorRelativeY + 1 - screenQube[4]
    screenOrigin[2] = cursor[2]
  }
  function updateDrawRect() {
    if (action.drawRectStage === DrawRectStage.Drawing) {
      if (building && building.name !== 'Stairs' && action.drawRect[2] !== cursor[2]) {
        action.drawRectStage = DrawRectStage.StandBy
        return
      }
      for (let i = 0; i < 3; ++i) action.drawRect[i + 3] = cursor[i] - action.drawRect[i]
    }
  }
  function cursorAt(x: number, y: number, z: number) {
    const [width, height, floorLimit] = tilemap.volume
    const pos = clampPos([x, y, z], [0, 0, -floorLimit], [width, height, floorLimit])
    if (!atCursor(pos)) {
      cursor = pos
      updateScreenQube()
      updateDrawRect()
    }
  }
  function cursorBy(x: number, y: number, z: number) {
    cursorAt(cursor[0] + x, cursor[1] + y, cursor[2] + z)
  }
  function panBy(pos: Pos) {
    for (let i = 0; i < 2; ++i) {
      if (cursor[i] + pos[i] >= 0 && cursor[i] + pos[i] <= tilemap.volume[i]) {
        cursor[i] += pos[i]
        screenOrigin[i] += pos[i]
      }
    }
  }

  function pointerPosition(e: MouseEvent): Pos {
    const rect = mapElement.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width - 1))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height - 1))
    return [
      Math.floor(x / tileWidth) + screenOrigin[0],
      Math.floor(y / tileWidth) + screenOrigin[1],
      screenOrigin[2],
    ]
  }
  function atCursor(pos: Pos) {
    return pos.every((value, axis) => value === cursor[axis])
  }
  function onPointerDown(e: PointerEvent) {
    if (!e.isPrimary || e.button !== 0 || drag?.pointerId !== undefined) return
    const pos = pointerPosition(e)
    if (activeAction === Action.Character) {
      e.preventDefault()
      startCharacterEdit(pos)
      return
    }
    if (activeAction === Action.Memo) {
      e.preventDefault()
      openMemo(pos)
      return
    }
    if (characterCell) closeCharacterEdit()
    cursorAt(...pos)
    shiftKey = e.shiftKey
    if (execute(e)) e.preventDefault()
  }
  function onMouseRightClick(e: MouseEvent) {
    if (goBack()) e.preventDefault()
  }
  function onPointerUp(e: PointerEvent) {
    if (e.button !== 0 || drag?.pointerId !== e.pointerId) return
    cursorAt(...pointerPosition(e))
    const selectOnClick = drag.selectOnClick && atCursor(drag.start)
    endDrag(true)
    if (selectOnClick) execute()
  }
  function cancelPointerDrag(e: PointerEvent) {
    if (drag?.pointerId === e.pointerId) endDrag(false)
  }
  function onWheel(e: WheelEvent) {
    if (characterCell) closeCharacterEdit()
    if (e.deltaY > 0) cursorBy(0, 0, 1)
    else cursorBy(0, 0, -1)
  }
  function onPointerMove(e: PointerEvent) {
    if (
      characterCell ||
      !e.isPrimary ||
      (drag?.pointerId !== undefined && drag.pointerId !== e.pointerId)
    )
      return
    cursorAt(...pointerPosition(e))
    if (drag?.selectOnClick && !atCursor(drag.start)) {
      drag = { ...drag, selectOnClick: false }
    }
  }

  const canEditCharacter = $derived(!drag && (!activeAction || activeAction === Action.Character))

  function startCharacterEdit(pos: Pos) {
    if (!canEditCharacter || !inBounds(pos, tilemap.volume)) return
    focusedId = null
    cursorAt(...pos)
    updateScreenQube()
    characterCell = [...pos]
  }

  function closeCharacterEdit(focusMap = true) {
    if (activeAction === Action.Character) selectAction(null)
    else characterCell = null
    if (focusMap) mapElement.focus({ preventScroll: true })
  }

  function openMemo(pos: Pos) {
    if (!inBounds(pos, tilemap.volume)) return
    focusedId = null
    cursorAt(...pos)
    updateScreenQube()
    memoCell = [...pos]
  }

  function writeCharacter(text: string) {
    if (!characterCell) return
    tilemap.setAnnotation(
      characterCell,
      'character',
      graphemes.segment(text).containing(0)?.segment
    )
    closeCharacterEdit()
  }

  function onCharacterKeyDown(e: KeyboardEvent) {
    e.stopPropagation()
    characterKey = e.code
    if (e.isComposing) return
    if (e.key === 'Escape') closeCharacterEdit()
    else if (e.key === 'Backspace' || e.key === 'Delete') writeCharacter('')
    else return
    e.preventDefault()
  }

  function startDrag(contents: PlanSelection | undefined, e?: PointerEvent, selectOnClick = false) {
    if (!contents) return
    drag = { contents, start: [...cursor], pointerId: e?.pointerId, selectOnClick }
    if (e) mapElement.setPointerCapture(e.pointerId)
  }
  function endDrag(commit: boolean) {
    if (!drag) return
    if (commit && move) {
      const positions = applyMove(plan, drag.contents, move)
      if (positions.length) selection = positions
    }
    const { pointerId } = drag
    drag = undefined
    if (pointerId !== undefined && mapElement.hasPointerCapture(pointerId)) {
      mapElement.releasePointerCapture(pointerId)
    }
  }

  function focusObject(e?: PointerEvent) {
    if (
      activeAction !== Action.Build &&
      (shiftKey || action.drawRectStage === DrawRectStage.Drawing)
    )
      return false
    const id = (e?.target as Element | undefined)?.closest<SVGGElement>('[data-object-id]')?.dataset
      .objectId
    let layer: 'labels' | 'workshops'
    if (activeAction === Action.Label) layer = 'labels'
    else if (activeAction === Action.Build) layer = 'workshops'
    else if (id && canGrabEither) layer = buildingManager.get(id) ? 'workshops' : 'labels'
    else return false

    const manager = plan[layer]
    const label = (id ? manager.get(id) : undefined) ?? manager.labelsAt(cursor)[0]
    if (!label) return false
    const selectOnClick = activeAction === Action.Select
    if (!selectOnClick) focusedId = label.id
    if (e) startDrag(selectObject(label, layer), e, selectOnClick)
    return true
  }

  function followLabel(id: string) {
    const label = labelManager.get(id)
    if (!label) return
    const center = [...Array(3).keys()]
      .map((i) => 0.5 * (label.boundary[0][i] + label.boundary[1][i]))
      .map(Math.floor)
    cursorAt(center[0], center[1], center[2])
    for (let i = 0; i < 2; ++i) {
      screenOrigin[i] = Math.floor(cursor[i] - screenQube[i + 3] * 0.5)
    }
  }

  function executeAction(action: Action, qube: Qube): boolean {
    let executing = true
    switch (action) {
      case Action.DesignateMine:
      case Action.DesignateDig:
        tilemap.dig(qube)
        break
      case Action.DesignateRamp:
        tilemap.ramp(qube)
        break
      case Action.DesignateChannel:
        tilemap.channel(qube)
        break
      case Action.RemoveDesignation:
        tilemap.remove(qube)
        break
      case Action.DesignateStairs:
        tilemap.stairs(qube)
        break
      case Action.Select:
        select(qube)
        break
      case Action.Label:
        if (shiftKey && focusedId && labelManager.get(focusedId))
          labelManager.extendArea(focusedId, qube)
        else labelManager.addSimpleLabel(qube)
        break
      case Action.EraseLabelArea:
        labelManager.eraseArea(qube)
        break
      default:
        executing = false
        break
    }
    return executing
  }

  function startRectangle() {
    action.drawRectStage = DrawRectStage.Drawing
    action.drawRect = [...cursor, 0, 0, 0]
  }

  function execute(e?: PointerEvent): boolean {
    if (drag) {
      if (drag.pointerId === undefined) endDrag(true)
      return true
    }
    let executing = false
    if (action.level2 === Action.PickGFMacroStartPoint) {
      genDFMacro([...cursor])
      executing = true
    } else if (action.level2 === Action.PickLabelOfHotkey) {
      const label = labelManager.labelsAt(cursor)?.[0]
      if (label) labelManager.setHotkey(setWaitingHotkey, label.id)
      selectAction(action.level1)
    } else if (building && footprint) {
      if (!footprintFits) return true
      if (building.rectangle && !drawing) startRectangle()
      else {
        buildingManager.placeBuilding(building, footprint)
        action.drawRectStage = DrawRectStage.StandBy
      }
      return true
    } else if (
      !shiftKey &&
      action.level1 === Action.Select &&
      action.drawRectStage !== DrawRectStage.Drawing &&
      selection.some(atCursor)
    ) {
      startDrag(selectPlan(plan, selection), e)
      executing = true
    } else if (focusObject(e)) {
      executing = true
    } else if (
      action.drawMode === DrawMode.Rectangle &&
      activeAction &&
      drawModes.includes(DrawMode.Rectangle)
    ) {
      if (action.drawRectStage === DrawRectStage.StandBy) {
        if (action.level1 === Action.Select && !shiftKey) selection = []
        else if (action.level1 === Action.Label && !shiftKey) focusedId = null
        startRectangle()
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
        executing = executeAction(activeAction, qube)
      }
    } else if (
      action.drawMode === DrawMode.Free &&
      activeAction &&
      drawModes.includes(DrawMode.Free)
    ) {
      executing = executeAction(activeAction, [...cursor, 0, 0, 0])
    }
    return executing
  }

  function goBack() {
    if (characterCell) {
      closeCharacterEdit()
      return true
    }
    if (drag) {
      endDrag(false)
      return true
    }
    let escaping = false
    if (action.level2 === Action.PickGFMacroStartPoint) {
      selectAction(null)
      escaping = true
    }
    if (action.drawRectStage === DrawRectStage.Drawing) {
      action.drawRectStage = DrawRectStage.StandBy
      escaping = true
    } else if (action.level1 === Action.Select && selection.length && !shiftKey) {
      selection = []
      escaping = true
    } else if (focusLabel) {
      focusedId = null
      escaping = true
    } else if (action.level1 === Action.Build && buildPath.length > 1) {
      setBuildPath(buildPath.slice(0, -1))
      escaping = true
    } else if (action.level2 !== null) {
      selectAction(action.level1)
      escaping = true
    } else if (action.level1 !== null) {
      selectAction(null)
      escaping = true
    }
    return escaping
  }

  function zoomTo(width: number, round: (n: number) => number) {
    const screenCenter = [screenQube[0] + screenQube[3] * 0.5, screenQube[1] + screenQube[4] * 0.5]
    tileWidth = width
    screenOrigin[0] = round(screenCenter[0] - screenQube[3] * 0.5)
    screenOrigin[1] = round(screenCenter[1] - screenQube[4] * 0.5)
  }

  let selection = $state.raw<Pos[]>([])
  const displayedSelection = $derived(
    drag?.contents.positions.length ? drag.contents.positions : selection
  )
  const selectionBoundary = $derived(getBoundary(displayedSelection))
  function select(qube: Qube) {
    const positions = [...qubeIter(qube)]
    selection = shiftKey ? selection.concat(positions) : positions
  }
  const plan = $derived({ tilemap, labels: labelManager, workshops: buildingManager })
  let clipboard: SelectionClipboard | undefined
  function copy(cut: boolean) {
    clipboard = copySelection(plan, selection, cut) ?? clipboard
  }
  function paste() {
    if (clipboard) selection = pasteSelection(plan, clipboard, cursor)
  }
  function rotateSelection(ccw = false) {
    const { tiles } = tilemap.rotate2d(selection, ccw)

    selection = tiles.map(({ pos }) => pos)
  }
  function flipSelection(vertical = false) {
    const { tiles } = tilemap.flip2d(selection, vertical)

    selection = tiles.map(({ pos }) => pos)
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === characterKey) characterKey = undefined
    if (e.key === 'Shift') shiftKey = false
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey) {
      endDrag(false)
      return
    }
    if (e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return
    const target = e.target instanceof Element ? e.target : null
    if (target?.closest('input:not([type=radio]), textarea, select, [contenteditable=true]')) return
    if (e.key === 'Enter' && target?.closest('button, a, input')) return
    const cursorStep = e.shiftKey ? 10 : 1
    const panStep = e.altKey ? 1 : e.shiftKey ? 20 : 10
    shiftKey = e.shiftKey
    if (!action.level1 && e.key === 'b' && !e.altKey && !e.metaKey) {
      selectAction(Action.Build)
      e.preventDefault()
      return
    }
    if (action.level1 === Action.Build && !e.altKey && !e.metaKey && 'children' in buildEntry) {
      const choice = buildEntry.children.find((entry) => entry.hotkey === e.key)
      if (choice) {
        if (!e.repeat) setBuildPath([...buildPath, choice])
        e.preventDefault()
        return
      }
    }
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
        if (activeAction === Action.Memo) {
          if (!e.repeat) openMemo(cursor)
        } else if (canEditCharacter) {
          if (!e.repeat && !e.altKey && !e.metaKey) startCharacterEdit(cursor)
        } else if (!building || !e.repeat) execute()
        break
      case 'Backspace':
      case 'Delete':
        if (
          activeAction ||
          drag ||
          characterCell ||
          e.altKey ||
          e.metaKey ||
          e.shiftKey ||
          e.isComposing
        )
          return
        if (!e.repeat) tilemap.setAnnotation(cursor, 'character')
        break
      case 'Escape':
        if (action.level1 === Action.Build) selectAction(null)
        else goBack()
        break
      case '[':
        if (tileWidth >= 20) zoomTo(tileWidth - 12, Math.ceil)
        break
      case ']':
        if (tileWidth < 128) zoomTo(tileWidth + 12, Math.floor)
        break
      default:
        return
    }
    e.preventDefault()
  }

  let showMacro: (text: string) => void
  function pickDFMacroStartPoint(onReady: typeof showMacro) {
    showMacro = onReady
    selectAction(Action.GFMacro, Action.PickGFMacroStartPoint)
  }
  function genDFMacro(startPoint: Pos) {
    selectAction(Action.GFMacro, Action.SaveGFMacro)
    showMacro(genMacro(snakeCase(fortName), tilemap, startPoint))
  }

  function blurOnEnterOrEscape(e: KeyboardEvent) {
    e.stopPropagation()
    if (['Enter', 'Escape'].includes(e.key)) {
      ;(e.target as HTMLInputElement).blur()
      return false
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} onblur={() => endDrag(false)} />

<svelte:head>
  <title>{fortName} - DF Fort Forge</title>
</svelte:head>

<div
  class="overflow-hidden w-full h-full relative"
  bind:clientWidth={containerPixelArea[0]}
  bind:offsetHeight={containerPixelArea[1]}
>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (The map editor supports keyboard navigation and drawing via svelte:window.) -->
  <svg
    bind:this={mapElement}
    role="application"
    aria-label="Fortress map"
    tabindex="0"
    class="w-full h-full touch-none select-none"
    class:cursor-grabbing={!!drag}
    onkeydown={(e) => {
      // A held character key can repeat on the map after the input closes.
      if (e.repeat && e.code === characterKey) e.preventDefault()
    }}
    onpointermove={onPointerMove}
    onpointerdown={onPointerDown}
    onpointerup={onPointerUp}
    ondblclick={(e) => startCharacterEdit(pointerPosition(e))}
    onpointercancel={cancelPointerDrag}
    onlostpointercapture={cancelPointerDrag}
    oncontextmenu={onMouseRightClick}
    onwheel={onWheel}
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
        ></path>
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
          stroke="white"
        ></path>
      </pattern>
      <pattern id="hatch-diagonal-loose" patternUnits="userSpaceOnUse" width="8" height="8">
        <path
          d="M-1,1 l2,-2
                 M0,8 l8,-8
                 M7,9 l4,-4"
          stroke-width="1"
          fill="none"
          stroke="white"
        ></path>
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
        id={tileToString(Tile.OpenSpace)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="rgb(128, 148, 160)" fill-opacity="0.8"
        ></rect>
      </pattern>
      <pattern
        id={tileToString(Tile.Wall)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="rgb(49, 44, 52)"></rect>
      </pattern>
      <pattern
        id={tileToString(Tile.Ramp)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="url(#{tileToString(Tile.Floor)})"></rect>
        <polygon
          points="{tileWidth * 0.5} 4, {tileWidth - 4} {tileWidth - 4}, 4 {tileWidth - 4}"
          fill="rgb(1, 205, 255)"
        ></polygon>
      </pattern>
      <pattern
        id={tileToString(Tile.Channel)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="url(#{tileToString(Tile.OpenSpace)})"
        ></rect>
        <polygon
          points="4 4, {tileWidth - 4} 4, {tileWidth * 0.5} {tileWidth - 4}"
          fill="rgb(40, 88, 103)"
        ></polygon>
      </pattern>
      <pattern
        id={tileToString(Tile.UpStair)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="url(#{tileToString(Tile.Floor)})"></rect>
        <path
          d="M4 4, L{tileWidth - 4} {tileWidth * 0.5}, L4 {tileWidth - 4}"
          stroke="rgb(0, 0, 0)"
          stroke-width="3"
          fill="none"
        ></path>
      </pattern>
      <pattern
        id={tileToString(Tile.DownStair)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="url(#{tileToString(Tile.Floor)})"></rect>
        <path
          d="M{tileWidth - 4} 4, L4 {tileWidth * 0.5}, L{tileWidth - 4} {tileWidth - 4}"
          stroke="rgb(0, 0, 0)"
          stroke-width="3"
          fill="none"
        ></path>
      </pattern>
      <pattern
        id={tileToString(Tile.UpDownStair)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="url(#{tileToString(Tile.Floor)})"></rect>
        <path
          d="M4 4, L{tileWidth - 4} {tileWidth - 4}, M4 {tileWidth - 4}, L{tileWidth - 4} 4"
          stroke="rgb(0, 0, 0)"
          stroke-width="3"
          fill="none"
        ></path>
      </pattern>
      <pattern
        id={tileToString(Tile.Floor)}
        width={tileWidth}
        height={tileWidth}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth} height={tileWidth} fill="rgb(99, 94, 102)"></rect>
      </pattern>
      <pattern id="grid" width={tileWidth} height={tileWidth} patternUnits="userSpaceOnUse">
        <path
          d="M {tileWidth} 0 L 0 0 0 {tileWidth}"
          fill="none"
          stroke="rgb(158, 112, 41)"
          stroke-width="1"
          stroke-dasharray="3 3"
        ></path>
      </pattern>
      <pattern
        id="grid10"
        width={tileWidth * 10}
        height={tileWidth * 10}
        patternUnits="userSpaceOnUse"
      >
        <rect width={tileWidth * 10} height={tileWidth * 10} fill="url(#grid)"></rect>
        <path
          d="M {tileWidth * 10} 0 L 0 0 0 {tileWidth * 10}"
          fill="none"
          stroke="rgb(158, 112, 41)"
          stroke-width="3"
          stroke-dasharray="3 3"
        ></path>
      </pattern>
      {#each BUILDINGS.values() as { name, icon }}
        {#if icon}
          <svg
            viewBox="0 0 {icon.width || 512} {icon.height || 512}"
            id="building-{name.replaceAll(' ', '-')}"
          >
            <g>
              {@html icon.body}
            </g>
          </svg>
        {/if}
      {/each}
    </defs>

    <rect width="100%" height="100%" fill="url(#{tileToString(tilemap.defaultTile)})"></rect>

    {#each tilemap.tiles(screenQube) as { tile, pos }}
      <rect
        x={(pos[0] - screenQube[0]) * tileWidth}
        y={(pos[1] - screenQube[1]) * tileWidth}
        width={tileWidth}
        height={tileWidth}
        fill="url(#{tileToString(tile)})"
      ></rect>
    {/each}

    <g aria-label="Tile characters" pointer-events="none">
      {#each tilemap.charactersIn(screenQube) as { pos, character }}
        {#if pos[2] === screenQube[2] && !(characterCell && atCursor(pos))}
          {@render glyphTile(pos, character)}
        {/if}
      {/each}
    </g>

    {#if move}
      {#each dragTiles.filter(({ pos }) => pos[2] === screenQube[2]) as { pos }}
        <rect
          x={(pos[0] - screenQube[0]) * tileWidth}
          y={(pos[1] - screenQube[1]) * tileWidth}
          width={tileWidth}
          height={tileWidth}
          fill="url(#{tileToString(tilemap.defaultTile)})"
        ></rect>
      {/each}
      {#each dragTiles.filter(({ pos }) => pos[2] + dragOffset[2] === screenQube[2]) as { tile, pos, character }}
        <rect
          x={(pos[0] + dragOffset[0] - screenQube[0]) * tileWidth}
          y={(pos[1] + dragOffset[1] - screenQube[1]) * tileWidth}
          width={tileWidth}
          height={tileWidth}
          fill="url(#{tileToString(tile)})"
        ></rect>
        {#if character}
          {@render glyphTile(sumPos(pos, dragOffset), character)}
        {/if}
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
    ></rect>

    {#if (0 - screenQube[0]) * tileWidth > 0}
      <rect x="0" y="0" width={(0 - screenQube[0]) * tileWidth} height="100%" fill="#000"></rect>
    {/if}
    {#if (0 - screenQube[1]) * tileWidth > 0}
      <rect x="0" y="0" width="100%" height={(0 - screenQube[1]) * tileWidth} fill="#000"></rect>
    {/if}
    <rect
      x={(tilemap.volume[0] - screenQube[0] + 1) * tileWidth}
      y="0"
      width="100%"
      height="100%"
      fill="#000"
    ></rect>
    <rect
      x="0"
      y={(tilemap.volume[1] - screenQube[1] + 1) * tileWidth}
      width="100%"
      height="100%"
      fill="#000"
    ></rect>

    <rect
      x={(cursor[0] - screenQube[0]) * tileWidth}
      y={(cursor[1] - screenQube[1]) * tileWidth}
      width={tileWidth}
      height={tileWidth}
      stroke="rgb(158, 112, 41)"
      stroke-width="2"
      fill="none"
    ></rect>

    <text
      font-size="0.8em"
      alignment-baseline="before-edge"
      fill="rgb(158, 112, 41)"
      x={(cursor[0] - screenQube[0] + 1) * tileWidth + 4}
      y={(cursor[1] - screenQube[1]) * tileWidth}
    >
      {cursor[0]}, {cursor[1]}, {-cursor[2]}
    </text>

    {#if !building && action.drawMode === DrawMode.Rectangle && drawing}
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
      ></rect>
    {/if}

    {#each labelManager.labelsIntersectsWith(screenQube, move?.labels) as label}
      <g
        data-object-id={label.id}
        class:cursor-grab={!drag &&
          (canGrabEither ||
            (activeAction === Action.Label && action.drawRectStage === DrawRectStage.StandBy))}
      >
        <text
          x={(label.boundary[0][0] - screenQube[0]) * tileWidth}
          y={(label.boundary[0][1] - screenQube[1]) * tileWidth - 2}
          fill={label.color}
          fill-opacity={label.id === focusLabel?.id ? 0.8 : 0.4}
        >
          {label.name}
        </text>
        {#each Object.values(label.tiles).filter((tile) => tile && tile.pos[2] === screenQube[2]) as tile}
          <rect
            x={(tile.pos[0] - screenQube[0]) * tileWidth}
            y={(tile.pos[1] - screenQube[1]) * tileWidth}
            width={tileWidth}
            height={tileWidth}
            fill={label.color}
            fill-opacity={label.id === focusLabel?.id ? 0.8 : 0.4}
            mask="url(#hatch-diagonal-loose-mask)"
          ></rect>
        {/each}
      </g>
    {/each}

    {#snippet glyphTile(pos: Pos, glyph: string, buildingColor?: string, connected = false)}
      <g
        transform="translate({(pos[0] - screenQube[0]) * tileWidth}, {(pos[1] - screenQube[1]) *
          tileWidth})"
      >
        {#if buildingColor !== undefined}
          <rect width={tileWidth} height={tileWidth} fill="#25232a" fill-opacity="0.8"></rect>
        {/if}
        <text
          x={tileWidth / 2}
          y={tileWidth / 2}
          dominant-baseline="central"
          text-anchor="middle"
          pointer-events="none"
          font-size={tileWidth * (connected ? 1 : 0.85)}
          textLength={connected ? tileWidth : undefined}
          lengthAdjust="spacingAndGlyphs"
          fill={buildingColor ?? 'black'}
          class:brightness-0={buildingColor === undefined}
        >
          {glyph}
        </text>
      </g>
    {/snippet}

    {#each visibleBuildings as label (label.id)}
      {@const type = label.buildingType && BUILDINGS.get(label.buildingType)}
      {@const area = labelQube(label)}
      <g
        data-object-id={label.id}
        class:cursor-grab={!drag && (canGrabEither || (activeAction === Action.Build && !building))}
      >
        <title>{label.name}</title>
        {#if type && type.glyph}
          {#each qubeIter(clampQube(area, screenQube)) as pos}
            {@const tile = label.tiles[encodePos(pos)]}
            {#if tile}
              {@const glyph = tile.glyph ?? buildingGlyph(type, pos, area, wallPositions)}
              {@render glyphTile(
                pos,
                glyph,
                label.color,
                type.name === 'Wall' || type.name === 'Bridge'
              )}
            {/if}
          {/each}
        {:else}
          {#if type && type.icon}
            <use
              x={(label.boundary[0][0] - screenQube[0]) * tileWidth - 23}
              y={(label.boundary[0][1] - screenQube[1]) * tileWidth - 18}
              href="#building-{type.name.replaceAll(' ', '-')}"
              width="1.4em"
              height="1.4em"
              fill-opacity={label.id === focusLabel?.id ? 0.8 : 0.6}
              style="color: {label.color}"
            ></use>
          {/if}
          <text
            x={(label.boundary[0][0] - screenQube[0]) * tileWidth}
            y={(label.boundary[0][1] - screenQube[1]) * tileWidth - 2}
            fill={label.color}
            fill-opacity={label.id === focusLabel?.id ? 0.8 : 0.6}
          >
            {label.name}
          </text>
          {#each Object.values(label.tiles).filter((tile) => tile && tile.pos[2] === screenQube[2]) as tile}
            <rect
              x={(tile.pos[0] - screenQube[0]) * tileWidth}
              y={(tile.pos[1] - screenQube[1]) * tileWidth}
              width={tileWidth}
              height={tileWidth}
              fill={label.color}
              fill-opacity={label.id === focusLabel?.id ? 1.0 : 0.8}
              opacity={tile.passable ? 1.0 : 0.5}
              stroke="#302e33"
              stroke-opacity="0.45"
              mask={!tile.passable ? 'url(#hatch-cross-mask)' : ''}
            >
              {#if type && type.impassables && tile.passable !== undefined}
                <title>{label.name} · {tile.passable ? 'Passable' : 'Impassable'}</title>
              {/if}
            </rect>
          {/each}
        {/if}
      </g>
    {/each}

    {#if building && footprint}
      {@const [x, y, , w, h] = footprint}
      {@const previewColor = footprintFits ? (building.color ?? '#fff') : '#ff7575'}
      <g pointer-events="none" aria-label="{building.name} preview">
        {#if building.glyph && !drawing}
          {@const glyph = buildingGlyph(building, cursor, footprint, wallPositions)}
          {@render glyphTile(cursor, glyph, previewColor)}
        {:else if !building.rectangle}
          {#each buildingTiles(building, footprint) as tile}
            <rect
              x={(tile.pos[0] - screenQube[0]) * tileWidth}
              y={(tile.pos[1] - screenQube[1]) * tileWidth}
              width={tileWidth}
              height={tileWidth}
              fill={previewColor}
              opacity={tile.passable ? 1 : 0.5}
              mask={tile.passable ? 'url(#hatch-diagonal-mask)' : 'url(#hatch-cross-mask)'}
            ></rect>
          {/each}
        {/if}
        <rect
          x={(x - screenQube[0]) * tileWidth}
          y={(y - screenQube[1]) * tileWidth}
          width={(w + 1) * tileWidth}
          height={(h + 1) * tileWidth}
          fill={previewColor}
          fill-opacity="0.13"
          stroke={previewColor}
          stroke-width="2"
          stroke-dasharray="4 2"
        ></rect>
      </g>
    {/if}

    {#if focusLabel && !move}
      <rect
        x={(focusLabel.boundary[0][0] - screenQube[0]) * tileWidth}
        y={(focusLabel.boundary[0][1] - screenQube[1]) * tileWidth}
        width={(focusLabel.boundary[1][0] - focusLabel.boundary[0][0] + 1) * tileWidth}
        height={(focusLabel.boundary[1][1] - focusLabel.boundary[0][1] + 1) * tileWidth}
        fill="none"
        stroke={focusLabel.color}
        stroke-dasharray="4"
      ></rect>
    {/if}

    {#if action.level1 === Action.Select}
      {#if displayedSelection.length && screenQube[2] >= selectionBoundary[2] + dragOffset[2] && screenQube[2] <= selectionBoundary[2] + selectionBoundary[5] + dragOffset[2]}
        <rect
          x={(selectionBoundary[0] + dragOffset[0] - screenQube[0]) * tileWidth}
          y={(selectionBoundary[1] + dragOffset[1] - screenQube[1]) * tileWidth}
          width={(selectionBoundary[3] + 1) * tileWidth}
          height={(selectionBoundary[4] + 1) * tileWidth}
          fill="none"
          stroke="rgb(128, 128, 128)"
          opacity="1.0"
          class="selection-boundary"
        ></rect>
      {/if}

      {#each displayedSelection as pos}
        {#if pos[2] + dragOffset[2] === screenQube[2]}
          <rect
            x={(pos[0] + dragOffset[0] - screenQube[0]) * tileWidth}
            y={(pos[1] + dragOffset[1] - screenQube[1]) * tileWidth}
            width={tileWidth}
            height={tileWidth}
            fill="none"
            stroke="rgb(255, 255, 255)"
            class="selection"
          ></rect>
        {/if}
      {/each}
    {/if}

    {#each visibleMemos as { pos, memo } (encodePos(pos))}
      <foreignObject
        x={(pos[0] - screenQube[0] + 1) * tileWidth - memoSize}
        y={(pos[1] - screenQube[1]) * tileWidth}
        width={memoSize}
        height={memoSize}
        pointer-events={canOpenMemo ? 'auto' : 'none'}
      >
        <button
          class="grid h-full w-full place-items-center rounded-sm border border-amber-900 bg-amber-200 text-amber-950 hover:bg-amber-100 focus-visible:-outline-offset-2"
          aria-label="Edit memo at {pos[0]}, {pos[1]}, {-pos[2]}F"
          title={memo}
          disabled={!canOpenMemo}
          onpointerdown={(e) => e.stopPropagation()}
          onclick={() => openMemo(pos)}
        >
          <Icon icon={MemoIcon} width="100%" height="100%" />
        </button>
      </foreignObject>
    {/each}

    {#if action.level2 && [Action.PickGFMacroStartPoint, Action.PickLabelOfHotkey].includes(action.level2)}
      <rect
        x={(cursor[0] - screenQube[0]) * tileWidth}
        y={(cursor[1] - screenQube[1]) * tileWidth}
        width={tileWidth}
        height={tileWidth}
        stroke="rgb(255, 0, 0)"
        stroke-width="3"
        class="selection"
        fill="none"
      ></rect>
      {#if action.level2 === Action.PickGFMacroStartPoint}
        <text font-size="1em" fill="rgb(255, 0, 0)" x="30%" y="30%"> Pick a macro start point</text>
      {:else if action.level2 === Action.PickLabelOfHotkey}
        <text font-size="1em" fill="rgb(255, 0, 0)" x="30%" y="30%">
          Pick a label of {setWaitingHotkey} key
        </text>
      {/if}
    {/if}
  </svg>
  {#if characterCell}
    <input
      aria-label="Tile character"
      class="absolute bg-transparent text-center text-black caret-white outline-2 -outline-offset-2 outline-white"
      style:left="{(characterCell[0] - screenQube[0]) * tileWidth}px"
      style:top="{(characterCell[1] - screenQube[1]) * tileWidth}px"
      style:width="{tileWidth}px"
      style:height="{tileWidth}px"
      style:font-size="{tileWidth * 0.85}px"
      autocomplete="off"
      autocapitalize="off"
      spellcheck={false}
      {@attach (input: HTMLInputElement) => {
        if (!characterCell) return
        input.value = tilemap.characterAt(characterCell) ?? ''
        input.focus({ preventScroll: true })
        input.select()
      }}
      onkeydown={onCharacterKeyDown}
      oninput={(e) => {
        const inputEvent = e instanceof InputEvent ? e : undefined
        if (!inputEvent?.isComposing) writeCharacter(inputEvent?.data ?? e.currentTarget.value)
      }}
      oncompositionend={(e) => {
        if (e.data) writeCharacter(e.data)
      }}
      onblur={() => closeCharacterEdit(false)}
    />
  {/if}
</div>

{#if memoCell}
  {@const pos = memoCell}
  <MemoEditor
    {pos}
    memo={tilemap.memoAt(pos)}
    onSave={(memo?: string) => tilemap.setAnnotation(pos, 'memo', memo)}
    onClose={() => {
      memoCell = null
      mapElement.focus({ preventScroll: true })
    }}
  />
{/if}

{#if focusLabel && !move}
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
            value={color}
            bind:group={focusLabel.color}
          />
          <label
            class="peer-checked:border-2 border-white w-4 h-4 inline-block"
            style="background-color: {color}"
            for="label-colorscheme-{i}"
          ></label>
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
      onclick={() => {
        if (focusLabel && labelManager.get(focusLabel.id)) {
          labelManager.remove(focusLabel.id)
        } else if (focusLabel && buildingManager.get(focusLabel.id)) {
          buildingManager.remove(focusLabel.id)
        }
        focusedId = null
      }}
    >
      <Icon icon={DeleteIcon} height="1.5em" class="group-hover:hidden" />
      <Icon icon={DeleteForeverIcon} height="1.5em" class="group-hover:block hidden" />
    </button>
  </div>
  <input
    id="label-name-input"
    bind:value={focusLabel.name}
    onkeydown={blurOnEnterOrEscape}
    class="h-4 -mt-4"
    style="position: absolute; 
      left: {(focusLabel.boundary[0][0] - screenQube[0]) * tileWidth}px; 
      top:{(focusLabel.boundary[0][1] - screenQube[1]) * tileWidth}px"
  />
{/if}

<div
  id="minimap"
  class="fixed top-0 right-0 w-64 h-64 pointer-events-none bg-white/5 rounded-bl-lg"
>
  <Minimap {tilemap} {cursor} {screenQube} />
</div>

<div
  id="label-hotkeys-control"
  class="fixed bottom-0 right-0 bg-white flex items-center flex-nowrap opacity-40 hover:opacity-100 shadow-sm rounded-lg m-4 p-2"
>
  <table class="table-auto">
    <caption class="mb-2">Label Hotkeys</caption>
    <tbody>
      {#each Object.entries(labelManager.getHotkeys()) as [key, labelId]}
        {@const label = labelId ? labelManager.get(labelId) : null}
        <tr>
          <td class="text-sm border-b p-2 text-center">
            <button
              {@attach hotkey(key)}
              class:text-slate-400={!label}
              class:underline={label}
              disabled={!label}
              onclick={() => {
                if (label) followLabel(label.id)
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
                  onclick={() => {
                    labelManager.clearHotkey(key)
                  }}
                >
                  <Icon icon={CloseIcon} />
                </button>
                <button
                  class="grow text-left"
                  {@attach hotkey(key)}
                  onclick={() => followLabel(label.id)}
                >
                  {label.name}
                </button>
              {:else}
                <button
                  class="rounded bg-slate-200 p-1 hover:bg-slate-300"
                  onclick={() => {
                    selectAction(Action.Label, Action.PickLabelOfHotkey)
                    setWaitingHotkey = key
                  }}
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

{#if action.level1 === Action.Build}
  <BuildSelect
    path={buildPath}
    {footprint}
    {drawing}
    fits={footprintFits}
    navigate={setBuildPath}
    back={goBack}
  />
{/if}
<div id="actionbox" class="fixed bottom-0 m-8 flex flex-col">
  {#if activeAction === Action.Memo && !memoCell}
    <p class="mb-1 w-fit rounded bg-amber-100 px-2 py-1 text-xs text-stone-900">
      Click a tile or press Enter to write a memo.
    </p>
  {/if}
  <div id="actionbox-level2" class="flex [&>*]:m-0.5">
    {#if action.level1 === Action.Label}
      <div>
        <input
          id="action-label"
          type="radio"
          name="secondary-action"
          class="hidden"
          value={Action.Label}
          checked={action.level2 === null || action.level2 === Action.Label}
          onchange={() => selectAction(action.level1, Action.Label)}
          {@attach hotkey('l')}
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
          name="secondary-action"
          class="hidden"
          value={Action.EraseLabelArea}
          checked={action.level2 === Action.EraseLabelArea}
          onchange={() => selectAction(action.level1, Action.EraseLabelArea)}
          {@attach hotkey('x')}
        />
        <label for="action-erase-label-area" title="erase label area">
          <Icon icon={EraseIcon} height="1.5em" />
          <span class="hotkey"> x </span>
        </label>
      </div>
    {:else if action.level1 === Action.DesignateMine}
      <div>
        <input
          id="action-designate-dig"
          type="radio"
          name="secondary-action"
          class="hidden"
          value={Action.DesignateDig}
          checked={action.level2 === null || action.level2 === Action.DesignateDig}
          onchange={() => selectAction(action.level1, Action.DesignateDig)}
          {@attach hotkey('m')}
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
          name="secondary-action"
          class="hidden"
          value={Action.DesignateStairs}
          checked={action.level2 === Action.DesignateStairs}
          onchange={() => selectAction(action.level1, Action.DesignateStairs)}
          {@attach hotkey('t')}
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
          name="secondary-action"
          class="hidden"
          value={Action.DesignateChannel}
          checked={action.level2 === Action.DesignateChannel}
          onchange={() => selectAction(action.level1, Action.DesignateChannel)}
          {@attach hotkey('u')}
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
          name="secondary-action"
          class="hidden"
          value={Action.DesignateRamp}
          checked={action.level2 === Action.DesignateRamp}
          onchange={() => selectAction(action.level1, Action.DesignateRamp)}
          {@attach hotkey('r')}
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
          name="secondary-action"
          class="hidden"
          value={Action.Select}
          checked={action.level1 === Action.Select}
          onchange={() => selectAction(Action.Select)}
          {@attach hotkey('Control+g')}
        />
        <label for="action-select-l2" title="select">
          <Icon icon={SelectIcon} height="1.5em" />
        </label>
      </div>
      <div>
        <button
          id="action-copy-selection"
          title="Copy selected tiles, characters, memos, label areas, and buildings"
          onclick={() => copy(false)}
          {@attach hotkey('Control+c')}
        >
          <Icon icon={CopyIcon} height="1.5em" />
          <span class="hotkey"> ctrl+c </span>
        </button>
      </div>
      <div>
        <button
          id="action-cut-selection"
          title="Cut selected tiles, characters, memos, label areas, and buildings"
          onclick={() => copy(true)}
          {@attach hotkey('Control+x')}
        >
          <Icon icon={CutIcon} height="1.5em" />
          <span class="hotkey"> ctrl+x </span>
        </button>
      </div>
      <div>
        <button
          id="action-paste-selection"
          title="Paste at cursor"
          onclick={paste}
          {@attach hotkey('Control+v')}
        >
          <Icon icon={PasteIcon} height="1.5em" />
          <span class="hotkey"> ctrl+v </span>
        </button>
      </div>

      <div class="ml-2">
        <button
          id="action-rotate-selection-cw"
          onclick={() => rotateSelection(false)}
          {@attach hotkey('Control+r')}
        >
          <Icon icon={RotateCWIcon} height="1.5em" />
          <span class="hotkey"> ctrl+r </span>
        </button>
      </div>
      <div>
        <button
          id="action-rotate-selection-ccw"
          onclick={() => rotateSelection(true)}
          {@attach hotkey('Control+Shift+R')}
        >
          <Icon icon={RotateCCWIcon} height="1.5em" />
          <span class="hotkey"> ctrl+R </span>
        </button>
      </div>
      <div class="ml-2">
        <button
          id="action-flip-selection-horiz"
          onclick={() => flipSelection(false)}
          {@attach hotkey('Control+f')}
        >
          <Icon icon={FlipHorizIcon} height="1.5em" />
          <span class="hotkey"> ctrl+f </span>
        </button>
      </div>
      <div>
        <button
          id="action-flip-selection-vert"
          onclick={() => flipSelection(true)}
          {@attach hotkey('Control+Shift+F')}
        >
          <Icon icon={FlipVertIcon} height="1.5em" />
          <span class="hotkey"> ctrl+F </span>
        </button>
      </div>
    {/if}

    <div id="actionbox-drawmode" class="flex pl-8 [&>*]:m-0.5">
      {#if drawModes.includes(DrawMode.Rectangle)}
        <div>
          <input
            id="drawmode-rectangle"
            type="radio"
            name="drawmode"
            class="hidden"
            value={DrawMode.Rectangle}
            bind:group={action.drawMode}
            {@attach hotkey('b')}
          />
          <label for="drawmode-rectangle">
            <Icon icon={RectDrawIcon} height="1.5em" />
            <span class="hotkey"> b </span>
          </label>
        </div>
      {/if}
      {#if drawModes.includes(DrawMode.Free)}
        <div>
          <input
            id="drawmode-free"
            type="radio"
            name="drawmode"
            class="hidden"
            value={DrawMode.Free}
            bind:group={action.drawMode}
            {@attach hotkey('Shift+B')}
          />
          <label for="drawmode-free">
            <Icon icon={FreeDrawIcon} height="1.5em" />
            <span class="hotkey"> B </span>
          </label>
        </div>
      {/if}
    </div>
  </div>

  <div id="actionbox-level1" class="flex flex-wrap [&>*]:m-0.5">
    <div>
      <input
        id="action-designate-mine"
        type="radio"
        name="primary-action"
        class="hidden"
        value={Action.DesignateMine}
        checked={action.level1 === Action.DesignateMine}
        onchange={() => selectAction(Action.DesignateMine)}
        {@attach hotkey(action.level1 === Action.Build ? null : 'm')}
      />
      <label for="action-designate-mine" title="desinate mine">
        <Icon icon={MineIcon} height="1.5em" />
        {#if action.level1 !== Action.Build}<span class="hotkey"> m </span>{/if}
      </label>
    </div>

    <div>
      <input
        id="action-remove-designation"
        type="radio"
        name="primary-action"
        class="hidden"
        value={Action.RemoveDesignation}
        checked={action.level1 === Action.RemoveDesignation}
        onchange={() => selectAction(Action.RemoveDesignation)}
        {@attach hotkey(action.level1 === Action.Build ? null : 'x')}
      />
      <label for="action-remove-designation" title="remove desination">
        <Icon icon={EraseIcon} height="1.5em" />
        {#if action.level1 !== Action.Build}<span class="hotkey"> x </span>{/if}
      </label>
    </div>

    <div>
      <button
        id="action-build"
        aria-label="Build"
        aria-pressed={action.level1 === Action.Build}
        aria-expanded={action.level1 === Action.Build}
        title={action.level1 === null ? 'Build (b)' : 'Build'}
        onclick={() => selectAction(Action.Build)}
      >
        <Icon icon={BuildIcon} height="1.5em" />
        {#if action.level1 === null}<span class="hotkey">b</span>{/if}
      </button>
    </div>

    <div class="pl-4">
      <input
        id="action-select"
        type="radio"
        name="primary-action"
        class="hidden"
        value={Action.Select}
        checked={action.level1 === Action.Select}
        onchange={() => selectAction(Action.Select)}
        {@attach hotkey('Control+g')}
      />
      <label for="action-select" title="Select an area, then drag it to move">
        <Icon icon={SelectIcon} height="1.5em" />
        <span class="hotkey"> ctrl+g </span>
      </label>
    </div>

    <div class="pl-4">
      <input
        id="action-label"
        type="radio"
        name="primary-action"
        class="hidden"
        value={Action.Label}
        checked={action.level1 === Action.Label}
        onchange={() => selectAction(Action.Label)}
        {@attach hotkey('Control+l')}
      />
      <label for="action-label" title="Draw or drag a label">
        <Icon icon={LabelIcon} height="1.5em" />
        <span class="hotkey"> ctrl+l </span>
      </label>
    </div>

    <div class="pl-4">
      <button
        id="action-character"
        aria-label="Edit tile character"
        aria-pressed={activeAction === Action.Character || !!characterCell}
        title="Type a character at the cursor or click a tile to choose it"
        onclick={() => selectAction(Action.Character)}
      >
        <Icon icon={CharacterIcon} height="1.5em" />
        {#if canEditCharacter}<span class="hotkey">Enter</span>{/if}
      </button>
    </div>

    <div class="pl-4">
      <button
        id="action-memo"
        aria-label="Post-it memo"
        aria-pressed={activeAction === Action.Memo}
        title="Post-it memo · Click a tile or press Enter"
        onclick={() => selectAction(activeAction === Action.Memo ? null : Action.Memo)}
        {@attach hotkey(action.level1 === null ? 'p' : null)}
      >
        <Icon icon={MemoIcon} height="1.5em" />
        {#if action.level1 === null}<span class="hotkey">p</span>{/if}
      </button>
    </div>

    <div class="pl-4">
      <button
        id="action-undo"
        title="undo"
        onclick={() => commandManager.undo()}
        {@attach hotkey('Control+z')}
      >
        <Icon icon={UndoIcon} height="1.5em" />
        <span class="hotkey"> ctrl+z </span>
      </button>
    </div>

    <div>
      <button
        id="action-redo"
        title="redo"
        onclick={() => commandManager.redo()}
        {@attach hotkey('Control+Shift+Z,Control+y')}
      >
        <Icon icon={RedoIcon} height="1.5em" />
        <span class="hotkey"> ctrl+Z </span>
      </button>
    </div>
  </div>
</div>

<TopNav
  bind:fortName
  tilemapVolume={tilemap.volume}
  onGenerateMacro={pickDFMacroStartPoint}
  onAbandonFort={abandonFort}
  onResize={(volume: Volume) => {
    tilemap.resize(volume)
    cursorAt(...cursor)
  }}
  onUploadFort={decryptState}
  getFortData={encryptState}
/>
