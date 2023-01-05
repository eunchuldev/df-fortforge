import { test, expect, beforeAll, afterEach } from 'vitest'
import type { Pos } from '../utils/geometry'
import { TilemapCommand } from './tilemap.command.js'
import { CommandManager } from '../utils/command.js'
import { SimpleLabelManagerCommand } from './simple-label.command.js'
import { WorkshopManagerCommand } from './workshop.command.js'
import { WorkingStateStore } from './working-state'

const ws = new WorkingStateStore()

beforeAll(async () => {
  await ws.init()
})

afterEach(async () => {
  await ws.clear()
})

test('WorkingStateStore save load', async () => {
  const command = new CommandManager()
  const tilemap = new TilemapCommand(command)
  const labelManager = new SimpleLabelManagerCommand(command)
  const workshopManager = new WorkshopManagerCommand(command)
  const workingState = {
    fortName: 'Unnamed Fort',
    cursor: [0, 0, 0] as Pos,
    screenCenter: [0, 0, 0] as Pos,
    tileWidth: 64,
    tilemap,
    labelManager,
    workshopManager,
  }
  tilemap.dig([0, 0, 0, 1, 1, 1])
  const id = await ws.put(workingState)
  expect(id).toBe(1)

  let res = []
  for await (const head of ws.headers()) {
    res.push(head)
  }
  expect(res[0]).toMatchObject({
    binarySize: 256,
    blobId: 1,
    depth: 1,
    height: 1,
    labelCount: 0,
    name: 'Unnamed Fort',
    tileCount: 8,
    width: 1,
    workshopCount: 0,
  })
  const body = await res[0].body(command)
  expect(body).toStrictEqual(workingState)
})

test('WorkingStateStore Index', async () => {
  const command = new CommandManager()
  const tilemap = new TilemapCommand(command)
  const labelManager = new SimpleLabelManagerCommand(command)
  const workshopManager = new WorkshopManagerCommand(command)
  const workingState = {
    fortName: 'Unnamed Fort',
    cursor: [0, 0, 0] as Pos,
    screenCenter: [0, 0, 0] as Pos,
    tileWidth: 64,
    tilemap,
    labelManager,
    workshopManager,
  }
  tilemap.dig([0, 0, 0, 1, 1, 1])
  const id1 = await ws.put(workingState)

  tilemap.dig([0, 0, 0, 1, 1, 2])
  workingState.fortName = 'Z'
  const id2 = await ws.put(workingState)

  expect(id1 == id2).toBeFalsy()

  let res = []
  for await (const head of ws.headers('by-size')) {
    res.push(head)
  }
  expect(res[0]).toMatchObject({ blobId: id2 })
  expect(res[1]).toMatchObject({ blobId: id1 })

  expect(res[0].lastModified.getTime()).toBeGreaterThan(res[1].lastModified.getTime())
  res.length = 0
  for await (const head of ws.headers('by-date')) {
    res.push(head)
  }
  expect(res[0]).toMatchObject({ blobId: id2 })
  expect(res[1]).toMatchObject({ blobId: id1 })

  res.length = 0
  for await (const head of ws.headers('by-name')) {
    res.push(head)
  }
  expect(res[0]).toMatchObject({ blobId: id1 })
  expect(res[1]).toMatchObject({ blobId: id2 })
})
