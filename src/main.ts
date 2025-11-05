import App from './App.svelte'
import { mount } from 'svelte'

// Mount the app immediately (no animation delay)
const target = document.getElementById('app')

if (target) {
  target.innerHTML = ''

  const app = mount(App, {
    target: target,
  })
}

