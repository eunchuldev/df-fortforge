<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { Volume } from '../lib/utils/geometry'
  import { version, supportDFVersion, build } from '../lib/constants.js'
  import { snakeCase } from 'change-case'
  import Modal from './Modal.svelte'
  import Icon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import FortIcon from '@iconify-icons/fa-brands/fort-awesome-alt'
  import GenMacroIcon from '@iconify-icons/mdi/creation'
  import MoreIcon from '@iconify-icons/mdi/dots-vertical'
  import UploadIcon from '@iconify-icons/mdi/upload'
  import ResizeIcon from '@iconify-icons/mdi/arrow-expand'
  import HotkeysIcon from '@iconify-icons/mdi/keyboard'
  import AbandonIcon from '@iconify-icons/mdi/close'
  import SaveAsIcon from '@iconify-icons/mdi/download'
  import Dropdown from './Dropdown.svelte'
  import GithubIcon from '@iconify-icons/mdi/github'
  import AboutIcon from '@iconify-icons/mdi/information'

  enum Modals {
    None,
    GenDFMacro,
    ResizeTilemap,
    ShowUsefulHotkeys,
    DownloadFort,
    About,
  }

  interface TopNavEvent {
    genDFMacro: typeof genDFMacro
    abandonFort: null
    resize: Volume
    uploadFort: string
    downloadFort: typeof downloadFort
    changeFortName: string
  }

  const dispatch = createEventDispatcher<TopNavEvent>()

  export let tilemapVolume: Volume = [100, 100, 100]
  export let fortName = 'Unnamed Fort'

  let openedModal: Modals = Modals.None
  let dfMacroText = ''
  let downloadFortData = ''

  function uploadFort(e: Event & { currentTarget: EventTarget | HTMLInputElement }) {
    const reader = new FileReader()
    reader.onload = () => {
      if (!reader.result) throw Error('fail to upload. file seems to be empty')
      dispatch('uploadFort', reader.result.toString())
    }
    const target = <HTMLInputElement>e.currentTarget
    if (target.files === null) throw Error('fail to upload. file is null')
    reader.readAsText(target.files[0])
  }

  function genDFMacro(_dfMacroText: string) {
    openedModal = Modals.GenDFMacro
    dfMacroText = _dfMacroText
  }

  function downloadFort(data: string) {
    openedModal = Modals.DownloadFort
    downloadFortData = data
  }

  function blurOnEnterOrEscape(e: KeyboardEvent) {
    if (['Enter', 'Escape'].includes(e.key)) {
      (<HTMLInputElement>e.target).blur()
      return false
    }
  }
</script>

<div
  id="topnav"
  class="fixed top-0 left-0 bg-white flex items-center flex-nowrap opacity-50 hover:opacity-100 rounded-br-full shadow pr-4"
>
  <label class="p-1 h-12" for="fort-name">
    <Icon icon="{FortIcon}" inline="{true}" height="2.5em" />
  </label>
  <input
    class="rounded pl-4 self-stretch focus:pl-3 text-slate-500 focus:text-black focus:tracking-normal tracking-wide"
    id="fort-name"
    bind:value="{fortName}"
    on:change="{() => dispatch('changeFortName', fortName)}"
    on:keydown|stopPropagation="{blurOnEnterOrEscape}"
  />
  <button
    id="gen-macro-btn"
    class="flex items-center rounded-full px-3 h-8 hover:bg-slate-200"
    on:click="{() => dispatch('genDFMacro', genDFMacro)}"
  >
    <Icon icon="{GenMacroIcon}" inline="{true}" />
    <span class="mx-1">gen macro</span>
    <Icon icon="{GenMacroIcon}" inline="{true}" />
  </button>
  <button
    class="flex items-center rounded-full px-3 h-8 hover:bg-slate-200"
    on:click="{() => dispatch('abandonFort')}"
  >
    <Icon icon="{AbandonIcon}" inline="{true}" />
    <span>abandon fort</span>
    <Icon icon="{AbandonIcon}" inline="{true}" />
  </button>

  <Dropdown>
    <button
      slot="head"
      class="hover:bg-slate-200 rounded-full w-8 h-8 text-center flex items-center justify-center mr-4"
    >
      <Icon icon="{MoreIcon}" width="1.5em" inline="{true}" />
    </button>
    <button
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center"
      on:click="{() => dispatch('downloadFort', downloadFort)}"
    >
      <Icon icon="{SaveAsIcon}" inline="{true}" />
      <span class="ml-1"> save to desktop</span>
    </button>
    <input type="file" class="hidden" id="upload-fort" on:change="{uploadFort}" accept=".dffort" />
    <label
      for="upload-fort"
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center cursor-pointer"
    >
      <Icon icon="{UploadIcon}" inline="{true}" />
      <span class="ml-1"> upload from destktop </span>
    </label>
    <button
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center"
      on:click="{() => (openedModal = Modals.ResizeTilemap)}"
    >
      <Icon icon="{ResizeIcon}" inline="{true}" />
      <span class="ml-1"> resize tilemap </span>
    </button>
    <button
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center"
      on:click="{() => (openedModal = Modals.ShowUsefulHotkeys)}"
    >
      <Icon icon="{HotkeysIcon}" inline="{true}" />
      <span class="ml-1"> show useful hotkeys </span>
    </button>

    <a
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center"
      href="https://github.com/eunchuldev/df-fortforge"
    >
      <Icon icon="{GithubIcon}" inline="{true}" />
      <span class="ml-1"> visit repo </span>
    </a>

    <button
      class="text-left py-1 px-2 hover:bg-slate-200 flex items-center"
      on:click="{() => (openedModal = Modals.About)}"
    >
      <Icon icon="{AboutIcon}" inline="{true}" />
      <span class="ml-1"> about </span>
    </button>
  </Dropdown>
</div>

{#if openedModal === Modals.GenDFMacro}
  <Modal on:close="{() => (openedModal = Modals.None)}">
    <div class="m-4">
      <h3 class="text-lg mb-6">Your macro is ready!</h3>
      <ol class="list-decimal list-inside [&>li]:mt-4">
        <li>
          Click the link below to download the macro
          <a
            class="px-2 py-1 flex items-center border rounded-full inline-block w-fit bg-slate-200 hover:bg-slate-300"
            href="{window.URL.createObjectURL(new Blob([dfMacroText], { type: 'plain/text' }))}"
            download="{snakeCase(fortName)}.mak"
          >
            <Icon icon="{SaveAsIcon}" inline="{true}" />
            <span class="ml-1"> {snakeCase(fortName)}.mak </span>
          </a>
          <span class="text-xs">
            {dfMacroText.split('\n').length}lines
          </span>
        </li>
        <li>
          Place the macro file on the Dwarf fortress macros directory.
          <ul class="ml-6 list-disc">
            <li>
              windows: <span class="code">
                C:\Program Files\Steam\steamapps\common/Dwarf Fortress/prefs/macros/
              </span>
            </li>
            <li>
              linux: <span class="code">
                ~/.steam/steam/steamapps/common/Dwarf Fortress/prefs/macros/
              </span>
            </li>
          </ul>
        </li>
        <li>
          While playing Dwarf Fortress, you can load macros by press <span class="code">
            Ctrl + l
          </span>
          and replay it by press <span class="code"> Ctrl + p </span>
        </li>
      </ol>
      <button
        on:click="{() => (openedModal = Modals.None)}"
        class="p-2 px-4 rounded mt-8 bg-slate-200 hover:bg-slate-300 active:bg-slate-200"
      >
        Done
      </button>
    </div>
  </Modal>
{:else if openedModal === Modals.ResizeTilemap}
  <Modal on:close="{() => (openedModal = Modals.None)}">
    <div class="m-4">
      <h3 class="text-lg mb-6">Resize Tile Map</h3>
      <div>
        <label for="resize-x" class="block text-sm"> width </label>
        <input
          class="border p-2"
          type="number"
          step="1"
          min="1"
          max="1000"
          id="resize-x"
          bind:value="{tilemapVolume[0]}"
        />
      </div>
      <div class="mt-2">
        <label for="resize-y" class="block text-sm"> height </label>
        <input
          class="border p-2"
          type="number"
          step="1"
          min="1"
          max="1000"
          id="resize-y"
          bind:value="{tilemapVolume[1]}"
        />
      </div>
      <div class="mt-2">
        <label for="resize-z" class="block text-sm"> depth </label>
        <input
          class="border p-2"
          type="number"
          step="1"
          min="1"
          max="1000"
          id="resize-z"
          bind:value="{tilemapVolume[2]}"
        />
      </div>
      <div class="italic text-red-500 mt-8">Warning: Too high volume can cause errors</div>
      <button
        class="p-2 px-4 rounded mt-8 bg-slate-200 hover:bg-slate-300 active:bg-slate-200"
        on:click="{() => {
          dispatch('resize', tilemapVolume)
          openedModal = Modals.None
        }}"
      >
        Apply
      </button>
    </div>
  </Modal>
{:else if openedModal === Modals.DownloadFort}
  <Modal on:close="{() => (openedModal = Modals.None)}">
    <div class="m-4">
      <a
        class="px-2 py-1 flex items-center border rounded-full inline-block w-fit bg-slate-200 hover:bg-slate-300"
        href="{window.URL.createObjectURL(new Blob([downloadFortData], { type: 'plain/text' }))}"
        download="{snakeCase(fortName)}.dffort"
        on:click="{() => (openedModal = Modals.None)}"
      >
        <Icon icon="{SaveAsIcon}" inline="{true}" />
        <span class="ml-1"> {snakeCase(fortName)}.dffort </span>
      </a>
    </div>
  </Modal>
{:else if openedModal === Modals.ShowUsefulHotkeys}
  <Modal on:close="{() => (openedModal = Modals.None)}">
    <div class="m-4">
      <h3 class="text-lg mb-6">Hotkey Cheatsheet</h3>
      <table class="table-auto w-full text-left [&_tr]:border-b [&_th]:p-2 [&_td]:p-2 leading-8">
        <thead>
          <tr class="border-b">
            <th> Description </th>
            <th> Hotkey </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="2" class="bg-slate-100 px-2 font-bold text-center"> Screen Control </td>
          </tr>
          <tr>
            <td> Pan the screen </td>
            <td class="">
              <span class="code"> w </span>
              <span class="code"> a </span>
              <span class="code"> s </span>
              <span class="code"> d </span>

              <br />

              <span class="code"> Shift + w </span>
              <span class="code"> Shift + a </span>
              <span class="code"> Shift + s </span>
              <span class="code"> Shift + d </span>

              <br />

              <span class="code"> Alt + w </span>
              <span class="code"> Alt + a </span>
              <span class="code"> Alt + s </span>
              <span class="code"> Alt + d </span>
            </td>
          </tr>
          <tr>
            <td> Change tile size </td>
            <td>
              <span class="code"> [ </span>
              <span class="code"> ] </span>
            </td>
          </tr>
          <tr>
            <td> Move cursor vertical <br /> (z-axis) </td>
            <td>
              <span class="code"> e </span>
              <span class="code"> c </span>
              <br />
              <span class="code"> Shift + e </span>
              <span class="code"> Shift + c </span>
            </td>
          </tr>
          <tr>
            <td> Move cursor horizontal <br /> (x-axis, y-axis) </td>
            <td>
              <span class="code"> Arrow </span>
              <br />
              <span class="code"> Shift + Arrow </span>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="bg-slate-100 px-2 font-bold text-center"> Selection </td>
          </tr>
          <tr>
            <td> Extend Selection </td>
            <td>
              <span class="code"> Shift + Select </span>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="bg-slate-100 px-2 font-bold text-center"> Label </td>
          </tr>
          <tr>
            <td> Extend Label Area </td>
            <td>
              <span class="code"> SelectLabel + Shift + Select </span>
            </td>
          </tr>
        </tbody>
      </table>
      <button
        class="p-2 px-4 rounded mt-8 bg-slate-200 hover:bg-slate-300 active:bg-slate-200"
        on:click="{() => (openedModal = Modals.None)}"
      >
        Close
      </button>
    </div>
  </Modal>
{:else if openedModal === Modals.About}
  <Modal on:close="{() => (openedModal = Modals.None)}">
    <div class="m-4">
      <h1 class="text-2xl block mt-4 mb-8">About</h1>
      <table class="auto w-full [&_td]:p-2 [&_td]:border-t">
        <tbody>
          <tr>
            <td> App Name </td>
            <td> DF FortForge </td>
          </tr>
          <tr>
            <td> Version </td>
            <td> <span class="code"> {version} </span> </td>
          </tr>
          <tr>
            <td> Build </td>
            <td> <span class="code"> {build} </span> </td>
          </tr>
          <tr>
            <td> Support DF Version </td>
            <td> <span class="code"> {supportDFVersion} </span> </td>
          </tr>
          <tr>
            <td> Author </td>
            <td> Eunchul Song </td>
          </tr>
          <tr>
            <td> Email </td>
            <td>
              <a href="mailto:eunchulsong9@gmail.com" class="text-blue-500">
                eunchulsong9@gmail.com
              </a>
            </td>
          </tr>
        </tbody>
      </table>
      <button
        class="p-2 px-4 rounded mt-8 bg-slate-200 hover:bg-slate-300 active:bg-slate-200"
        on:click="{() => (openedModal = Modals.None)}"
      >
        Close
      </button>
    </div>
  </Modal>
{/if}

<style lang="postcss">
  .code {
    @apply text-xs bg-slate-100 text-red-600 py-1 px-2 tracking-wide border rounded;
  }
</style>
