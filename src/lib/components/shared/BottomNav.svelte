<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { navigate } from 'svelte5-router'
  import { writable } from 'svelte/store'

  // Track current path so we can highlight active tab
  const currentPath = writable(typeof window !== 'undefined' ? window.location.pathname : '/')

  function go(path: string) {
    if (typeof window === 'undefined') return
    if (path === window.location.pathname) return
    navigate(path)
    currentPath.set(path)
  }

  function handlePopState() {
    currentPath.set(window.location.pathname)
  }

  onMount(() => {
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  })
</script>

<!--
  Bottom navigation shared by mobile & desktop.
  - Two tabs: Teams and Jury (Jury is the default route '/').
  - Visuals inspired by the participants mobile bar but simplified.
-->

<nav
  aria-label="Primary"
  class="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-[92%] max-w-3xl rounded-xl bg-[#0B0B0B]/95 backdrop-blur-md shadow-lg border border-white/6 md:bottom-6 md:w-[720px] md:left-1/2"
>
  <div class="flex items-center justify-around px-2 py-2">
    <!-- Teams -->
    <button
      type="button"
      on:click={() => go('/teams')}
      class="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors focus:outline-none"
      aria-label="Teams"
    >
      {#if $currentPath === '/teams'}
        <svg class="h-6 w-6 text-[#FE5428]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75zM5.75 5.5c-.69 0-1.25.56-1.25 1.25v.5h14v-.5c0-.69-.56-1.25-1.25-1.25H5.75zM5 9v7.25c0 .69.56 1.25 1.25 1.25H7V9H5zM9 9v9h6V9H9zM17 9v8.5h.75c.69 0 1.25-.56 1.25-1.25V9h-2z" />
        </svg>
        <span class="text-xs text-[#FE5428]">Teams</span>
      {:else}
        <svg class="h-6 w-6 text-zinc-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75zM5.75 5.5c-.69 0-1.25.56-1.25 1.25v.5h14v-.5c0-.69-.56-1.25-1.25-1.25H5.75zM5 9v7.25c0 .69.56 1.25 1.25 1.25H7V9H5zM9 9v9h6V9H9zM17 9v8.5h.75c.69 0 1.25-.56 1.25-1.25V9h-2z" />
        </svg>
        <span class="text-xs text-zinc-400">Teams</span>
      {/if}
    </button>

    <!-- Jury -->
    <button
      type="button"
      on:click={() => go('/')}
      class="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors focus:outline-none"
      aria-label="Jury"
    >
      {#if $currentPath === '/'}
        <svg class="h-6 w-6 text-[#FE5428]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a1 1 0 0 1 1 1v1.07A7.002 7.002 0 0 1 20 11v2a3 3 0 0 1-3 3h-1v4a1 1 0 0 1-1.447.894L12 19.618 9.447 21.894A1 1 0 0 1 8 21v-4H7a3 3 0 0 1-3-3v-2a7.002 7.002 0 0 1 7-7V3a1 1 0 0 1 1-1z" />
        </svg>
        <span class="text-xs text-[#FE5428]">Jury</span>
      {:else}
        <svg class="h-6 w-6 text-zinc-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a1 1 0 0 1 1 1v1.07A7.002 7.002 0 0 1 20 11v2a3 3 0 0 1-3 3h-1v4a1 1 0 0 1-1.447.894L12 19.618 9.447 21.894A1 1 0 0 1 8 21v-4H7a3 3 0 0 1-3-3v-2a7.002 7.002 0 0 1 7-7V3a1 1 0 0 1 1-1z" />
        </svg>
        <span class="text-xs text-zinc-400">Jury</span>
      {/if}
    </button>
  </div>
</nav>

<style>
  /* Ensure the nav doesn't cover important content on pages with bottom padding */
  :global(body) {
    padding-bottom: 80px;
  }
</style>
