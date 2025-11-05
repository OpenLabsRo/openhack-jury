<script lang="ts">
  import { onMount } from 'svelte'
  import { navigate } from 'svelte5-router'
  import TopBar from '$lib/components/mobile/TopBar.svelte'
  import { Button } from '$lib/components/ui/button'
  import { flagsRune } from '$runes/flagsRune'
  import { judgeDataRune, currentTeamRune, previousTeamRune, inFlightLoading, startJudging, recordJudgment, detectJudgingFinished, startFlagsPolling, stopFlagsPolling } from '$runes/judgingRune'
  import { errorMessage } from '$runes/errorRune'
  import type { Team } from '$types/judge'

  let selectedWinner: string | null = null
  let isJudgingFinished = false

  onMount(() => {
    // Start polling for flags every 500ms
    startFlagsPolling(500)

    return () => {
      // Stop polling when component is destroyed
      stopFlagsPolling()
    }
  })

  $: judgingEnabled = Boolean($flagsRune?.flags?.judging)
  $: judgeData = $judgeDataRune
  $: currentTeam = $currentTeamRune
  $: previousTeam = $previousTeamRune
  $: currentTeamIndex = judgeData?.currentTeam ?? -1
  $: isAwaitingStart = currentTeamIndex === -1
  $: isFirstTeam = currentTeamIndex === 0
  $: isComparing = previousTeam !== null && currentTeam !== null

  async function handleStartJudging() {
    try {
      await startJudging()
    } catch (error) {
      if (detectJudgingFinished(error)) {
        isJudgingFinished = true
      }
    }
  }

  async function handleSelectWinner(teamId: string) {
    selectedWinner = teamId
  }

  async function handleSubmitJudgment() {
    if (!selectedWinner || !previousTeam || !currentTeam) return

    const loser = selectedWinner === previousTeam.id ? currentTeam.id : previousTeam.id

    try {
      await recordJudgment(selectedWinner, loser)
      selectedWinner = null
    } catch (error) {
      if (detectJudgingFinished(error)) {
        isJudgingFinished = true
      }
    }
  }
</script>

<div class="min-h-screen bg-black flex flex-col">
  <TopBar />

  <div class="flex-1 overflow-y-auto px-4 py-6">
    {#if !judgingEnabled}
      <!-- Waiting state: judging flag is off -->
      <div class="max-w-sm mx-auto text-center space-y-4 mt-12">
        <h1 class="text-2xl font-bold text-white">Judging Not Started</h1>
        <p class="text-gray-400">Please wait for the organizers to enable judging.</p>
        <div class="w-12 h-12 border-4 border-[#FE5428] border-t-transparent rounded-full animate-spin mx-auto mt-8"></div>
      </div>
    {:else if isJudgingFinished}
      <!-- Completion state: judging is finished -->
      <div class="max-w-sm mx-auto text-center space-y-4 mt-12">
        <h1 class="text-3xl font-bold text-white">Judging Complete!</h1>
        <p class="text-gray-400">Thank you for judging all the teams. The rankings are being computed.</p>
        <Button
          on:click={() => navigate('/')}
          class="mt-8 bg-[#FE5428] hover:bg-[#e64520] text-white"
        >
          Return Home
        </Button>
      </div>
    {:else if $inFlightLoading && isAwaitingStart}
      <!-- Loading state while starting -->
      <div class="max-w-sm mx-auto text-center space-y-4 mt-12">
        <p class="text-white">Loading first team...</p>
        <div class="w-12 h-12 border-4 border-[#FE5428] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    {:else if isAwaitingStart}
      <!-- Waiting to start judging -->
      <div class="max-w-sm mx-auto text-center space-y-4 mt-12">
        <h1 class="text-2xl font-bold text-white">Ready to Judge?</h1>
        <p class="text-gray-400">Press the button below to see the first team and begin judging.</p>
        <Button
          on:click={handleStartJudging}
          disabled={$inFlightLoading}
          class="w-full mt-8 bg-[#FE5428] hover:bg-[#e64520] text-white text-lg py-6"
        >
          {$inFlightLoading ? 'Loading...' : 'Start Judging'}
        </Button>
      </div>
    {:else if isFirstTeam && currentTeam}
      <!-- First team: show details and next button -->
      <div class="max-w-md mx-auto space-y-4">
        <h2 class="text-xl font-bold text-white">First Team</h2>
        <div class="flex flex-col gap-3 p-4 rounded-lg border border-[#2E2E2E] bg-[#101010]">
          <div>
            <h3 class="text-white font-semibold">{currentTeam.name}</h3>
            {#if currentTeam.table}
              <p class="text-xs text-gray-400">Table {currentTeam.table}</p>
            {/if}
          </div>
          <div class="space-y-2 text-sm">
            {#if currentTeam.submission?.name}
              <div>
                <p class="text-gray-400">Submission</p>
                <p class="text-white font-medium">{currentTeam.submission.name}</p>
              </div>
            {/if}
            {#if currentTeam.submission?.desc}
              <div>
                <p class="text-gray-400">Description</p>
                <p class="text-white text-xs">{currentTeam.submission.desc}</p>
              </div>
            {/if}
            {#if currentTeam.submission?.repo}
              <div>
                <p class="text-gray-400">Repository</p>
                <a href={currentTeam.submission.repo} target="_blank" rel="noopener noreferrer" class="text-[#FE5428] text-xs hover:underline break-all">
                  {currentTeam.submission.repo}
                </a>
              </div>
            {/if}
          </div>
        </div>
        <Button
          on:click={handleStartJudging}
          disabled={$inFlightLoading}
          class="w-full bg-[#FE5428] hover:bg-[#e64520] text-white"
        >
          {$inFlightLoading ? 'Loading...' : 'Next Team'}
        </Button>
      </div>
    {:else if isComparing && previousTeam && currentTeam}
      <!-- Comparison view: choose winner -->
      <div class="max-w-2xl mx-auto space-y-6">
        <h2 class="text-xl font-bold text-white">Choose the Better Team</h2>

        <div class="grid gap-4">
          <!-- Previous Team Card -->
          <div
            class={`flex flex-col gap-3 p-4 rounded-lg border ${
              selectedWinner === previousTeam.id
                ? 'border-[#FE5428] bg-[#1a1a1a]'
                : 'border-[#2E2E2E] bg-[#101010]'
            }`}
          >
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-white font-semibold">{previousTeam.name}</h3>
                {#if previousTeam.table}
                  <p class="text-xs text-gray-400">Table {previousTeam.table}</p>
                {/if}
              </div>
              <button
                on:click={() => handleSelectWinner(previousTeam.id)}
                class={`px-3 py-1 rounded text-sm font-medium transition ${
                  selectedWinner === previousTeam.id
                    ? 'bg-[#FE5428] text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {selectedWinner === previousTeam.id ? '✓ Winner' : 'Choose'}
              </button>
            </div>
            <div class="space-y-2 text-sm">
              {#if previousTeam.submission?.name}
                <div>
                  <p class="text-gray-400">Submission</p>
                  <p class="text-white font-medium">{previousTeam.submission.name}</p>
                </div>
              {/if}
              {#if previousTeam.submission?.desc}
                <div>
                  <p class="text-gray-400">Description</p>
                  <p class="text-white text-xs">{previousTeam.submission.desc}</p>
                </div>
              {/if}
              {#if previousTeam.submission?.repo}
                <div>
                  <p class="text-gray-400">Repository</p>
                  <a href={previousTeam.submission.repo} target="_blank" rel="noopener noreferrer" class="text-[#FE5428] text-xs hover:underline break-all">
                    {previousTeam.submission.repo}
                  </a>
                </div>
              {/if}
            </div>
          </div>

          <!-- Current Team Card -->
          <div
            class={`flex flex-col gap-3 p-4 rounded-lg border ${
              selectedWinner === currentTeam.id
                ? 'border-[#FE5428] bg-[#1a1a1a]'
                : 'border-[#2E2E2E] bg-[#101010]'
            }`}
          >
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-white font-semibold">{currentTeam.name}</h3>
                {#if currentTeam.table}
                  <p class="text-xs text-gray-400">Table {currentTeam.table}</p>
                {/if}
              </div>
              <button
                on:click={() => handleSelectWinner(currentTeam.id)}
                class={`px-3 py-1 rounded text-sm font-medium transition ${
                  selectedWinner === currentTeam.id
                    ? 'bg-[#FE5428] text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {selectedWinner === currentTeam.id ? '✓ Winner' : 'Choose'}
              </button>
            </div>
            <div class="space-y-2 text-sm">
              {#if currentTeam.submission?.name}
                <div>
                  <p class="text-gray-400">Submission</p>
                  <p class="text-white font-medium">{currentTeam.submission.name}</p>
                </div>
              {/if}
              {#if currentTeam.submission?.desc}
                <div>
                  <p class="text-gray-400">Description</p>
                  <p class="text-white text-xs">{currentTeam.submission.desc}</p>
                </div>
              {/if}
              {#if currentTeam.submission?.repo}
                <div>
                  <p class="text-gray-400">Repository</p>
                  <a href={currentTeam.submission.repo} target="_blank" rel="noopener noreferrer" class="text-[#FE5428] text-xs hover:underline break-all">
                    {currentTeam.submission.repo}
                  </a>
                </div>
              {/if}
            </div>
          </div>
        </div>

        {#if $errorMessage}
          <div class="p-3 rounded bg-red-900/20 border border-red-700 text-red-300 text-sm">
            {$errorMessage}
          </div>
        {/if}

        <Button
          on:click={handleSubmitJudgment}
          disabled={!selectedWinner || $inFlightLoading}
          class="w-full bg-[#FE5428] hover:bg-[#e64520] text-white py-6"
        >
          {$inFlightLoading ? 'Submitting...' : 'Submit & Next Team'}
        </Button>
      </div>
    {/if}
  </div>
</div>
