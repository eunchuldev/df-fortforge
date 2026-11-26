import { createSubscriber, SvelteMap } from 'svelte/reactivity'
import type { Pos2d, Pos, Qube, Volume } from './geometry'
import {
  getBoundary,
  clampQube,
  collision,
  encodePos,
  inBounds,
  sumPos,
  rotate2d,
  volumeBounds,
} from './geometry.js'

const LARGE_NUMBER = 2147483648

export enum Tile {
  Wall,
  Floor,
  Channel,
  Ramp,
  UpStair,
  DownStair,
  UpDownStair,
  OpenSpace,
}

export function tileToString(tile: Tile): string {
  return {
    [Tile.Wall]: 'wall',
    [Tile.Floor]: 'floor',
    [Tile.Channel]: 'channel',
    [Tile.Ramp]: 'ramp',
    [Tile.UpStair]: 'upstair',
    [Tile.DownStair]: 'downstair',
    [Tile.UpDownStair]: 'updownstair',
    [Tile.OpenSpace]: 'openspace',
  }[tile]
}

/*export interface ITilemap {
  volume: Volume

  defaultTile: Tile

  tiles(_qube: Qube): Iterable<TilePiece>

  boundingQube: Qube
  resize(_volume: Volume): void
  tileAt(_pos: Pos): Tile
  serialize(): string
  deserialize(_code: string): void

  dig(_qube: Qube): void
  ramp(_qube: Qube): void
  channel(_qube: Qube): void
  remove(_qube: Qube): void
  stairs(_qube: Qube): void
}*/

export interface TilePiece {
  tile: Tile
  pos: Pos
  character?: string
}

interface CharacterCell {
  pos: Pos
  character: string
}

interface TilemapState {
  tilePieces: TilePiece[]
  characters?: CharacterCell[]
  volume: Volume
  defaultTile: Tile
  boundingQube: Qube
}

export class Tilemap {
  // Observe the dense buffer as a whole.
  #cellsChanged?: () => void
  #trackCells = createSubscriber((update) => {
    this.#cellsChanged = update
    return () => {
      this.#cellsChanged = undefined
    }
  })
  map: Tile[] = []
  private characters = new SvelteMap<string, CharacterCell>()
  volume = $state.raw<Volume>([0, 0, 0])
  defaultTile = $state(Tile.Wall)
  boundingQube = $state.raw<Qube>([
    LARGE_NUMBER,
    LARGE_NUMBER,
    LARGE_NUMBER,
    -LARGE_NUMBER * 2,
    -LARGE_NUMBER * 2,
    -LARGE_NUMBER * 2,
  ])

  constructor(volume: Volume = [100, 100, 100]) {
    this.loadTiles(volume, [])
  }

  tiles(qube: Qube): TilePiece[] {
    this.#trackCells()
    const [x, y, z, w, h, d] = clampQube(qube, volumeBounds(this.volume))
    const defaultTile = this.defaultTile
    const pieces: TilePiece[] = []
    for (let pz = z; pz <= z + d; ++pz) {
      for (let py = y; py <= y + h; ++py) {
        const row = this.pos2index([0, py, pz])
        for (let px = x; px <= x + w; ++px) {
          const tile = this.map[row + px]
          if (tile !== defaultTile) pieces.push({ tile, pos: [px, py, pz] })
        }
      }
    }
    return pieces
  }

  private pos2index([x, y, z]: Pos) {
    const [width, height, floorLimit] = this.volume
    return ((z + floorLimit) * height + y) * width + x
  }

  private loadTiles(volume: Volume, pieces: TilePiece[], characters: CharacterCell[] = []) {
    const [width, height, floorLimit] = volume
    this.map = new Array<Tile>(width * height * (2 * floorLimit + 1)).fill(this.defaultTile)
    this.volume = volume
    for (const { pos, tile } of pieces) {
      if (inBounds(pos, volume)) this.map[this.pos2index(pos)] = tile
    }
    this.characters.clear()
    for (const cell of characters) {
      if (inBounds(cell.pos, volume)) this.characters.set(encodePos(cell.pos), cell)
    }
    this.#cellsChanged?.()
  }

  resize(volume: Volume) {
    const bounds = clampQube(this.boundingQube, volumeBounds(volume))
    this.loadTiles(volume, this.tiles(bounds), [...this.characters.values()])
    this.boundingQube = bounds
  }

  tileAt(pos: Pos): Tile {
    this.#trackCells()
    return inBounds(pos, this.volume) ? this.map[this.pos2index(pos)] : this.defaultTile
  }

  characterAt(pos: Pos): string | undefined {
    return this.characters.get(encodePos(pos))?.character
  }

  charactersIn(qube: Qube): CharacterCell[] {
    return [...this.characters.values()].filter(({ pos }) => collision(qube, [...pos, 0, 0, 0]))
  }

  serialize(): string {
    const state: TilemapState = {
      tilePieces: this.tiles(this.boundingQube),
      characters: [...this.characters.values()],
      volume: this.volume,
      defaultTile: this.defaultTile,
      boundingQube: this.boundingQube,
    }
    return JSON.stringify(state)
  }
  deserialize(code: string) {
    const state: TilemapState = JSON.parse(code) as TilemapState
    this.defaultTile = state.defaultTile
    this.boundingQube = state.boundingQube
    this.loadTiles(state.volume, state.tilePieces, state.characters)
  }

  protected dot(tile: Tile, pos: Pos): Tile {
    if (!inBounds(pos, this.volume)) return this.defaultTile
    const index = this.pos2index(pos)
    const last = this.map[index]
    if (last === tile) return tile
    const x1y1z1: Pos = [
      Math.min(pos[0], this.boundingQube[0]),
      Math.min(pos[1], this.boundingQube[1]),
      Math.min(pos[2], this.boundingQube[2]),
    ]
    const x2y2z2: Pos = [
      Math.max(pos[0], this.boundingQube[0] + this.boundingQube[3]),
      Math.max(pos[1], this.boundingQube[1] + this.boundingQube[4]),
      Math.max(pos[2], this.boundingQube[2] + this.boundingQube[5]),
    ]
    this.boundingQube = [
      ...x1y1z1,
      x2y2z2[0] - x1y1z1[0],
      x2y2z2[1] - x1y1z1[1],
      x2y2z2[2] - x1y1z1[2],
    ]
    this.map[index] = tile
    this.#cellsChanged?.()
    return last
  }

  protected fill(tile: Tile, qube: Qube): TilePiece[] {
    const tiles: TilePiece[] = []
    for (let i = qube[0]; i <= qube[0] + qube[3]; ++i) {
      for (let j = qube[1]; j <= qube[1] + qube[4]; ++j) {
        for (let k = qube[2]; k <= qube[2] + qube[5]; ++k) {
          const pos: Pos = [i, j, k]
          tiles.push({ pos, tile: this.dot(tile, pos) })
        }
      }
    }
    return tiles
  }

  dig(qube: Qube): TilePiece[] {
    return this.fill(Tile.Floor, qube)
  }
  ramp(qube: Qube): TilePiece[] {
    return this.fill(Tile.Ramp, qube)
  }
  channel(qube: Qube): TilePiece[] {
    return this.fill(Tile.Channel, qube)
  }
  stairs(qube: Qube): TilePiece[] {
    const tiles: TilePiece[] = []
    if (qube[5] === 0) return []
    for (let i = qube[0]; i <= qube[0] + qube[3]; ++i) {
      for (let j = qube[1]; j <= qube[1] + qube[4]; ++j) {
        const pos: Pos = [i, j, qube[2]]
        const tile = [Tile.DownStair, Tile.UpDownStair].includes(this.tileAt(pos))
          ? Tile.UpDownStair
          : Tile.UpStair
        tiles.push({ tile: this.dot(tile, pos), pos })
      }
    }
    for (let k = qube[2] + 1; k < qube[2] + qube[5]; ++k)
      for (let i = qube[0]; i <= qube[0] + qube[3]; ++i)
        for (let j = qube[1]; j <= qube[1] + qube[4]; ++j)
          tiles.push({ tile: this.dot(Tile.UpDownStair, [i, j, k]), pos: [i, j, k] })
    for (let i = qube[0]; i <= qube[0] + qube[3]; ++i) {
      for (let j = qube[1]; j <= qube[1] + qube[4]; ++j) {
        const pos: Pos = [i, j, qube[2] + qube[5]]
        const tile = [Tile.UpStair, Tile.UpDownStair].includes(this.tileAt(pos))
          ? Tile.UpDownStair
          : Tile.DownStair
        tiles.push({ tile: this.dot(tile, pos), pos })
      }
    }
    return tiles
  }
  remove(qube: Qube): TilePiece[] {
    return this.fill(this.defaultTile, qube)
  }

  private replaceTile({ pos, tile, character }: TilePiece): TilePiece {
    const key = encodePos(pos)
    const previous = this.characters.get(key)?.character
    if (character !== previous && inBounds(pos, this.volume)) {
      if (character) this.characters.set(key, { pos: [...pos], character })
      else this.characters.delete(key)
    }
    return { pos, tile: this.dot(tile, pos), character: previous }
  }

  removeDots(dots: Pos[]): TilePiece[] {
    return dots.map((pos) => this.replaceTile({ pos, tile: this.defaultTile }))
  }
  tilesAt(dots: Pos[]): TilePiece[] {
    return dots.map((pos) => ({ pos, tile: this.tileAt(pos), character: this.characterAt(pos) }))
  }
  putTiles(tiles: TilePiece[]): TilePiece[] {
    return tiles.map((tile) => this.replaceTile(tile))
  }

  private moveTiles(positions: Pos[], destination: (pos: Pos) => Pos): TilePiece[] {
    const moved = this.tilesAt(positions).map((piece) => ({
      ...piece,
      pos: destination(piece.pos),
    }))
    this.removeDots(positions)
    return this.putTiles(moved)
  }
  translate(tiles: Pos[], vector: Pos, ignoreBackground = false): TilePiece[] {
    const positions = ignoreBackground
      ? tiles.filter((pos) => this.tileAt(pos) !== this.defaultTile || this.characterAt(pos))
      : tiles
    return this.moveTiles(positions, (pos) => sumPos(pos, vector))
  }
  rotate2d(
    tiles: Pos[],
    ccw = false,
    pivot?: Pos2d
  ): { pivot: [number, number]; tiles: TilePiece[] } {
    if (pivot === undefined) {
      const boundary = getBoundary(tiles)
      pivot = [boundary[0] + boundary[3] * 0.5, boundary[1] + boundary[4] * 0.5]
    }
    return {
      pivot,
      tiles: this.moveTiles(tiles, ([x, y, z]) => {
        const [px, py] = rotate2d([x, y], pivot, (ccw ? 1 : -1) * Math.PI * 0.5)
        return [Math.round(px), Math.round(py), z]
      }),
    }
  }
  flip2d(
    tiles: Pos[],
    vertical = false,
    pivot?: Pos2d
  ): { pivot: [number, number]; tiles: TilePiece[] } {
    if (pivot === undefined) {
      const boundary = getBoundary(tiles)
      pivot = [boundary[0] + boundary[3] * 0.5, boundary[1] + boundary[4] * 0.5]
    }

    return {
      pivot,
      tiles: this.moveTiles(tiles, ([x, y, z]) =>
        vertical ? [x, pivot[1] * 2 - y, z] : [pivot[0] * 2 - x, y, z]
      ),
    }
  }
}
