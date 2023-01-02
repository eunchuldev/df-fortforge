import { test, expect } from 'vitest'
import { Tilemap } from './tilemap.js'
import { genMacro } from './df-macros.js'

test('genMacros', () => {
  const tilemap = new Tilemap()

  tilemap.dig([0, 0, 1, 1, 1, 0])

  tilemap.ramp([0, 0, 2, 0, 1, 0])
  tilemap.ramp([1, 0, 3, 0, 1, 0])

  tilemap.stairs([0, 2, 1, 0, 0, 4])
  tilemap.stairs([1, 2, 1, 0, 0, 5])

  const res = genMacro('test', tilemap, [0, 0, 0])
  expect(res).toBe(`test
		D_DESIGNATE_DIG
	End of group
		DESIGNATE_RECTANGLE
	End of group
		CURSOR_DOWN_Z
	End of group
		DESIGNATE_DIG
	End of group
		SELECT
	End of group
		KEYBOARD_CURSOR_DOWNRIGHT
	End of group
		SELECT
	End of group
		CURSOR_DOWN_Z
	End of group
		KEYBOARD_CURSOR_LEFT
	End of group
		DESIGNATE_RAMP
	End of group
		SELECT
	End of group
		KEYBOARD_CURSOR_UP
	End of group
		SELECT
	End of group
		CURSOR_DOWN_Z
	End of group
		KEYBOARD_CURSOR_RIGHT
	End of group
		DESIGNATE_RAMP
	End of group
		SELECT
	End of group
		KEYBOARD_CURSOR_DOWN
	End of group
		SELECT
	End of group
		CURSOR_DOWN_Z
	End of group
		CURSOR_DOWN_Z
	End of group
		KEYBOARD_CURSOR_DOWNLEFT
	End of group
		DESIGNATE_STAIR_UPDOWN
	End of group
		SELECT
	End of group
		CURSOR_UP_Z
	End of group
		CURSOR_UP_Z
	End of group
		CURSOR_UP_Z
	End of group
		CURSOR_UP_Z
	End of group
		SELECT
	End of group
		KEYBOARD_CURSOR_RIGHT
	End of group
		DESIGNATE_STAIR_UPDOWN
	End of group
		SELECT
	End of group
		CURSOR_DOWN_Z
	End of group
		CURSOR_DOWN_Z
	End of group
		CURSOR_DOWN_Z
	End of group
		CURSOR_DOWN_Z
	End of group
		CURSOR_DOWN_Z
	End of group
		SELECT
	End of group
End of macro
`)
})
