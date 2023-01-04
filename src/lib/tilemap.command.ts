import type { CommandManager } from './command'
import { Tilemap } from './tilemap.js'
import type { TilePiece } from './tilemap.js'
import type { Volume, Qube, Pos, Pos2d } from './geometry'
import { subPos, rotate2d } from './geometry.js'

export class TilemapCommand extends Tilemap {
  commandManager: CommandManager
  constructor(commandManager: CommandManager, volume: Volume = [100, 100, 100]) {
    super(volume)
    this.commandManager = commandManager
  }
  dig(qube: Qube): TilePiece[] {
    return this.commandManager.execute({
      forward: () => super.dig(qube),
      backward: (lastTiles: TilePiece[]) => {
        super.remove(qube)
        lastTiles.forEach(({ tile, pos }) => this.dot(tile, pos))
      },
    })
  }
  ramp(qube: Qube): TilePiece[] {
    return this.commandManager.execute({
      forward: () => super.ramp(qube),
      backward: (lastTiles) => {
        super.remove(qube)
        lastTiles.forEach(({ tile, pos }) => this.dot(tile, pos))
      },
    })
  }
  channel(qube: Qube): TilePiece[] {
    return this.commandManager.execute({
      forward: () => super.channel(qube),
      backward: (lastTiles) => {
        super.remove(qube)
        lastTiles.forEach(({ tile, pos }) => this.dot(tile, pos))
      },
    })
  }
  stairs(qube: Qube): TilePiece[] {
    return this.commandManager.execute({
      forward: () => super.stairs(qube),
      backward: (lastTiles) => {
        super.remove(qube)
        lastTiles.forEach(({ tile, pos }) => this.dot(tile, pos))
      },
    })
  }
  remove(qube: Qube): TilePiece[] {
    return this.commandManager.execute({
      forward: () => super.remove(qube),
      backward: (lastTiles) => {
        lastTiles.forEach(({ tile, pos }) => this.dot(tile, pos))
      },
    })
  }
  removeDots(dots: Pos[]): TilePiece[] {
    return this.commandManager.execute({
      forward: () => super.removeDots(dots),
      backward: (lastTiles) => {
        lastTiles.forEach(({ tile, pos }) => this.dot(tile, pos))
      },
    })
  }
  putTiles(tiles: TilePiece[]): TilePiece[] {
    return this.commandManager.execute({
      forward: () => super.putTiles(tiles),
      backward: (lastTiles) => {
        lastTiles.forEach(({ tile, pos }) => this.dot(tile, pos))
      },
    })
  }
  translate(tiles: Pos[], vector: Pos, ignoreBackground = false): TilePiece[] {
    return this.commandManager.execute({
      forward: () => super.translate(tiles, vector, ignoreBackground),
      backward: (tiles) => {
        tiles
          .map(({ tile, pos }) => ({
            pos: subPos(pos, vector),
            tile: this.dot(tile, pos),
          }))
          .map(({ tile, pos }) => this.dot(tile, pos))
      },
    })
  }
  rotate2d(
    tiles: Pos[],
    ccw = false,
    pivot?: [number, number]
  ): { pivot: [number, number]; tiles: TilePiece[] } {
    return this.commandManager.execute({
      forward: () => super.rotate2d(tiles, ccw, pivot),
      backward: ({ pivot, tiles }) => {
        tiles
          .map(({ tile, pos }) => ({
            pos: <Pos>(
              [
                ...rotate2d(<Pos2d>pos.slice(0, 2), pivot, (ccw ? -1 : 1) * Math.PI * 0.5),
                pos[2],
              ].map(Math.round)
            ),
            tile: this.dot(tile, pos),
          }))
          .map(({ tile, pos }) => this.dot(tile, pos))
      },
    })
  }
  flip2d(
    tiles: Pos[],
    vertical = false,
    pivot?: [number, number]
  ): { pivot: [number, number]; tiles: TilePiece[] } {
    return this.commandManager.execute({
      forward: () => super.flip2d(tiles, vertical, pivot),
      backward: ({ pivot, tiles }) => {
        tiles
          .map(({ tile, pos }) => ({
            pos: <Pos>(
              (vertical
                ? [pos[0], pivot[1] * 2 - pos[1], pos[2]]
                : [pivot[0] * 2 - pos[0], pos[1], pos[2]])
            ),
            tile: this.dot(tile, pos),
          }))
          .map(({ tile, pos }) => this.dot(tile, pos))
      },
    })
  }
}
