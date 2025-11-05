<script lang="ts">
  import { onMount } from 'svelte'
  import Navbar from '$lib/components/desktop/Navbar.svelte'
  import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte'
  import { Github } from '@lucide/svelte'
  import { flagsRune } from '$runes/flagsRune.js'
  import {
    votingRune,
    votingLoading,
    fetchVotingData,
    castVote,
  } from '$runes/votingRune.js'
  import type { Team } from '$types/account'

  let selectedId: string = ''
  let error: string | null = null
  let submitError: string | null = null
  let submitSuccess = false
  let showConfirmDialog = false
  let isConfirmingVote = false

  // Derive selectedId based on voting status
  $: {
    if (hasVoted) {
      selectedId = '' // Clear selection when user has voted
    }
  }

  $: votingEnabled = Boolean($flagsRune?.flags?.voting)
  $: hasVoted = Boolean($votingRune?.hasVoted)
  $: votingOpen = Boolean($votingRune?.votingOpen)
  $: finalists = $votingRune?.finalists || []
  $: selectedFinalist = finalists.find((f) => f.id === selectedId)
  $: confirmDialogDescription = selectedFinalist
    ? `You are voting for ${selectedFinalist.name}. Their submission is "${selectedFinalist.submission?.name || 'Unnamed'}".`
    : 'Please select a finalist to vote for.'

  $: getCardClass = (id: string) => {
    const isSelected = selectedId === id
    const base =
      'flex h-full cursor-pointer flex-col justify-between rounded-2xl border bg-[#101010] p-6 text-left transition duration-200 md:p-7'
    return isSelected
      ? `${base} border-[#FE5428] shadow-[0_18px_45px_-20px_rgba(254,84,40,0.85)]`
      : `${base} border-[#2E2E2E] hover:border-[#3E3E3E]`
  }

  $: getRadioRingClass = (id: string) => {
    const isSelected = selectedId === id
    const base =
      'grid h-6 w-6 place-items-center rounded-full border text-transparent'
    return isSelected ? `${base} border-[#FE5428]` : `${base} border-[#434343]`
  }

  $: getRadioDotClass = (id: string) => {
    const isSelected = selectedId === id
    const base = 'h-3 w-3 rounded-full'
    return isSelected ? `${base} bg-[#FE5428]` : `${base} bg-transparent`
  }

  function handleGithubClick(e: Event, url?: string) {
    e.preventDefault()
    e.stopPropagation()
    if (url && url !== '#') {
      window.open(url, '_blank')
    }
  }

  function openConfirmDialog() {
    showConfirmDialog = true
  }

  function closeConfirmDialog() {
    showConfirmDialog = false
  }

  function handleFinalistPointer(
    event: MouseEvent | TouchEvent,
    finalistId: string
  ) {
    if (hasVoted) {
      return
    }

    event.preventDefault()
    selectedId = finalistId

    const input = document.getElementById(
      `finalist-${finalistId}`
    ) as HTMLInputElement | null

    if (input) {
      input.checked = true
      input.dispatchEvent(new Event('change', { bubbles: true }))

      try {
        input.focus({ preventScroll: true })
      } catch {
        // Older browsers may throw if preventScroll is unsupported.
      }
    }
  }

  async function confirmCastVote() {
    if (!selectedId) return

    isConfirmingVote = true
    submitError = null
    submitSuccess = false

    try {
      await castVote(selectedId)
      submitSuccess = true
      closeConfirmDialog()
    } catch (err) {
      console.error('Failed to cast vote:', err)
      submitError =
        err instanceof Error
          ? err.message
          : 'Failed to submit your vote. Please try again.'
    } finally {
      isConfirmingVote = false
    }
  }

  onMount(async () => {
    try {
      // Check if voting data already exists in the rune
      if (!$votingRune) {
        // Data doesn't exist, fetch it
        await fetchVotingData()
      }

      // Set initial selection if user hasn't voted yet
      if (finalists.length > 0 && !hasVoted) {
        selectedId = finalists[0].id
      } else if (hasVoted) {
        selectedId = ''
      }
    } catch (err) {
      console.error('Failed to fetch voting data:', err)
      error = 'Failed to load finalists'
    }
  })
</script>

<main class="min-h-screen bg-black text-white">
  <Navbar />

  <section
    class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-12 lg:px-10"
  >
    <header class="space-y-3">
      <h1 class="text-3xl font-semibold text-white md:text-4xl">
        Vote the finalist
      </h1>
      <p class="max-w-2xl text-base text-zinc-400 md:text-lg">
        Vote for your favorite team to win the grand prize
      </p>
    </header>

    {#if $votingLoading}
      <div class="flex justify-center py-12">
        <div class="text-zinc-400">Loading finalists...</div>
      </div>
    {:else if error}
      <div
        class="rounded-lg border border-red-500 bg-red-500/10 p-4 text-red-400"
      >
        {error}
      </div>
    {:else if finalists.length === 0}
      <div
        class="rounded-lg border border-zinc-600 bg-zinc-900 p-4 text-zinc-400"
      >
        No finalists available at this time.
      </div>
    {:else}
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {#each finalists as finalist (finalist.id)}
          <input
            type="radio"
            id={`finalist-${finalist.id}`}
            name="finalist-vote"
            value={finalist.id}
            bind:group={selectedId}
            class="sr-only peer"
          />
          <label
            for={hasVoted ? '' : `finalist-${finalist.id}`}
            class={getCardClass(finalist.id)}
            onmousedown={(event) => handleFinalistPointer(event, finalist.id)}
            ontouchstart={(event) => handleFinalistPointer(event, finalist.id)}
          >
            <div class="space-y-4">
              <div class="flex items-center justify-between gap-3">
                <span
                  class="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500"
                >
                  {finalist.name}
                </span>
                <span class={getRadioRingClass(finalist.id)} aria-hidden="true">
                  <span class={getRadioDotClass(finalist.id)}></span>
                </span>
              </div>
              <h2 class="text-2xl font-semibold text-white md:text-3xl">
                {finalist.submission?.name || 'Unnamed Submission'}
              </h2>
              <p class="text-sm leading-relaxed text-zinc-400 md:text-base">
                {finalist.submission?.desc || 'No description available'}
              </p>
            </div>

            <a
              href={finalist.submission?.repo || '#'}
              target="_blank"
              rel="noopener noreferrer"
              class="mt-8 flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white md:mt-10"
              onclick={(e) => handleGithubClick(e, finalist.submission?.repo)}
            >
              <Github class="h-5 w-5 text-zinc-500" aria-hidden="true" />
              <span>
                Open project on <span class="font-semibold text-white"
                  >GitHub</span
                >
              </span>
            </a>
          </label>
        {/each}
      </div>
    {/if}

    {#if submitSuccess}
      <div
        class="rounded-lg border border-green-500 bg-green-500/10 p-4 text-green-400"
      >
        ✓ Your vote has been cast successfully!
      </div>
    {/if}

    {#if submitError}
      <div
        class="rounded-lg border border-red-500 bg-red-500/10 p-4 text-red-400"
      >
        {submitError}
      </div>
    {/if}

    <div class="pt-2">
      <button
        type="button"
        disabled={!selectedId || hasVoted || !votingEnabled}
        onclick={openConfirmDialog}
        class="w-full rounded-xl bg-[#FE5428] py-3 text-base font-semibold text-white shadow-[0_22px_48px_-20px_rgba(254,84,40,0.85)] transition hover:bg-[#fe5428]/90 focus-visible:outline focus-visible:outline-offset-4 focus-visible:outline-[#FE5428] disabled:opacity-50 disabled:cursor-not-allowed md:text-lg"
        aria-label="Cast your vote"
      >
        {#if hasVoted}
          Vote already cast
        {:else}
          Cast your vote
        {/if}
      </button>
    </div>
  </section>

  <ConfirmDialog
    bind:isOpen={showConfirmDialog}
    title="Confirm your vote"
    description={confirmDialogDescription}
    confirmText="Yes, vote for them"
    cancelText="Cancel"
    isDangerous={false}
    isLoading={isConfirmingVote}
    onConfirm={confirmCastVote}
    onCancel={closeConfirmDialog}
  />
</main>
