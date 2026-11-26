import { install, uninstall } from '@github/hotkey'
import type { Attachment } from 'svelte/attachments'

interface HotkeyOptions {
  key: string
  preventDefault?: boolean
  stopPropagation?: boolean
}

export function hotkey(
  shortcut: string | HotkeyOptions | null | undefined
): Attachment<HTMLElement> {
  return (node) => {
    if (!shortcut) return
    const options = typeof shortcut === 'string' ? { key: shortcut } : shortcut
    if (!options.key) return

    function onFire(event: Event) {
      if (options.preventDefault) event.preventDefault()
      if (options.stopPropagation) event.stopPropagation()
    }

    node.dataset.hotkey = options.key
    install(node)
    node.addEventListener('hotkey-fire', onFire)
    return () => {
      uninstall(node)
      delete node.dataset.hotkey
      node.removeEventListener('hotkey-fire', onFire)
    }
  }
}
