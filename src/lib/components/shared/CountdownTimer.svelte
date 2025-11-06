<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  export let nextTeamTime: string | null = null
  export let isVisible: boolean = true

  let timeRemaining = '00:00'
  let intervalHandle: number | null = null

  function calculateTimeRemaining() {
    if (!nextTeamTime) {
      timeRemaining = '00:00'
      return
    }

    try {
      const now = new Date().getTime()
      const targetTime = new Date(nextTeamTime).getTime()
      const diff = Math.max(0, targetTime - now)

      const totalSeconds = Math.floor(diff / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60

      timeRemaining = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    } catch (err) {
      console.error('Error calculating time remaining:', err)
      timeRemaining = '00:00'
    }
  }

  function startTimer() {
    calculateTimeRemaining()
    intervalHandle = setInterval(calculateTimeRemaining, 1000) as unknown as number
  }

  onMount(() => {
    if (isVisible && nextTeamTime) {
      startTimer()
    }
  })

  onDestroy(() => {
    if (intervalHandle !== null) {
      clearInterval(intervalHandle)
    }
  })

  $: if (nextTeamTime) {
    calculateTimeRemaining()
  }

  $: if (isVisible && intervalHandle === null && nextTeamTime) {
    startTimer()
  }

  $: if (!isVisible && intervalHandle !== null) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
</script>

{#if isVisible && nextTeamTime}
  <div class="flex items-center justify-center gap-2 py-4 px-4 rounded-lg bg-[#0B0B0B] border border-[#2E2E2E]">
    <svg class="h-5 w-5 text-[#FE5428]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
    <span class="text-white font-mono text-lg">{timeRemaining}</span>
  </div>
{/if}
