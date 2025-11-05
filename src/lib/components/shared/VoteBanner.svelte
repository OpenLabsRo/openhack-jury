<script lang="ts">
  import { link } from 'svelte5-router'
  import {
    votingRune,
    votingLoading,
    fetchVotingData,
  } from '$runes/votingRune.js'
  import { flagsRune } from '$runes/flagsRune.js'
  import { onMount } from 'svelte'

  let error: string | null = null

  $: votingEnabled = Boolean($flagsRune?.flags?.voting)
  $: hasVoted = Boolean($votingRune?.hasVoted)

  $: variantClasses = hasVoted
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
    : 'border-yellow-600/30 bg-yellow-600/5 text-amber-200'
  $: linkClasses = hasVoted
    ? 'text-emerald-100 underline underline-offset-4 hover:text-emerald-50'
    : 'text-amber-100 underline underline-offset-4 hover:text-amber-50'

  onMount(async () => {
    try {
      // Check if voting data already exists in the rune
      if (!$votingRune) {
        // Data doesn't exist, fetch it
        await fetchVotingData()
      }
    } catch (err) {
      console.error('Failed to fetch voting data:', err)
      error = 'Failed to load voting status'
    }
  })
</script>

{#if votingEnabled}
  <div
    class={`w-full rounded-2xl border px-4 py-3 text-sm md:text-base ${variantClasses}`}
    role="status"
  >
    {#if hasVoted}
      <p class="text-center md:text-left">
        Thank you for voting! Feel free to revisit the finalists on the
        <a class={linkClasses} href="/vote" use:link>vote page</a>.
      </p>
    {:else if $votingLoading}
      <p class="text-center md:text-left">Loading voting status...</p>
    {:else if error}
      <p class="text-center md:text-left text-red-400">{error}</p>
    {:else}
      <div
        class="flex flex-col items-center gap-3 text-center md:flex-row md:items-center md:justify-between md:text-left"
      >
        <p>
          Public voting is live—cast your vote for the grand prize finalists.
        </p>
        <a class={`font-semibold ${linkClasses}`} href="/vote" use:link>
          Vote now →
        </a>
      </div>
    {/if}
  </div>
{/if}
