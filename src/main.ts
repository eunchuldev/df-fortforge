import './app.css'
import App from './App.svelte'

const target = document.getElementById('app')
if (target === null) throw Error('#app element is not exists!(check the main.ts file)')

const app = new App({
  target,
})

export default app
