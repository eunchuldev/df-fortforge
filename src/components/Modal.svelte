<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte'

  const dispatch = createEventDispatcher()
  const close = () => dispatch('close')

  let modal: HTMLElement

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close()
      return
    }

    if (e.key === 'Tab') {
      // trap focus
      const nodes: Iterable<HTMLElement> = modal.querySelectorAll('*')
      const tabbable = Array.from(nodes).filter((n) => n.tabIndex >= 0)

      let index = tabbable.indexOf(<HTMLElement>document.activeElement)
      if (index === -1 && e.shiftKey) index = 0

      index += tabbable.length + (e.shiftKey ? -1 : 1)
      index %= tabbable.length

      tabbable[index].focus()
      e.preventDefault()
    }
  }

  const previously_focused = typeof document !== 'undefined' && <HTMLElement>document.activeElement

  if (previously_focused) {
    onDestroy(() => {
      previously_focused.focus()
    })
  }
</script>

<svelte:window on:keydown={onKeydown} />

<div
  class="fixed inset-0 w-full h-full bg-black bg-opacity-30 overflow-y-auto"
  on:click={close}
  on:keydown={onKeydown}
/>

<div
  class="max-w-3xl w-3/4 rounded-md space-y-5 overflow-auto shadow-lg bg-white fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
  role="dialog"
  aria-modal="true"
  bind:this={modal}
>
  <slot />
  <!-- svelte-ignore a11y-autofocus -->
</div>
