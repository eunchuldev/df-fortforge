<script lang="ts">
  import { clickOutside } from '../lib/svelte-actions/click-outside.js'
  export let open = false
</script>

<div
  use:clickOutside={() => (open = false)}
  on:keydown={(e) => {
    if (e.key === 'Escape') open = false
  }}
  class="relative"
>
  <button on:click={() => (open = !open)} class="w-full h-full border-0 bg-none">
    <slot name="head" />
  </button>
  {#if open}
    <button class="absolute w-max flex flex-col items-stretch border bg-white">
      <slot />
    </button>
  {/if}
</div>
