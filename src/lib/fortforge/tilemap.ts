import type { Pos2d, Pos, Qube, Volume } from '../utils/geometry'
import { getBoundary, clampQube, sumPos, rotate2d } from '../utils/geometry.js'

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

export interface TilePiece {
  tile: Tile
  pos: Pos
}

interface TilemapState {
  tilePieces: TilePiece[]
  volume: Volume
  defaultTile: Tile
  boundingQube: Qube
}

export class Tilemap {
  map: Tile[] = []
  volume: Volume = [400, 400, 100]
  defaultTile = Tile.Wall
  boundingQube: Qube = [
    LARGE_NUMBER,
    LARGE_NUMBER,
    LARGE_NUMBER,
    -LARGE_NUMBER * 2,
    -LARGE_NUMBER * 2,
    -LARGE_NUMBER * 2,
  ]

  constructor(volume: Volume = [100, 100, 100]) {
    this.volume = volume
    this.map = []
    this.resize(volume)
  }

  tiles(qube?: Qube): Iterable<TilePiece> {
    qube ??= this.boundingQube
    const [x, y, z, w, h, d] = clampQube(qube, [
      0,
      0,
      0,
      this.volume[0],
      this.volume[1],
      this.volume[2],
    ])
    return this.map
      .slice(
        this.volume[0] * this.volume[1] * z + this.volume[0] * y + x,
        this.volume[0] * this.volume[1] * (z + d) + this.volume[0] * (y + h) + (x + w) + 1
      )
      .map((tile, i) => ({
        tile,
        pos: <Pos>[
          this.i2x(i + x),
          this.i2y(i + x + this.volume[0] * y),
          this.i2z(i + x + this.volume[0] * y + this.volume[0] * this.volume[1] * z),
        ],
      }))
      .filter(
        (p) =>
          p.pos[0] >= x &&
          p.pos[0] <= x + w &&
          p.pos[1] >= y &&
          p.pos[1] <= y + h &&
          p.tile !== this.defaultTile
      )
  }

  private i2x(index: number) {
    return index % this.volume[0]
  }
  private i2y(index: number) {
    return Math.floor(index / this.volume[0]) % this.volume[1]
  }
  private i2z(index: number) {
    return Math.floor(index / (this.volume[0] * this.volume[1]))
  }
  private pos2index([x, y, z]: Pos) {
    const i = z * this.volume[0] * this.volume[1] + y * this.volume[0] + x
    return Math.min(Math.max(i, 0), this.volume[0] * this.volume[1] * this.volume[2] - 1)
  }

  resize(volume: Volume) {
    this.volume = volume
    const lastLength = this.map.length
    this.map.length = volume[0] * volume[1] * volume[2]
    this.map.fill(this.defaultTile, lastLength, volume[0] * volume[1] * volume[2])
  }
  tileAt(pos: Pos): Tile {
    return this.map[this.pos2index(pos)]
  }

  serialize(): string {
    const state: TilemapState = {
      tilePieces: [...this.tiles(this.boundingQube)],
      volume: this.volume,
      defaultTile: this.defaultTile,
      boundingQube: this.boundingQube,
    }
    return JSON.stringify(state)
  }
  deserialize(code: string) {
    const state: TilemapState = JSON.parse(code) as TilemapState
    this.volume = state.volume
    this.defaultTile = state.defaultTile
    this.boundingQube = state.boundingQube
    this.map = []
    this.resize(this.volume)
    for (const { tile, pos } of state.tilePieces) {
      this.map[this.pos2index(pos)] = tile
    }
  }

  protected dot(tile: Tile, pos: Pos): Tile {
    if (this.map[this.pos2index(pos)] === tile) return tile
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
    const last = this.map[this.pos2index(pos)]
    this.map[this.pos2index(pos)] = tile
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
  removeDots(dots: Pos[]): TilePiece[] {
    return dots.map((pos) => ({ tile: this.dot(this.defaultTile, pos), pos }))
  }
  tilesAt(dots: Pos[]): TilePiece[] {
    return dots.map((pos) => ({ pos, tile: this.tileAt(pos) }))
  }
  putTiles(tiles: TilePiece[]): TilePiece[] {
    return tiles.map(({ pos, tile }) => ({ tile: this.dot(tile, pos), pos }))
  }
  translate(tiles: Pos[], vector: Pos, ignoreBackground = false): TilePiece[] {
    return (ignoreBackground ? tiles.filter((pos) => this.tileAt(pos) !== this.defaultTile) : tiles)
      .map((pos) => ({ pos: sumPos(pos, vector), tile: this.dot(this.defaultTile, pos) }))
      .map(({ pos, tile }) => ({ pos, tile: this.dot(tile, pos) }))
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
      tiles: tiles
        .map((pos) => ({
          pos: <Pos>(
            [
              ...rotate2d(<Pos2d>pos.slice(0, 2), pivot!, (ccw ? 1 : -1) * Math.PI * 0.5),
              pos[2],
            ].map(Math.round)
          ),
          tile: this.dot(this.defaultTile, pos),
        }))
        .map(({ pos, tile }) => ({ pos, tile: this.dot(tile, pos) })),
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
      tiles: tiles
        .map((pos) => ({
          pos: <Pos>(
            (vertical
              ? [pos[0], pivot![1] * 2 - pos[1], pos[2]]
              : [pivot![0] * 2 - pos[0], pos[1], pos[2]])
          ),
          tile: this.dot(this.defaultTile, pos),
        }))
        .map(({ pos, tile }) => ({ pos, tile: this.dot(tile, pos) })),
    }
  }
}
