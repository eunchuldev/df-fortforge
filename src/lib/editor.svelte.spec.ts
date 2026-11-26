// @vitest-environment happy-dom
import { flushSync, mount, unmount } from 'svelte'
import { expect, test, vi } from 'vitest'
import Tilemap from '../components/Tilemap.svelte'
import { CommandManager } from './command.js'
import { SimpleLabelManagerCommand } from './simple-label.command.js'
import { TilemapCommand } from './tilemap.command.js'
import { Tile } from './tilemap.js'
import type { Qube } from './geometry'

function press(key: string, shiftKey = false) {
  const target = document.activeElement ?? document.body
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })
  )
  flushSync()
}

test('idle tiles accept one character by double-click or Enter without triggering tool shortcuts', async () => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(320)
  localStorage.removeItem('state')
  const editor = mount(Tilemap, { target: document.body })
  try {
    flushSync()
    const map = document.querySelector<SVGSVGElement>('svg[role="application"]')!
    vi.spyOn(map, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 320, 320))
    const layer = map.querySelector('[aria-label="Tile characters"]')!
    const input = () =>
      document.querySelector<HTMLInputElement>('input[aria-label="Tile character"]')
    const doubleClick = () => {
      map.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 80, clientY: 145 }))
      flushSync()
    }

    doubleClick()
    expect(document.activeElement).toBe(input())
    press('m')
    input()!.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'm' }))
    flushSync()
    expect(input()).toBeNull()
    map.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'm', repeat: true, bubbles: true, cancelable: true })
    )
    flushSync()
    expect(document.querySelector('#action-designate-mine:checked')).toBeNull()
    expect(layer.querySelector('text')?.textContent.trim()).toBe('m')
    expect(layer.querySelector('text')?.getAttribute('fill')).toBe('black')
    expect(layer.querySelector('rect')).toBeNull()

    press('Enter')
    expect(input()?.value).toBe('m')
    input()!.dispatchEvent(
      new InputEvent('input', { bubbles: true, data: 'ㅎ', isComposing: true })
    )
    flushSync()
    expect(document.activeElement).toBe(input())
    input()!.dispatchEvent(
      Object.assign(new Event('compositionend', { bubbles: true }), { data: '한' })
    )
    flushSync()
    expect(input()).toBeNull()
    const save = JSON.parse(localStorage.getItem('state')!)
    expect(JSON.parse(save.tilemap).characters).toEqual([{ pos: [2, 4, 0], character: '한' }])

    press('Enter')
    press('Escape')
    expect(layer.querySelector('text')?.textContent.trim()).toBe('한')
    press('Enter')
    press('Backspace')
    expect(layer.querySelector('text')).toBeNull()
    document.querySelector<HTMLButtonElement>('#action-undo')!.click()
    flushSync()
    expect(layer.querySelector('text')?.textContent.trim()).toBe('한')

    press('m')
    expect(document.querySelector('#action-designate-mine:checked')).toBeTruthy()
    press('Enter')
    doubleClick()
    expect(input()).toBeNull()
  } finally {
    await unmount(editor)
    vi.restoreAllMocks()
    localStorage.removeItem('state')
  }
})

test('the Character toolbar button edits the cursor tile and idle erase keys clear its character', async () => {
  localStorage.removeItem('state')
  const editor = mount(Tilemap, { target: document.body })
  try {
    flushSync()
    const button = document.querySelector<HTMLButtonElement>('#action-character')!
    const undo = document.querySelector<HTMLButtonElement>('#action-undo')!
    const savedMap = () => JSON.parse(JSON.parse(localStorage.getItem('state')!).tilemap)
    const pos = [50, 50, 0]

    press('m')
    press('Enter')
    press('Enter')
    button.click()
    flushSync()
    const input = document.querySelector<HTMLInputElement>('[aria-label="Tile character"]')!
    expect(document.activeElement).toBe(input)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'A' }))
    flushSync()
    expect(button.getAttribute('aria-pressed')).toBe('false')

    press('m')
    press('Delete')
    expect(savedMap().characters).toEqual([{ pos, character: 'A' }])
    press('Escape')
    for (const key of ['Delete', 'Backspace']) {
      press(key)
      press(key)
      expect(savedMap().characters).toEqual([])
      expect(savedMap().tilePieces).toEqual([{ pos, tile: Tile.Floor }])
      undo.click()
      flushSync()
      expect(savedMap().characters).toEqual([{ pos, character: 'A' }])
    }
  } finally {
    await unmount(editor)
    localStorage.removeItem('state')
  }
})

test('one Escape leaves Leather Works and enables the Mine shortcut', async () => {
  const editor = mount(Tilemap, { target: document.body })
  try {
    flushSync()
    for (const key of ['b', 'o', 'l', 'l']) press(key)
    expect(document.querySelector('#build-menu strong')?.textContent).toBe('Leather Works')
    press('Escape')
    expect(document.querySelector('#build-menu')).toBeNull()
    press('m')
    expect(document.querySelector('#action-designate-mine:checked')).toBeTruthy()
  } finally {
    await unmount(editor)
  }
})

test('the depot shows its walkable footprint before and after placement', async () => {
  localStorage.removeItem('state')
  const editor = mount(Tilemap, { target: document.body })
  try {
    flushSync()
    press('b')
    press('T', true)
    expect(document.querySelector('#build-menu p')?.textContent.trim()).toBe(
      'All 25 tiles are passable'
    )
    const preview = document.querySelector('[aria-label="Trade depot preview"]')!
    expect(preview.querySelectorAll('rect[mask="url(#hatch-diagonal-mask)"]')).toHaveLength(25)
    press('Enter')
    press('Escape')
    const tiles = document.querySelectorAll('[data-object-id] rect title')
    expect(Array.from(tiles, (tile) => tile.textContent)).toEqual(
      Array(25).fill('Trade depot · Passable')
    )
  } finally {
    await unmount(editor)
    localStorage.removeItem('state')
  }
})

test('floor navigation starts at 0F and stops at 100F in each direction', async () => {
  localStorage.removeItem('state')
  const editor = mount(Tilemap, { target: document.body })
  try {
    flushSync()
    const map = document.querySelector<SVGSVGElement>('svg[role="application"]')!
    const coordinates = map.querySelector(':scope > text')!
    expect(coordinates.textContent.trim()).toBe('50, 50, 0')
    map.dispatchEvent(new WheelEvent('wheel', { deltaY: -1 }))
    flushSync()
    expect(coordinates.textContent.trim()).toBe('50, 50, 1')
    for (let i = 0; i < 10; i++) press('E', true)
    expect(coordinates.textContent.trim()).toBe('50, 50, 100')
    for (let i = 0; i < 21; i++) press('C', true)
    expect(coordinates.textContent.trim()).toBe('50, 50, -100')
  } finally {
    await unmount(editor)
    localStorage.removeItem('state')
  }
})

test('views follow in-place tile edits, undo, and label edits', () => {
  const history = new CommandManager()
  const map = new TilemapCommand(history, [4, 4, 1])
  const labels = new SimpleLabelManagerCommand(history)
  const area: Qube = [1, 1, 0, 0, 0, 0]
  let visible: Tile[] = []
  let caption: string | undefined
  const stop = $effect.root(() => {
    $effect(() => {
      visible = Array.from(map.tiles(area), (piece) => piece.tile)
    })
    $effect(() => {
      caption = labels.getLabels()[0]?.name
    })
  })

  try {
    flushSync()
    map.dig(area)
    flushSync()
    expect(visible).toEqual([Tile.Floor])
    map.ramp(area)
    flushSync()
    expect(visible).toEqual([Tile.Ramp])
    history.undo()
    flushSync()
    expect(visible).toEqual([Tile.Floor])

    const label = labels.addSimpleLabel(area, 'Hall')
    flushSync()
    expect(caption).toBe('Hall')
    label.name = 'Great Hall'
    flushSync()
    expect(caption).toBe('Great Hall')
  } finally {
    stop()
  }
})
