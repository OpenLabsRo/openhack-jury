<script lang="ts">
  import { onMount } from 'svelte'
  import { navigate } from 'svelte5-router'
  import Navbar from '$lib/components/desktop/Navbar.svelte'
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
  <Navbar />

  <div class="flex-1 overflow-y-auto px-8 py-8">
    {#if !judgingEnabled}
      <!-- Waiting state: judging flag is off -->
      <div class="max-w-md mx-auto text-center space-y-4 mt-24">
        <h1 class="text-3xl font-bold text-white">Judging Not Started</h1>
        <p class="text-gray-400">Please wait for the organizers to enable judging.</p>
        <div class="w-12 h-12 border-4 border-[#FE5428] border-t-transparent rounded-full animate-spin mx-auto mt-12"></div>
      </div>
    {:else if isJudgingFinished}
      <!-- Completion state: judging is finished -->
      <div class="max-w-md mx-auto text-center space-y-4 mt-24">
        <h1 class="text-4xl font-bold text-white">Judging Complete!</h1>
        <p class="text-gray-400">Thank you for judging all the teams. The rankings are being computed.</p>
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
        <div class="w-12 h-12 border-4 border-[#FE5428] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    {:else if isAwaitingStart}
      <!-- Waiting to start judging -->
      <div class="max-w-md mx-auto text-center space-y-4 mt-24">
        <h1 class="text-3xl font-bold text-white">Ready to Judge?</h1>
        <p class="text-gray-400">Press the button below to see the first team and begin judging.</p>
        <Button
          on:click={handleStartJudging}
          disabled={$inFlightLoading}
          class="w-full mt-12 bg-[#FE5428] hover:bg-[#e64520] text-white px-8 py-6 text-lg"
        >
          {$inFlightLoading ? 'Loading...' : 'Start Judging'}
        </Button>
      </div>
    {:else if isFirstTeam && currentTeam}
      <!-- First team: show details and next button -->
      <div class="max-w-2xl mx-auto space-y-6">
        <h2 class="text-2xl font-bold text-white">First Team</h2>
        <div class="flex flex-col gap-4 p-6 rounded-lg border border-[#2E2E2E] bg-[#101010]">
          <div>
            <h3 class="text-white text-2xl font-semibold">{currentTeam.name}</h3>
            {#if currentTeam.table}
              <p class="text-gray-400 mt-1">Table {currentTeam.table}</p>
            {/if}
          </div>
          <div class="space-y-4 text-base">
            {#if currentTeam.submission?.name}
              <div>
                <p class="text-gray-400 font-medium">Submission</p>
                <p class="text-white">{currentTeam.submission.name}</p>
              </div>
            {/if}
            {#if currentTeam.submission?.desc}
              <div>
                <p class="text-gray-400 font-medium">Description</p>
                <p class="text-white">{currentTeam.submission.desc}</p>
              </div>
            {/if}
            {#if currentTeam.submission?.repo}
              <div>
                <p class="text-gray-400 font-medium">Repository</p>
                <a href={currentTeam.submission.repo} target="_blank" rel="noopener noreferrer" class="text-[#FE5428] hover:underline break-all">
                  {currentTeam.submission.repo}
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
    {:else if isComparing && previousTeam && currentTeam}
      <!-- Comparison view: side-by-side team cards with winner selector -->
      <div class="max-w-6xl mx-auto space-y-8">
        <h2 class="text-2xl font-bold text-white">Choose the Better Team</h2>

        <div class="grid grid-cols-2 gap-8">
          <!-- Previous Team Card -->
          <button
            type="button"
            class={`flex flex-col gap-4 p-6 rounded-lg border cursor-pointer transition text-left ${
              selectedWinner === previousTeam.id
                ? 'border-[#FE5428] bg-[#1a1a1a] ring-2 ring-[#FE5428]'
                : 'border-[#2E2E2E] bg-[#101010] hover:border-[#3E3E3E]'
            }`}
            on:click={() => handleSelectWinner(previousTeam.id)}
          >
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-white text-xl font-semibold">{previousTeam.name}</h3>
                {#if previousTeam.table}
                  <p class="text-gray-400 text-sm mt-1">Table {previousTeam.table}</p>
                {/if}
              </div>
              {#if selectedWinner === previousTeam.id}
                <div class="bg-[#FE5428] text-white px-4 py-2 rounded font-medium">
                  ✓ Winner
                </div>
              {/if}
            </div>
            <div class="space-y-3 text-sm border-t border-[#2E2E2E] pt-4">
              {#if previousTeam.submission?.name}
                <div>
                  <p class="text-gray-400 font-medium">Submission</p>
                  <p class="text-white">{previousTeam.submission.name}</p>
                </div>
              {/if}
              {#if previousTeam.submission?.desc}
                <div>
                  <p class="text-gray-400 font-medium">Description</p>
                  <p class="text-white">{previousTeam.submission.desc}</p>
                </div>
              {/if}
              {#if previousTeam.submission?.repo}
                <div>
                  <p class="text-gray-400 font-medium">Repository</p>
                  <a href={previousTeam.submission.repo} target="_blank" rel="noopener noreferrer" class="text-[#FE5428] hover:underline break-all">
                    {previousTeam.submission.repo}
                  </a>
                </div>
              {/if}
            </div>
          </button>

          <!-- Current Team Card -->
          <button
            type="button"
            class={`flex flex-col gap-4 p-6 rounded-lg border cursor-pointer transition text-left ${
              selectedWinner === currentTeam.id
                ? 'border-[#FE5428] bg-[#1a1a1a] ring-2 ring-[#FE5428]'
                : 'border-[#2E2E2E] bg-[#101010] hover:border-[#3E3E3E]'
            }`}
            on:click={() => handleSelectWinner(currentTeam.id)}
          >
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-white text-xl font-semibold">{currentTeam.name}</h3>
                {#if currentTeam.table}
                  <p class="text-gray-400 text-sm mt-1">Table {currentTeam.table}</p>
                {/if}
              </div>
              {#if selectedWinner === currentTeam.id}
                <div class="bg-[#FE5428] text-white px-4 py-2 rounded font-medium">
                  ✓ Winner
                </div>
              {/if}
            </div>
            <div class="space-y-3 text-sm border-t border-[#2E2E2E] pt-4">
              {#if currentTeam.submission?.name}
                <div>
                  <p class="text-gray-400 font-medium">Submission</p>
                  <p class="text-white">{currentTeam.submission.name}</p>
                </div>
              {/if}
              {#if currentTeam.submission?.desc}
                <div>
                  <p class="text-gray-400 font-medium">Description</p>
                  <p class="text-white">{currentTeam.submission.desc}</p>
                </div>
              {/if}
              {#if currentTeam.submission?.repo}
                <div>
                  <p class="text-gray-400 font-medium">Repository</p>
                  <a href={currentTeam.submission.repo} target="_blank" rel="noopener noreferrer" class="text-[#FE5428] hover:underline break-all">
                    {currentTeam.submission.repo}
                  </a>
                </div>
              {/if}
            </div>
          </button>
        </div>

        {#if $errorMessage}
          <div class="p-4 rounded border border-red-700 bg-red-900/20 text-red-300">
            {$errorMessage}
          </div>
        {/if}

        <Button
          on:click={handleSubmitJudgment}
          disabled={!selectedWinner || $inFlightLoading}
          class="w-full bg-[#FE5428] hover:bg-[#e64520] text-white px-8 py-6 text-lg"
        >
          {$inFlightLoading ? 'Submitting...' : 'Submit & Next Team'}
        </Button>
      </div>
    {/if}
  </div>
</div>
