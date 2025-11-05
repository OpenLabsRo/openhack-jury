<script lang="ts">
  import LogoLoader from '$lib/components/shared/LogoLoader.svelte'

  export let size = 28
  export let duration = 0.5
  export let label: string | null = null
</script>

<style>
  .loading-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 0.5rem;
  }

  .loading-label {
    font-size: 0.875rem;
  }
</style>

<span class="loading-indicator">
  <LogoLoader {size} {duration} />
  {#if label}
    <span class="loading-label">{label}</span>
  {/if}
</span>
