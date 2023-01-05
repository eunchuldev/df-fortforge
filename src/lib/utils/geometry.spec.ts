import { expect, test } from 'vitest'
import { collision, rotate2d } from './geometry.js'

test('collision', () => {
  expect(collision([0, 0, 0, 1, 1, 1], [0, 0, 0, 1, 1, 1])).toBeTruthy()
  expect(collision([0, 0, 0, 1, 1, 1], [-1, -1, -1, 1, 1, 1])).toBeTruthy()
  expect(collision([0, 0, 0, 1, 1, 1], [-1, -2, -2, 1, 1, 1])).toBeFalsy()
  expect(collision([0, 0, 0, 0, 0, 0], [-1, -1, -1, 1, 1, 1])).toBeTruthy()
})

test('rotate2d', () => {
  expect(rotate2d([2, 1], [1, 1], Math.PI * 0.5)).toStrictEqual([1, 2])
})
