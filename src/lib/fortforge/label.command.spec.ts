import { test, expect } from 'vitest'
import { CommandManager } from '../utils/command.js'
import { SimpleLabelManagerCommand } from './simple-label.command.js'

test('LabelManagerCommand', () => {
  const command = new CommandManager()
  const manager = new SimpleLabelManagerCommand(command)
  const label = manager.addSimpleLabel([0, 0, 0, 1, 1, 0], 'test', 'red')
  expect(manager.get(label.id)).toMatchObject({
    name: 'test',
    tiles: {
      '0,0,0': { pos: [0, 0, 0] },
      '0,1,0': { pos: [0, 1, 0] },
      '1,0,0': { pos: [1, 0, 0] },
      '1,1,0': { pos: [1, 1, 0] },
    },
    tileCount: 4,
    boundary: [
      [0, 0, 0],
      [1, 1, 0],
    ],
    color: 'red',
  })
  manager.extendArea(label.id, [-1, -1, 0, 1, 0, 0])
  expect(manager.get(label.id)).toMatchObject({
    tiles: {
      '-1,-1,0': { pos: [-1, -1, 0] },
      '0,-1,0': { pos: [0, -1, 0] },
      '0,0,0': { pos: [0, 0, 0] },
      '0,1,0': { pos: [0, 1, 0] },
      '1,0,0': { pos: [1, 0, 0] },
      '1,1,0': { pos: [1, 1, 0] },
    },
    tileCount: 6,
    boundary: [
      [-1, -1, 0],
      [1, 1, 0],
    ],
  })
  manager.eraseArea([0, 0, 0, 1, 1, 0])
  expect(manager.get(label.id)).toMatchObject({
    tiles: { '-1,-1,0': { pos: [-1, -1, 0] }, '0,-1,0': { pos: [0, -1, 0] } },
    tileCount: 2,
    boundary: [
      [-1, -1, 0],
      [0, -1, 0],
    ],
  })
  manager.eraseArea([-1, -1, 0, 1, 1, 0])
  expect(manager.get(label.id)).toBeUndefined()
  manager.setHotkey('F1', label.id)
  expect(manager.hotkeys['F1']).toStrictEqual(label.id)
  manager.clearHotkey('F1')
  expect(manager.hotkeys['F1']).toBeNull()

  command.undo()
  expect(manager.hotkeys['F1']).toStrictEqual(label.id)
  command.undo()
  expect(manager.hotkeys['F1']).toBeNull()
  command.undo()
  expect(manager.get(label.id)).toMatchObject({
    tiles: { '-1,-1,0': { pos: [-1, -1, 0] }, '0,-1,0': { pos: [0, -1, 0] } },
    tileCount: 2,
    boundary: [
      [-1, -1, 0],
      [0, -1, 0],
    ],
  })
  command.undo()
  expect(manager.get(label.id)).toMatchObject({
    tiles: {
      '-1,-1,0': { pos: [-1, -1, 0] },
      '0,-1,0': { pos: [0, -1, 0] },
      '0,0,0': { pos: [0, 0, 0] },
      '0,1,0': { pos: [0, 1, 0] },
      '1,0,0': { pos: [1, 0, 0] },
      '1,1,0': { pos: [1, 1, 0] },
    },
    tileCount: 6,
    boundary: [
      [-1, -1, 0],
      [1, 1, 0],
    ],
  })
  command.undo()
  expect(manager.get(label.id)).toMatchObject({
    name: 'test',
    tiles: {
      '0,0,0': { pos: [0, 0, 0] },
      '0,1,0': { pos: [0, 1, 0] },
      '1,0,0': { pos: [1, 0, 0] },
      '1,1,0': { pos: [1, 1, 0] },
    },
    tileCount: 4,
    boundary: [
      [0, 0, 0],
      [1, 1, 0],
    ],
    color: 'red',
  })
  command.undo()
  expect(manager.get(label.id)).toBeUndefined()
})
