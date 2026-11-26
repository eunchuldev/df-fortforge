<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    open = $bindable(false),
    head,
    children,
  }: {
    open?: boolean
    head: Snippet
    children: Snippet
  } = $props()

  let dropdown: HTMLDivElement

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false
  }
</script>

<svelte:window onkeydown={onKeydown} />
<svelte:document
  onmousedown={(event: MouseEvent) => {
    if (!event.composedPath().includes(dropdown)) open = false
  }}
/>

<div bind:this={dropdown} class="relative">
  <button
    onclick={() => (open = !open)}
    aria-expanded={open}
    class="w-full h-full border-0 bg-none"
  >
    {@render head()}
  </button>
  {#if open}
    <div class="absolute w-max flex flex-col items-stretch border bg-white">
      {@render children()}
    </div>
  {/if}
</div>
