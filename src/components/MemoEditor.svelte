<script lang="ts">
  import { untrack } from 'svelte'
  import type { Pos } from '../lib/geometry'

  let {
    pos,
    memo,
    onSave,
    onClose,
  }: {
    pos: Pos
    memo?: string
    onSave: (memo?: string) => void
    onClose: () => void
  } = $props()

  let draft = $state(untrack(() => memo ?? ''))
</script>

<dialog
  aria-labelledby="memo-title"
  aria-modal="true"
  class="fixed inset-0 m-auto w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-auto rounded-md border border-amber-400 bg-amber-100 text-stone-900 shadow-lg backdrop:bg-black/25"
  {@attach (dialog: HTMLDialogElement) => {
    dialog.showModal()
    dialog.querySelector('textarea')?.focus()
  }}
  onkeydown={(event) => {
    event.stopPropagation()
    if (
      !event.isComposing &&
      event.key === 'Enter' &&
      (event.ctrlKey || event.metaKey) &&
      draft.trim()
    ) {
      event.preventDefault()
      event.currentTarget.close('save')
    }
  }}
  onclose={(event) => {
    const result = event.currentTarget.returnValue
    if (result === 'save' && draft.trim()) onSave(draft)
    else if (result === 'delete') onSave()
    onClose()
  }}
>
  <form method="dialog" class="space-y-3 p-4">
    <div class="flex items-baseline justify-between gap-2">
      <label id="memo-title" for="memo-text" class="font-semibold">Post-it memo</label>
      <span class="text-xs text-amber-900">{pos[0]}, {pos[1]} · {-pos[2]}F</span>
    </div>
    <textarea
      id="memo-text"
      rows="5"
      class="block w-full resize-y rounded border border-amber-400 bg-amber-50 p-2 text-sm focus:outline-amber-700"
      bind:value={draft}></textarea>
    <div class="flex items-center gap-2 text-sm">
      {#if memo}
        <button value="delete" class="rounded px-2 py-1 text-red-800 hover:bg-red-100">
          Delete
        </button>
      {/if}
      <button value="cancel" class="ml-auto rounded px-2 py-1 hover:bg-amber-200">Cancel</button>
      <button
        value="save"
        title="Save memo (Ctrl or ⌘ + Enter)"
        class="rounded bg-stone-800 px-3 py-1 text-white hover:bg-stone-700 disabled:opacity-40"
        disabled={!draft.trim()}
      >
        Save
      </button>
    </div>
  </form>
</dialog>
