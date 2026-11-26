<script lang="ts">
  import { onMount, type Snippet } from 'svelte'
  let { onclose, children }: { onclose: () => void; children: Snippet } = $props()

  let modal: HTMLElement

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onclose()
      return
    }

    if (e.key === 'Tab') {
      // trap focus
      const nodes: Iterable<HTMLElement> = modal.querySelectorAll('*')
      const tabbable = Array.from(nodes).filter((n) => n.tabIndex >= 0)

      if (!tabbable.length) return
      let index = tabbable.indexOf(document.activeElement as HTMLElement)
      if (index === -1 && e.shiftKey) index = 0

      index += tabbable.length + (e.shiftKey ? -1 : 1)
      index %= tabbable.length

      tabbable[index].focus()
      e.preventDefault()
    }
  }

  onMount(() => {
    const previous = document.activeElement
    return () => {
      if (previous instanceof HTMLElement) previous.focus()
    }
  })
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="fixed inset-0 w-full h-full bg-black/30 overflow-y-auto"
  role="presentation"
  onclick={onclose}
></div>

<div
  class="max-w-3xl w-3/4 rounded-md space-y-5 overflow-auto shadow-lg bg-white fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
  role="dialog"
  aria-modal="true"
  bind:this={modal}
>
  {@render children()}
</div>
