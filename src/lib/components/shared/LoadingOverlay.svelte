<script lang="ts">
  interface Props {
    isVisible?: boolean
  }

  let { isVisible = true }: Props = $props()

  function handleLogoClick() {
    window.location.href = '/'
  }
</script>

{#if isVisible}
  <div class="fixed inset-0 z-50 bg-black">
    <!-- Logo at top like TopBar -->
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

    <!-- Spinner centered on screen -->
    <div class="absolute inset-0 flex items-center justify-center">
      <img src="/icons/loading.gif" alt="Loading" class="w-8 h-8" />
    </div>
  </div>
{/if}
