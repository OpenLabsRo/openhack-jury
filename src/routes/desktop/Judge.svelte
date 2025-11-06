<script lang="ts">
  import { onMount } from 'svelte'
  import { navigate } from 'svelte5-router'
  import Navbar from '$lib/components/desktop/Navbar.svelte'
  import CountdownTimer from '$lib/components/shared/CountdownTimer.svelte'
  import { Button } from '$lib/components/ui/button'
  import { flagsRune } from '$runes/flagsRune'
  import {
    judgeDataRune,
    currentTeamRune,
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

  async function handleSelectWinner(teamId: string) {
    selectedWinnerRune.set(teamId)
  }

  async function handleSubmitJudgment() {
    if (!$selectedWinnerRune || !$currentTeamRune) return

    const loser =
      $selectedWinnerRune === $currentTeamRune.id
        ? 'previous'
        : $currentTeamRune.id

    try {
      await recordJudgment($selectedWinnerRune, loser)
      selectedWinnerRune.set(null)
    } catch (error) {
      if (detectJudgingFinished(error)) {
        isJudgingFinishedRune.set(true)
        clearError()
      }
    }
  }
</script>

<div class="min-h-screen bg-black flex flex-col">
  <Navbar />

  <div class="flex-1 overflow-y-auto px-8 py-8">
    {#if judgingEnabled && !isAwaitingStart}
      <div class="max-w-4xl mx-auto mb-6">
        <CountdownTimer
          nextTeamTime={$judgeDataRune?.nextTeamTime}
          isVisible={timerVisible}
        />
      </div>
    {/if}

    {#if !judgingEnabled}
      <!-- Waiting state: judging flag is off -->
      <div class="max-w-md mx-auto text-center space-y-4 mt-24">
        <h1 class="text-3xl font-bold text-white">Judging Not Started</h1>
        <p class="text-gray-400">
          Please wait for the organizers to enable judging.
        </p>
        <div
          class="w-12 h-12 border-4 border-[#FE5428] border-t-transparent rounded-full animate-spin mx-auto mt-12"
        ></div>
      </div>
    {:else if $isJudgingFinishedRune}
      <!-- Completion state: judging is finished -->
      <div class="max-w-md mx-auto text-center space-y-4 mt-24">
        <h1 class="text-4xl font-bold text-white">Judging Complete!</h1>
        <p class="text-gray-400">
          Thank you for judging all the teams. The rankings are being computed.
        </p>
        <Button
          on:click={() => navigate('/')}
          class="mt-12 bg-[#FE5428] hover:bg-[#e64520] text-white px-8 py-6 text-lg"
        >
          Return Home
        </Button>
      </div>
    {:else if $inFlightLoading && isAwaitingStart}
      <!-- Loading state while starting -->
      <div class="max-w-md mx-auto text-center space-y-4 mt-24">
        <p class="text-white text-lg">Loading first team...</p>
        <div
          class="w-12 h-12 border-4 border-[#FE5428] border-t-transparent rounded-full animate-spin mx-auto"
        ></div>
      </div>
    {:else if isAwaitingStart}
      <!-- Waiting to start judging -->
      <div class="max-w-md mx-auto text-center space-y-4 mt-24">
        <h1 class="text-3xl font-bold text-white">Ready to Judge?</h1>
        <p class="text-gray-400">
          Press the button below to see the first team and begin judging.
        </p>
        <Button
          on:click={handleStartJudging}
          disabled={$inFlightLoading}
          class="w-full mt-12 bg-[#FE5428] hover:bg-[#e64520] text-white px-8 py-6 text-lg"
        >
          {$inFlightLoading ? 'Loading...' : 'Start Judging'}
        </Button>
      </div>
    {:else if !isAwaitingStart && !$currentTeamRune}
      <!-- Resting state: judge has no current team assigned -->
      <div class="max-w-md mx-auto text-center space-y-4 mt-24">
        <h1 class="text-3xl font-bold text-white">Resting</h1>
        <p class="text-gray-400">
          You're currently between matches. Please wait — the system will assign
          the next team when ready.
        </p>
        <div
          class="w-12 h-12 border-4 border-[#FE5428] border-t-transparent rounded-full animate-spin mx-auto mt-6"
        ></div>
      </div>
    {:else if isFirstTeam && $currentTeamRune}
      <!-- First team: show details and next button -->
      <div class="max-w-2xl mx-auto space-y-6">
        <h2 class="text-2xl font-bold text-white">First Team</h2>
        <div
          class="flex flex-col gap-4 p-6 rounded-lg border border-[#2E2E2E] bg-[#101010]"
        >
          <div>
            <h3 class="text-white text-2xl font-semibold">
              {$currentTeamRune.name}
            </h3>
            {#if $currentTeamRune.table}
              <p class="text-gray-400 mt-1">Table {$currentTeamRune.table}</p>
            {/if}
          </div>
          <div class="space-y-4 text-base">
            {#if $currentTeamRune.submission?.name}
              <div>
                <p class="text-gray-400 font-medium">Submission</p>
                <p class="text-white">{$currentTeamRune.submission.name}</p>
              </div>
            {/if}
            {#if $currentTeamRune.submission?.desc}
              <div>
                <p class="text-gray-400 font-medium">Description</p>
                <p class="text-white">{$currentTeamRune.submission.desc}</p>
              </div>
            {/if}
            {#if $currentTeamRune.submission?.repo}
              <div>
                <p class="text-gray-400 font-medium">Repository</p>
                <a
                  href={$currentTeamRune.submission.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[#FE5428] hover:underline break-all"
                >
                  {$currentTeamRune.submission.repo}
                </a>
              </div>
            {/if}
          </div>
        </div>
        <Button
          on:click={handleStartJudging}
          disabled={$inFlightLoading}
          class="w-full bg-[#FE5428] hover:bg-[#e64520] text-white px-8 py-6 text-lg"
        >
          {$inFlightLoading ? 'Loading...' : 'Next Team'}
        </Button>
      </div>
    {:else if isComparing && $currentTeamRune}
      <!-- Comparison view: show current team with two choice buttons -->
      <div class="max-w-2xl mx-auto space-y-6">
        <h2 class="text-2xl font-bold text-white">Choose the Better Team</h2>

        <div
          class="flex flex-col gap-4 p-6 rounded-lg border border-[#2E2E2E] bg-[#101010]"
        >
          <div>
            <h3 class="text-white text-2xl font-semibold">
              {$currentTeamRune.name}
            </h3>
            {#if $currentTeamRune.table}
              <p class="text-gray-400 mt-1">Table {$currentTeamRune.table}</p>
            {/if}
          </div>
          <div class="space-y-4 text-base">
            {#if $currentTeamRune.submission?.name}
              <div>
                <p class="text-gray-400 font-medium">Submission</p>
                <p class="text-white">{$currentTeamRune.submission.name}</p>
              </div>
            {/if}
            {#if $currentTeamRune.submission?.desc}
              <div>
                <p class="text-gray-400 font-medium">Description</p>
                <p class="text-white">{$currentTeamRune.submission.desc}</p>
              </div>
            {/if}
            {#if $currentTeamRune.submission?.repo}
              <div>
                <p class="text-gray-400 font-medium">Repository</p>
                <a
                  href={$currentTeamRune.submission.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[#FE5428] hover:underline break-all"
                >
                  {$currentTeamRune.submission.repo}
                </a>
              </div>
            {/if}
          </div>
        </div>

        {#if $errorMessage}
          <div
            class="p-4 rounded border border-red-700 bg-red-900/20 text-red-300"
          >
            {$errorMessage}
          </div>
        {/if}

        <div class="grid grid-cols-2 gap-4">
          <Button
            on:click={() => handleSelectWinner('previous')}
            class={`${
              $selectedWinnerRune === 'previous'
                ? 'bg-[#FE5428] hover:bg-[#e64520]'
                : 'bg-gray-700 hover:bg-gray-600'
            } text-white px-8 py-6 text-lg`}
          >
            Previous Team
          </Button>
          <Button
            on:click={() => handleSelectWinner($currentTeamRune.id)}
            class={`${
              $selectedWinnerRune === $currentTeamRune.id
                ? 'bg-[#FE5428] hover:bg-[#e64520]'
                : 'bg-gray-700 hover:bg-gray-600'
            } text-white px-8 py-6 text-lg`}
          >
            Current Team
          </Button>
        </div>

        <Button
          on:click={handleSubmitJudgment}
          disabled={!$selectedWinnerRune || $inFlightLoading}
          class="w-full bg-[#FE5428] hover:bg-[#e64520] text-white px-8 py-6 text-lg"
        >
          {$inFlightLoading ? 'Submitting...' : 'Submit & Next Team'}
        </Button>
      </div>
    {/if}
  </div>
</div>
