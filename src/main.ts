import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'

const target = document.getElementById('app')
if (target === null) throw Error('#app element is not exists!(check the main.ts file)')

const app = mount(App, { target })

export default app
