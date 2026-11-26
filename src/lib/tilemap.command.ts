import type { CommandManager } from './command'
import { Tilemap } from './tilemap.js'
import type { TilePiece } from './tilemap.js'
import type { Volume, Qube, Pos, Pos2d } from './geometry'

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
      backward: (lastTiles) => super.putTiles(lastTiles.toReversed()),
    })
  }
  putTiles(tiles: TilePiece[]): TilePiece[] {
    return this.commandManager.execute({
      forward: () => super.putTiles(tiles),
      backward: (lastTiles) => super.putTiles(lastTiles.toReversed()),
    })
  }
  translate(tiles: Pos[], vector: Pos, ignoreBackground = false): TilePiece[] {
    return this.commandManager.group(() => super.translate(tiles, vector, ignoreBackground))
  }
  rotate2d(tiles: Pos[], ccw = false, pivot?: Pos2d) {
    return this.commandManager.group(() => super.rotate2d(tiles, ccw, pivot))
  }
  flip2d(tiles: Pos[], vertical = false, pivot?: Pos2d) {
    return this.commandManager.group(() => super.flip2d(tiles, vertical, pivot))
  }
}
