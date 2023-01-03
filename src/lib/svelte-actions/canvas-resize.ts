export function canvasResize(canvas: HTMLCanvasElement) {
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      let width: number
      let height: number
      let dpr = window.devicePixelRatio
      if (entry.devicePixelContentBoxSize) {
        width = entry.devicePixelContentBoxSize[0].inlineSize
        height = entry.devicePixelContentBoxSize[0].blockSize
        dpr = 1
      } else if (entry.contentBoxSize?.length) {
        width = entry.contentBoxSize[0].inlineSize
        height = entry.contentBoxSize[0].blockSize
      } else {
        width = entry.contentRect.width
        height = entry.contentRect.height
      }
      const displayWidth = Math.round(width * dpr)
      const displayHeight = Math.round(height * dpr)
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth
        canvas.height = displayHeight
      }
    }
  })

  resizeObserver.observe(canvas, { box: 'content-box' })

  return {
    destroy() {
      resizeObserver.disconnect()
    },
  }
}
