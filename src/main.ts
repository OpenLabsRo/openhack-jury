import App from './App.svelte'
import { mount } from 'svelte'

// Wait for the animation to play before mounting the app
setTimeout(() => {
  const target = document.getElementById('app')

  // Clear the static loader from index.html before mounting the app
  if (target) {
    target.innerHTML = ''

    const app = mount(App, {
      target: target,
    })
  }

  // We don't need to export the app instance anymore as it's self-contained
  // export default app
}, 300)
