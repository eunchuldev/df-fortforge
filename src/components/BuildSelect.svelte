<script lang="ts">
  import Icon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import type { BuildEntry } from '../lib/buildings.js'
  import type { Qube } from '../lib/geometry'

  let {
    path,
    footprint,
    drawing,
    fits,
    navigate,
    back,
  }: {
    path: BuildEntry[]
    footprint?: Qube
    drawing: boolean
    fits: boolean
    navigate: (path: BuildEntry[]) => void
    back: () => void
  } = $props()

  const entry = $derived(path[path.length - 1])
  let choices = $state<HTMLDivElement>()
  $effect(() => {
    if ('children' in entry) choices?.querySelector('button')?.focus({ preventScroll: true })
  })
</script>

<section
  id="build-menu"
  aria-label="Build menu"
  class="fixed bottom-22 left-8 w-max max-w-[calc(100vw-3rem)] rounded-lg border border-slate-300 bg-slate-50 text-sm text-slate-900 shadow-lg"
  oncontextmenu={(event) => {
    event.preventDefault()
    back()
  }}
>
  <nav aria-label="Build path" class="flex flex-wrap items-center gap-x-1 px-2 py-1">
    <button
      type="button"
      aria-label={drawing ? 'Cancel first corner' : path.length === 1 ? 'Close Build' : 'Go back'}
      title="Back (right-click)"
      class="min-h-8 w-8 rounded text-lg hover:bg-slate-200"
      onclick={back}
    >
      {path.length === 1 ? '×' : '‹'}
    </button>
    {#each path as part, i}
      {#if i > 0}<span aria-hidden="true" class="text-slate-400">›</span>{/if}
      {#if i + 1 === path.length}
        <strong class="px-1">{part.name}</strong>
      {:else}
        <button
          aria-label="Back to {part.name}"
          class="rounded px-1 py-1 text-slate-600 hover:bg-slate-200"
          onclick={() => navigate(path.slice(0, i + 1))}
        >
          {part.name}
        </button>
      {/if}
    {/each}
  </nav>
  {#if 'children' in entry}
    <div
      bind:this={choices}
      class="grid max-h-[calc(100dvh-11rem)] gap-px overflow-y-auto border-t border-slate-200 p-1"
      class:sm:grid-cols-2={entry.children.length > 6}
    >
      {#each entry.children as option (option.name)}
        <button
          type="button"
          aria-label={option.name}
          class="flex min-h-8 items-center gap-2 rounded px-2 text-left hover:bg-slate-200 focus-visible:bg-slate-200"
          onclick={() => navigate([...path, option])}
        >
          <kbd class="w-5 shrink-0 text-center font-semibold text-slate-600">
            {option.hotkey ?? ''}
          </kbd>
          {#if 'glyph' in option && option.glyph}
            <span aria-hidden="true" class="w-5 text-center text-lg leading-none">
              {option.glyph}
            </span>
          {:else if option.icon}
            <Icon icon={option.icon} width="1.25em" />
          {/if}
          <span class="grow">{option.name}</span>
          {#if 'children' in option}
            <span aria-hidden="true" class="ml-2 text-slate-500">›</span>
          {:else if (option.width ?? 1) > 1}
            <span class="ml-2 text-xs text-slate-500">{option.width}×{option.height}</span>
          {/if}
        </button>
      {/each}
    </div>
  {:else if footprint}
    <div class="flex items-center gap-4 border-t border-slate-200 px-3 py-2 text-xs">
      <span class:text-red-700={!fits}>
        {#if !fits}Footprint extends beyond the map
        {:else if entry.rectangle}{drawing ? 'Choose opposite corner' : 'Choose first corner'}
        {:else}Click or Enter to place{/if}
      </span>
      <span class="ml-auto text-slate-500">
        {footprint[3] + 1}×{footprint[4] + 1}{#if footprint[5] > 0}
          · {footprint[5] + 1} levels{/if}
      </span>
    </div>
    {#if entry.impassables && !entry.glyph}
      {@const cells = (footprint[3] + 1) * (footprint[4] + 1)}
      <p class="px-3 pb-2 text-xs text-slate-600">
        {#if entry.impassables.length}
          {cells - entry.impassables.length} passable · {entry.impassables.length} impassable
        {:else}
          All {cells} tiles are passable
        {/if}
      </p>
    {/if}
  {/if}
</section>
