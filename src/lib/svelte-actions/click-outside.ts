export function clickOutside<Fn extends () => void>(node: HTMLElement, onEventFunction: Fn) {
  const handleClick = (event: MouseEvent) => {
    const path = event.composedPath()

    if (!path.includes(node)) {
      onEventFunction()
    }
  }

  document.addEventListener('mousedown', handleClick)

  return {
    destroy() {
      document.removeEventListener('mousedown', handleClick)
    },
  }
}
