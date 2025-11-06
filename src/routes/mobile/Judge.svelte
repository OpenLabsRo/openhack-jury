<script lang="ts">
  import { onMount } from 'svelte'
  import { navigate } from 'svelte5-router'
  import TopBar from '$lib/components/mobile/TopBar.svelte'
  import CountdownTimer from '$lib/components/shared/CountdownTimer.svelte'
  import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte'
  import LoadingOverlay from '$lib/components/shared/LoadingOverlay.svelte'
  import { Button } from '$lib/components/ui/button'
  import { flagsRune } from '$runes/flagsRune'
  import {
    judgeDataRune,
    currentTeamRune,
    previousTeamRune,
    selectedWinnerRune,
    isJudgingFinishedRune,
    inFlightLoading,
    startJudging,
    recordJudgment,
    detectJudgingFinished,
    startFlagsPolling,
    stopFlagsPolling,
  } from '$runes/judgingRune'
  import { errorMessage, clearError } from '$runes/errorRune'
  import type { Team } from '$types/judge'

  let showConfirmDialog = false
  let pendingWinnerSelection: string | null = null
  let isConfirmingSelection = false

  onMount(() => {
    // Start polling for flags every 500ms
    startFlagsPolling(10000)

    return () => {
      // Stop polling when component is destroyed
      stopFlagsPolling()
    }
  })

  $: judgingEnabled = Boolean($flagsRune?.flags?.judging)
  $: isAwaitingStart = $judgeDataRune?.currentTeam === -1
  $: isFirstTeam = $judgeDataRune?.currentTeam === 0
  $: isComparing =
    ($judgeDataRune?.currentTeam ?? -1) > 0 && $currentTeamRune !== null

  $: timerVisible = $judgeDataRune?.currentTeam !== -1

  function getCardClass(isSelected: boolean = false): string {
    const base =
      'relative flex cursor-pointer flex-col gap-5 rounded-2xl border bg-[#101010] p-8 text-left transition duration-200'
    return isSelected
      ? `${base} border-[#FE5428] shadow-[0_18px_45px_-20px_rgba(254,84,40,0.85)]`
      : `${base} border-[#2E2E2E] hover:border-[#3E3E3E]`
  }

  async function handleStartJudging() {
    try {
      await startJudging()
    } catch (error) {
      if (detectJudgingFinished(error)) {
        isJudgingFinishedRune.set(true)
        clearError()
      }
    }
  }

  function handleSelectWinnerClick(teamId: string) {
    pendingWinnerSelection = teamId
    showConfirmDialog = true
  }

  async function handleConfirmSelection() {
    if (!pendingWinnerSelection || !$currentTeamRune) return

    // Determine if winner is 'current' or 'previous'
    const winnerType =
      pendingWinnerSelection === $currentTeamRune.id ? 'current' : 'previous'
    const loserType = winnerType === 'current' ? 'previous' : 'current'

    // Close modal immediately
    showConfirmDialog = false
    pendingWinnerSelection = null

    try {
      await recordJudgment(winnerType, loserType)
      selectedWinnerRune.set(null)
    } catch (error) {
      if (detectJudgingFinished(error)) {
        isJudgingFinishedRune.set(true)
        clearError()
      }
    }
  }

  function handleCancelSelection() {
    pendingWinnerSelection = null
    showConfirmDialog = false
  }

  $: confirmDialogTitle =
    pendingWinnerSelection === 'previous'
      ? 'Select Previous Team?'
      : 'Select Current Team?'

  $: confirmDialogDescription =
    pendingWinnerSelection === 'previous'
      ? 'You are choosing the previous team as the winner.'
      : `You are choosing ${$currentTeamRune?.name || 'Current Team'} as the winner.`
</script>

<LoadingOverlay isVisible={$inFlightLoading} />

<div class="min-h-screen bg-black flex flex-col">
  <TopBar />

  <main
    class="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center"
    style="padding-top: 10vh;"
  >
    {#if judgingEnabled && !isAwaitingStart && !$isJudgingFinishedRune}
      <div class="mb-6">
        <CountdownTimer
          nextTeamTime={$judgeDataRune?.nextTeamTime}
          isVisible={timerVisible}
        />
      </div>
    {/if}

    {#if !judgingEnabled}
      <!-- Waiting state: judging flag is off -->
      <div class="max-w-md mx-auto text-center space-y-4 mt-12">
        <h1 class="text-2xl font-bold text-white">Judging Not Started</h1>
        <p class="text-gray-400">
          Please wait for the organizers to enable judging.
        </p>
      </div>
    {:else if $isJudgingFinishedRune}
      <!-- Completion state: judging is finished -->
      <div class="max-w-lg mx-auto text-center space-y-4 mt-24">
        <h1 class="text-3xl font-bold text-white">Judging Complete!</h1>
        <p class="text-gray-400">
          Thank you for judging all the teams. The rankings are being computed.
        </p>
      </div>
    {:else if isAwaitingStart}
      <!-- Waiting to start judging -->
      <div class="max-w-md mx-auto text-center space-y-4 mt-12">
        <h1 class="text-2xl font-bold text-white">Ready to Judge?</h1>
        <p class="text-gray-400">
          Press the button below to see the first team and begin judging.
        </p>
        <Button
          on:click={handleStartJudging}
          disabled={$inFlightLoading}
          class="w-full mt-8 bg-[#FE5428] hover:bg-[#e64520] text-white py-3 text-base rounded-xl"
        >
          {$inFlightLoading ? 'Loading...' : 'Start Judging'}
        </Button>
      </div>
    {:else if !isAwaitingStart && !$currentTeamRune}
      <!-- Resting state: judge has no current team assigned -->
      <div class="max-w-md mx-auto text-center space-y-4 mt-12">
        <h1 class="text-2xl font-bold text-white">Resting</h1>
        <p class="text-gray-400">
          You're currently between matches. Please wait — the system will assign
          the next team when ready.
        </p>
      </div>
    {:else if isFirstTeam && $currentTeamRune}
      <!-- First team: show details and next button -->
      <div class="w-full space-y-4">
        <h2 class="text-xl font-bold text-white text-center">
          Go to Table {$currentTeamRune.table || 'N/A'}
        </h2>
        <div class={getCardClass(false)}>
          <div>
            <h3 class="text-white font-semibold text-lg">
              {$currentTeamRune.name}
            </h3>
            {#if $currentTeamRune.table}
              <p class="text-xs text-gray-500 mt-1">
                Table {$currentTeamRune.table}
              </p>
            {/if}
          </div>
          <div class="space-y-4 text-sm">
            {#if $currentTeamRune.submission?.name}
              <div>
                <p class="text-gray-400 font-medium">Submission</p>
                <p class="text-white mt-1">
                  {$currentTeamRune.submission.name}
                </p>
              </div>
            {/if}
            {#if $currentTeamRune.submission?.desc}
              <div>
                <p class="text-gray-400 font-medium">Description</p>
                <p class="text-white text-xs mt-1">
                  {$currentTeamRune.submission.desc}
                </p>
              </div>
            {/if}
            {#if $currentTeamRune.submission?.repo}
              <div>
                <p class="text-gray-400 font-medium">Repository</p>
                <a
                  href={$currentTeamRune.submission.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-white text-xs hover:underline break-all inline-flex items-center gap-2 mt-1"
                >
                  <svg
                    class="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    ><path
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                    /></svg
                  >
                  Open on GitHub
                </a>
              </div>
            {/if}
          </div>
        </div>
        <Button
          on:click={handleStartJudging}
          disabled={$inFlightLoading}
          class="w-full bg-[#FE5428] hover:bg-[#e64520] text-white py-4 text-base rounded-xl font-semibold"
        >
          {$inFlightLoading ? 'Loading...' : 'Next Team'}
        </Button>
      </div>
    {:else if isComparing && $currentTeamRune}
      <!-- Comparison view: show current team with two choice buttons -->
      <div class="w-full space-y-5">
        <h2 class="text-xl font-bold text-white text-center">
          Go to Table {$currentTeamRune.table || 'N/A'}
        </h2>

        <div class={getCardClass(false)}>
          <div>
            <h3 class="text-white text-lg font-semibold">
              {$currentTeamRune.name}
            </h3>
            {#if $currentTeamRune.table}
              <p class="text-gray-500 mt-1 text-sm">
                Table {$currentTeamRune.table}
              </p>
            {/if}
          </div>
          <div class="space-y-4 text-sm">
            {#if $currentTeamRune.submission?.name}
              <div>
                <p class="text-gray-400 font-medium">Submission</p>
                <p class="text-white mt-1">
                  {$currentTeamRune.submission.name}
                </p>
              </div>
            {/if}
            {#if $currentTeamRune.submission?.desc}
              <div>
                <p class="text-gray-400 font-medium">Description</p>
                <p class="text-white text-sm mt-1">
                  {$currentTeamRune.submission.desc}
                </p>
              </div>
            {/if}
            {#if $currentTeamRune.submission?.repo}
              <div>
                <p class="text-gray-400 font-medium">Repository</p>
                <a
                  href={$currentTeamRune.submission.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-white text-xs hover:underline break-all inline-flex items-center gap-2 mt-1"
                >
                  <svg
                    class="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    ><path
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                    /></svg
                  >
                  Open on GitHub
                </a>
              </div>
            {/if}
          </div>
        </div>

        {#if $errorMessage}
          <div
            class="p-4 rounded-lg border border-red-500 bg-red-500/10 text-red-300"
          >
            {$errorMessage}
          </div>
        {/if}

        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            on:click={() => handleSelectWinnerClick('previous')}
            class="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-white bg-white p-3 text-center transition duration-200 hover:bg-white/95 active:opacity-80"
            aria-label="Select previous team as winner"
          >
            <span class="font-semibold text-black text-sm">Previous Team</span>
          </button>
          <button
            type="button"
            on:click={() => handleSelectWinnerClick($currentTeamRune.id)}
            class="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-[#FE5428] bg-[#FE5428] p-3 text-center transition duration-200 hover:bg-[#e64520] hover:border-[#e64520] active:opacity-80 shadow-[0_18px_45px_-20px_rgba(254,84,40,0.85)]"
            aria-label="Select current team as winner"
          >
            <span class="font-semibold text-white text-sm">Current Team</span>
          </button>
        </div>
      </div>
    {/if}
  </main>
</div>

<ConfirmDialog
  bind:isOpen={showConfirmDialog}
  title={confirmDialogTitle}
  description={confirmDialogDescription}
  confirmText="Confirm"
  cancelText="Cancel"
  isDangerous={false}
  isLoading={false}
  onConfirm={handleConfirmSelection}
  onCancel={handleCancelSelection}
/>
