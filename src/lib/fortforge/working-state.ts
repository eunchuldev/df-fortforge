import { default as pako } from 'pako'
import type { Pos } from '../utils/geometry'
import { openDB, deleteDB } from 'idb'
import type { IDBPDatabase, DBSchema } from 'idb'

import type { CommandManager } from '../utils/command.js'
import { SimpleLabelManagerCommand } from './simple-label.command.js'
import { WorkshopManagerCommand } from './workshop.command.js'
import { TilemapCommand } from './tilemap.command.js'

export interface WorkingState {
  fortName: string
  cursor?: Pos
  screenCenter?: Pos
  tileWidth?: number
  tilemap: TilemapCommand
  labelManager: SimpleLabelManagerCommand
  workshopManager: WorkshopManagerCommand
}

export interface Metadata {
  blobId: number
  name: string
  tileCount: number
  depth: number
  width: number
  height: number
  labelCount: number
  workshopCount: number
  binarySize: number
  lastModified: Date
  id?: number
}

export interface WorkingStateBlob {
  blob: Uint8Array
  id?: number
}

interface Schema extends DBSchema {
  blobs: {
    key: number
    value: Uint8Array
  }
  headers: {
    key: number
    value: Metadata
    indexes: { 'by-date': Date; 'by-name': string; 'by-size': number; 'by-blob-id': number }
  }
}

export class WorkingStateStore {
  db!: IDBPDatabase<Schema>
  initialized = false
  async init() {
    this.db = await openDB<Schema>('working-states', 1, {
      upgrade(db) {
        if (db.version <= 1) {
          db.createObjectStore('blobs', {
            keyPath: 'id',
            autoIncrement: true,
          })
          const headerStore = db.createObjectStore('headers', {
            keyPath: 'id',
            autoIncrement: true,
          })

          headerStore.createIndex('by-date', 'lastModified')
          headerStore.createIndex('by-size', 'binarySize')
          headerStore.createIndex('by-name', 'name')
          headerStore.createIndex('by-blob-id', 'blobId', { unique: true })
        }
      },
    })
    this.initialized = true
  }
  async clear() {
    await this.db.clear('blobs')
    await this.db.clear('headers')
  }
  async put(state: WorkingState, id?: number): Promise<number> {
    const blob = this.encodeState(state)
    /*const tx = this.db.transaction(['blobs', 'headers']);
    const blobId = await tx.objectStore('blobs').put();*/
    const blobId = await this.db.put('blobs', blob, id)
    const metadataId = await this.db.getKeyFromIndex('headers', 'by-blob-id', blobId)
    await this.db.put(
      'headers',
      {
        blobId,
        name: state.fortName,
        binarySize: blob.length,
        tileCount: [...state.tilemap.tiles()].length,
        depth: state.tilemap.boundingQube[5],
        width: state.tilemap.boundingQube[3],
        height: state.tilemap.boundingQube[4],
        labelCount: state.labelManager.getLabels().length,
        workshopCount: state.workshopManager.getLabels().length,
        lastModified: new Date(),
      },
      metadataId
    )
    return blobId
  }
  async *headers(
    index: keyof Schema['headers']['indexes'] = 'by-date',
    direction?: 'prev' | 'next',
    query?: string
  ): AsyncGenerator<Metadata & { body(cm: CommandManager): Promise<WorkingState> }> {
    if (direction == undefined) {
      if (index === 'by-name') {
        direction = 'next'
      } else if (index === 'by-date') {
        direction = 'prev'
      } else if (index === 'by-size') {
        direction = 'prev'
      }
    }
    let cursor = await this.db
      .transaction('headers')
      .store.index(index)
      .openCursor(query, direction)
    while (cursor) {
      const blobId = cursor.value.blobId
      yield {
        ...cursor.value,
        body: async (cm: CommandManager) => {
          const blob = await this.db.get('blobs', blobId)
          if (blob) return this.decodeState(blob, cm)
          else throw Error(`fail to get body: no blob on ${blobId}`)
        },
      }
      cursor = await cursor.continue()
    }
  }
  protected encodeState(state: WorkingState): Uint8Array {
    return pako.deflate(
      JSON.stringify({
        ...state,
        tilemap: state.tilemap.serialize(),
        labelManager: state.labelManager.serialize(),
        workshopManager: state.workshopManager.serialize(),
      })
    )
  }

  protected decodeState(blob: Uint8Array, cm: CommandManager): WorkingState {
    const data = JSON.parse(pako.inflate(blob, { to: 'string' }))
    const tilemap = new TilemapCommand(cm)
    const labelManager = new SimpleLabelManagerCommand(cm)
    const workshopManager = new WorkshopManagerCommand(cm)
    tilemap.deserialize(data.tilemap)
    labelManager.deserialize(data.labelManager)
    workshopManager.deserialize(data.workshopManager)
    return {
      ...data,
      tilemap,
      labelManager,
      workshopManager,
    }
  }

  /*protected extractMetadata(state: WorkingState, workingStateBlob: Uint8Array): Metadata {
    return {
      name: state.fortName,
      binarySize: workingStateBlob.length,
      tileCount: [...state.tilemap.tiles()].length,
      depth: state.tilemap.boundingQube[5],
      width: state.tilemap.boundingQube[3],
      height: state.tilemap.boundingQube[4],
      labelCount: state.labelManager.getLabels().length,
      workshopCount: state.workshopManager.getLabels().length,
      lastModified: new Date(),
    }
  }*/
}
