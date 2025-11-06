<script lang="ts">
  import { navigate } from 'svelte5-router'

  function handleLogoClick() {
    navigate('/')
  }
</script>

<div class="flex items-center justify-center bg-black px-6 py-4">
  <button
    type="button"
    class="rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    onclick={handleLogoClick}
    aria-label="Go to home page"
  >
    <img src="/icons/logo-full.svg" alt="OpenHack" class="h-8 w-auto" />
  </button>
</div>
