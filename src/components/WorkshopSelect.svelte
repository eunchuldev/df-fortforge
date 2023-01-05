<script lang="ts">
  import { WorkshopManagerCommand } from '../lib/fortforge/workshop.command.js'
  import { hotkey } from '../lib/svelte-actions/hotkey.js'
  import Icon from '@iconify/svelte/dist/OfflineIcon.svelte'

  export let targetWorkshopGroupName = ''
  export let targetWorkshopName = ''
  export let open = true

  function escape() {
    if (targetWorkshopName) {
      targetWorkshopName = ''
      return true
    } else if (targetWorkshopGroupName) {
      targetWorkshopGroupName = ''
      return true
    }
    return false
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (escape()) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
  }
  function onMouseRightClick(e: MouseEvent) {
    if (escape()) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
</script>

<svelte:window on:keydown="{onKeyDown}" on:contextmenu="{onMouseRightClick}" />

{#if open}
  <div class="flex leading-tight tracking-tighter text-sm w-fit">
    <div class="flex flex-col">
      {#each WorkshopManagerCommand.WORKSHOPGROUPS as wg}
        <div class="flex flex-row items-stretch relative">
          <button
            id="action-workshopgroup-{wg.name}"
            on:click="{() => {
              if (targetWorkshopGroupName === wg.name) targetWorkshopGroupName = ''
              else targetWorkshopGroupName = wg.name ?? ''
              targetWorkshopName = ''
            }}"
            title="{wg.name}"
            use:hotkey="{wg.hotkey}"
            class="bg-slate-100 py-2 px-4 my-0.5 flex rounded w-full items-center justify-between"
            class:activated="{wg.name === targetWorkshopGroupName}"
          >
            <div class="flex items-center">
              {#if wg.icon}
                <Icon icon="{wg.icon}" height="1.5em" class="mr-2" />
              {/if}
              <span> {wg.name} </span>
            </div>
            <span class=""> > </span>
            <span class="absolute top-0.5 left-1 text-xs"> {wg.hotkey} </span>
          </button>
          {#if targetWorkshopGroupName === wg.name && wg.children}
            <div class="flex flex-col justify-end ml-2 absolute left-full w-fit">
              {#each Object.values(wg.children) as workshopName (workshopName)}
                {@const workshop = WorkshopManagerCommand.WORKSHOPS[workshopName]}
                <div>
                  <button
                    id="action-workshop-{workshop.name}"
                    on:click="{() => {
                      targetWorkshopName = workshopName
                    }}"
                    title="{workshop.name}"
                    use:hotkey="{workshop.hotkey}"
                    class="bg-slate-100 py-2 px-4 my-0.5 flex rounded w-full relative items-center"
                    class:activated="{workshop.name === targetWorkshopName}"
                  >
                    {#if workshop.icon}
                      <Icon icon="{workshop.icon}" height="1.5em" class="mr-2" />
                    {/if}
                    <span> {workshop.name} </span>
                    <span class="absolute top-0.5 left-1 text-xs"> {workshop.hotkey} </span>
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
      {#each WorkshopManagerCommand.WORKSHOPSNOGROUP as workshopName}
        {@const workshop = WorkshopManagerCommand.WORKSHOPS[workshopName]}
        <div class="relative">
          <button
            id="action-workshop-{workshop.name}"
            on:click="{() => {
              targetWorkshopName = workshopName
              targetWorkshopGroupName = workshopName
            }}"
            title="{workshop.name}"
            use:hotkey="{workshop.hotkey}"
            class="bg-slate-100 py-2 px-4 my-0.5 flex rounded w-full items-center"
            class:activated="{workshop.name === targetWorkshopName}"
          >
            {#if workshop.icon}
              <Icon icon="{workshop.icon}" height="1.5em" class="mr-2" />
            {/if}
            <span> {workshop.name} </span>
            <span class="absolute top-0.5 left-1 text-xs"> {workshop.hotkey} </span>
          </button>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style lang="postcss">
  .activated {
    @apply bg-slate-500;
  }
</style>
