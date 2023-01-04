import { install, uninstall } from '@github/hotkey'

function setAndInstall(node: HTMLElement, key: string) {
  node.dataset.hotkey = key
  install(node)
}

interface Options {
  key: string
  preventDefault?: boolean
  stopPropagation?: boolean
}

type Param = Options | string | null | undefined

function isKey(param: Param): param is string {
  return typeof param === 'string'
}

function stopPropagation(e: Event) {
  e.stopPropagation()
}

function preventDefault(e: Event) {
  e.preventDefault()
}

export function hotkey(node: HTMLElement, param: Param) {
  let options: Options = {
    key: '',
    preventDefault: false,
    stopPropagation: false,
  }
  if (isKey(param)) {
    options.key = param
  } else if (param) {
    options = param
  }
  setAndInstall(node, options.key)

  if (options.stopPropagation) node.addEventListener('hotkey-fire', stopPropagation)
  if (options.preventDefault) node.addEventListener('hotkey-fire', preventDefault)

  return {
    update: (param: Param) => {
      if (options.stopPropagation) node.removeEventListener('hotkey-fire', stopPropagation)
      if (options.preventDefault) node.removeEventListener('hotkey-fire', preventDefault)

      if (isKey(param)) {
        options.key = param
      } else if (param) {
        options = param
      }

      if (node.dataset.hotkey) {
        uninstall(node)
      }
      if (options.key) {
        setAndInstall(node, options.key)
        if (options.stopPropagation) node.addEventListener('hotkey-fire', stopPropagation)
        if (options.preventDefault) node.addEventListener('hotkey-fire', preventDefault)
      } else {
        delete node.dataset.hotkey
      }
    },
    destroy: () => {
      uninstall(node)
      if (options.stopPropagation) node.removeEventListener('hotkey-fire', stopPropagation)
      if (options.preventDefault) node.removeEventListener('hotkey-fire', preventDefault)
    },
  }
}
