import type { Pos, Qube, Volume } from './geometry'
import { clampQube } from './geometry.js'

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

export interface ITilemap {
  volume: Volume

  defaultTile: Tile

  tiles(_qube: Qube): Iterable<TilePiece>

  boundingQube: Qube
  resize(_volume: Volume): void
  tileAt(_pos: Pos): Tile
  serialize(): string
  deserialize(_code: string): void

  dot(_tile: Tile, _pos: Pos): Tile

  dig(_qube: Qube): void
  ramp(_qube: Qube): void
  channel(_qube: Qube): void
  remove(_qube: Qube): void
  stairs(_qube: Qube): void
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

export class Tilemap implements ITilemap {
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

  tiles(qube: Qube): Iterable<TilePiece> {
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

  dot(tile: Tile, pos: Pos): Tile {
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
    /*[pos, ...neighbors2d(pos)].forEach(p => {
      if(this.tileAt(p) === Tile.Ramp) {
        if(!neighbors2d(p).some(q => this.tileAt(q) === Tile.Wall)) {
          this.map[this.pos2index(p)] = Tile.Floor;
          this.map[this.pos2index([p[0], p[1], p[2]-1])] = Tile.OpenSpace;
        }
      }
    });
    [above(pos), ...neighbors2d(above(pos))].forEach(p => {
      if(this.tileAt(p) === Tile.Channel){
        if(this.tileAt(below(p)) === Tile.Wall) {
          this.map[this.pos2index(p)] = Tile.Floor;
        } else if(this.tileAt(below(p)) !== Tile.Ramp) {
          this.map[this.pos2index(p)] = Tile.OpenSpace;
        }
      }
    });*/
    return last
  }

  private fill(tile: Tile, qube: Qube) {
    for (let i = qube[0]; i <= qube[0] + qube[3]; ++i)
      for (let j = qube[1]; j <= qube[1] + qube[4]; ++j)
        for (let k = qube[2]; k <= qube[2] + qube[5]; ++k) this.dot(tile, [i, j, k])
  }

  dig(qube: Qube) {
    this.fill(Tile.Floor, qube)
  }
  ramp(qube: Qube) {
    this.fill(Tile.Ramp, qube)
  }
  channel(qube: Qube) {
    this.fill(Tile.Channel, qube)
  }
  stairs(qube: Qube) {
    if (qube[5] === 0) return false
    for (let i = qube[0]; i <= qube[0] + qube[3]; ++i)
      for (let j = qube[1]; j <= qube[1] + qube[4]; ++j) {
        if ([Tile.DownStair, Tile.UpDownStair].includes(this.tileAt([i, j, qube[2]])))
          this.dot(Tile.UpDownStair, [i, j, qube[2]])
        else this.dot(Tile.UpStair, [i, j, qube[2]])
      }
    for (let k = qube[2] + 1; k < qube[2] + qube[5]; ++k)
      for (let i = qube[0]; i <= qube[0] + qube[3]; ++i)
        for (let j = qube[1]; j <= qube[1] + qube[4]; ++j) this.dot(Tile.UpDownStair, [i, j, k])
    for (let i = qube[0]; i <= qube[0] + qube[3]; ++i)
      for (let j = qube[1]; j <= qube[1] + qube[4]; ++j) {
        if ([Tile.UpStair, Tile.UpDownStair].includes(this.tileAt([i, j, qube[2] + qube[5]])))
          this.dot(Tile.UpDownStair, [i, j, qube[2] + qube[5]])
        else this.dot(Tile.DownStair, [i, j, qube[2] + qube[5]])
      }
  }
  remove(qube: Qube) {
    this.fill(this.defaultTile, qube)
  }
  /*  coverWithQubes(qube?: Qube): TileCover[] {
    let mesh: TileCover | null = null;
    let meshes: TileCover[] = [];
    let done = new Set();
    for(let {tile, pos} of this.tiles(qube ?? this.boundingQube)) {
      mesh = {tile, qube: [...pos, 0, 0, 0]}
      if(done.has(encode(pos))) continue;
      done.add(encode(pos));
      let expanding = false;
      do {
        expanding = false;
        for(let n = 0; n < 3; ++n) {
          for(let i of [mesh.qube[n] - 1, mesh.qube[n] + mesh.qube[n+3]+1]) {
            let expandable = true;
            for(let j=mesh.qube[(n+1) % 3]; j<=mesh.qube[(n+1) % 3]+mesh.qube[(n+1) % 3 + 3] && expandable; ++j) {
              for(let k=mesh.qube[(n+2) % 3]; k<=mesh.qube[(n+2) % 3]+mesh.qube[(n+2)%3 + 3] && expandable; ++k) {
                let pos: Pos = [0, 0, 0];
                pos[n] = i;
                pos[(n+1) % 3] = j;
                pos[(n+2) % 3] = k;
                let neighborTile = this.tileAt(pos);
                if(done.has(encode(pos)) || neighborTile !== tile) {
                  expandable = false;
                }
              }
            }
            if(expandable) {
              expanding = true;
              for(let j=mesh.qube[(n+1) % 3]; j<=mesh.qube[(n+1) % 3]+mesh.qube[(n+1) % 3 + 3] && expandable; ++j) {
                for(let k=mesh.qube[(n+2) % 3]; k<=mesh.qube[(n+2) % 3]+mesh.qube[(n+2)%3 + 3] && expandable; ++k) {
                  let pos: Pos = [0, 0, 0];
                  pos[n] = i;
                  pos[(n+1) % 3] = j;
                  pos[(n+2) % 3] = k;
                  done.add(encode(pos));
                }
              }
              mesh.qube[n] = Math.min(i, mesh.qube[n]);
              mesh.qube[n+3] = Math.max(i-mesh.qube[n], mesh.qube[n+3] + 1);
            }
          }
        }
      }
      while (expanding);
      meshes.push(mesh);
      mesh = null;
    }
    return meshes;
  }*/
}
