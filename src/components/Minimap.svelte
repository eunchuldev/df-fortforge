<script lang="ts">
  import { onMount } from 'svelte'

  import type { Tile, Tilemap } from '../lib/fortforge/tilemap.js'
  import type { Pos, Qube, Rect } from '../lib/utils/geometry'
  import { canvasResize } from '../lib/svelte-actions/canvas-resize.js'

  export let tilemap: Tilemap
  export let cursor: Pos
  export let screenQube: Qube
  export let floorLabels: Record<number, string> = []

  let canvas: HTMLCanvasElement

  const visibleFloors = 7

  function transformIsometric(ctx: CanvasRenderingContext2D) {
    const T: [number, number, number, number, number, number] = [0.63, 0, 0.35, 0.2, 0, 0]
    ctx.transform(...T)
  }

  function drawFloor(ctx: CanvasRenderingContext2D, depth: number, cursor: Pos) {
    ctx.save()
    ctx.translate(0, 0.5 * canvas.height + ((depth - cursor[2]) / visibleFloors) * canvas.height)
    transformIsometric(ctx)
    ctx.fillStyle = '#151515'
    ctx.globalAlpha = cursor[2] === depth ? 1.0 : 0.4
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = cursor[2] === depth ? 1.0 : 0.5
    ctx.font = ctx.font.replace(/\d+px/, '22px')
    /*drawTextOutlined(
      ctx, 
      `${-depth} F` + (floorLabels[-depth] ? ` (${floorLabels[-depth]})` : ''),
      3,
      0.5 * canvas.height + ((depth - cursor[2]) / visibleFloors) * canvas.height - 5,
      'white',
      'black',
      0.8,
    )*/
    ctx.fillText(
      `${-depth} F` + (floorLabels[-depth] ? ` (${floorLabels[-depth]})` : ''),
      3,
      0.5 * canvas.height + ((depth - cursor[2]) / visibleFloors) * canvas.height - 5
    )
    ctx.restore()
  }

  function drawTile(
    ctx: CanvasRenderingContext2D,
    _tile: Tile,
    pos: Pos,
    boundingRect: Rect,
    cursor: Pos
  ) {
    ctx.save()
    ctx.translate(0, 0.5 * canvas.height + ((pos[2] - cursor[2]) / visibleFloors) * canvas.height)
    transformIsometric(ctx)
    ctx.fillStyle = '#888'
    ctx.globalAlpha = cursor[2] === pos[2] ? 0.8 : 0.2
    ctx.fillRect(
      ((pos[0] - boundingRect[0]) / (boundingRect[2] + 1)) * canvas.width,
      ((pos[1] - boundingRect[1]) / (boundingRect[3] + 1)) * canvas.height,
      Math.max(canvas.width / (boundingRect[2] + 0.9), 1),
      Math.max(canvas.height / (boundingRect[3] + 0.9), 1)
    )
    ctx.restore()
  }

  function drawScreenQube(ctx: CanvasRenderingContext2D, screenQube: Qube, boundingRect: Rect) {
    ctx.save()
    ctx.translate(0, 0.5 * canvas.height)
    transformIsometric(ctx)
    ctx.strokeStyle = '#ff0'
    ctx.globalAlpha = 0.5
    const qubeStart = [
      Math.min(
        Math.max(((screenQube[0] - boundingRect[0]) / (boundingRect[2] + 1)) * canvas.width, 0),
        canvas.width
      ),
      Math.min(
        Math.max(((screenQube[1] - boundingRect[1]) / (boundingRect[3] + 1)) * canvas.height, 0),
        canvas.height
      ),
    ]
    const qubeEnd = [
      Math.min(
        Math.max(
          ((screenQube[0] + screenQube[3] - boundingRect[0]) / (boundingRect[2] + 1)) *
            canvas.width,
          0
        ),
        canvas.width
      ),
      Math.min(
        Math.max(
          ((screenQube[1] + screenQube[4] - boundingRect[1]) / (boundingRect[3] + 1)) *
            canvas.height,
          0
        ),
        canvas.height
      ),
    ]

    ctx.strokeRect(qubeStart[0], qubeStart[1], qubeEnd[0] - qubeStart[0], qubeEnd[1] - qubeStart[1])
    transformIsometric(ctx)
    ctx.restore()
  }

  onMount(() => {
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!
    if (ctx === null)
      throw Error(
        'Fail to load Canvas Rendering Context. It might canvas is not supported on your browser?'
      )
    let frame = requestAnimationFrame(loop)

    ctx.font = ctx.font.replace(/\d+px/, '30px')

    function loop() {
      frame = requestAnimationFrame(loop)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const c = [
        tilemap.boundingQube[0] + tilemap.boundingQube[3] * 0.5,
        tilemap.boundingQube[1] + tilemap.boundingQube[4] * 0.5,
      ]
      const d = Math.max(tilemap.boundingQube[3], tilemap.boundingQube[4]) + 5
      const boundingRect: Rect = [Math.max(c[0] - d * 0.5, 0), Math.max(c[1] - d * 0.5, 0), d, d]
      for (
        let i = cursor[2] + Math.floor(visibleFloors * 0.5) + 5;
        i >= Math.max(cursor[2] - Math.floor(visibleFloors * 0.5) - 5, 0);
        --i
      ) {
        drawFloor(ctx, i, cursor)
        let boundingQube: Qube = [...tilemap.boundingQube]
        boundingQube[2] = i
        boundingQube[5] = 0
        for (let tile of tilemap.tiles(boundingQube)) {
          drawTile(ctx, tile.tile, tile.pos, boundingRect, cursor)
        }
      }
      drawFloor(ctx, cursor[2], cursor)
      let boundingQube: Qube = [...tilemap.boundingQube]
      boundingQube[2] = cursor[2]
      boundingQube[5] = 0
      for (let tile of tilemap.tiles(boundingQube)) {
        drawTile(ctx, tile.tile, tile.pos, boundingRect, cursor)
      }

      drawScreenQube(ctx, screenQube, boundingRect)
    }

    return () => {
      cancelAnimationFrame(frame)
    }
  })
</script>

<canvas bind:this="{canvas}" style="width: 100%; height: 100%;" use:canvasResize></canvas>
