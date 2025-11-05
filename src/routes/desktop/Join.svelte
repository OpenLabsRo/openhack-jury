<script lang="ts">
  import { onMount } from 'svelte'
  import Navbar from '$lib/components/desktop/Navbar.svelte'
  import Button from '$components/ui/button/button.svelte'
  import { navigate } from 'svelte5-router'
  import {
    teamRune,
    join as joinTeam,
    joinFast,
    leave as leaveTeam,
    getTeam,
    leaveAndJoin,
    teamLoading,
  } from '$runes/teamRune.js'
  import { openhackApi, isApiError } from '$lib/api/openhackApi'
  import { setError, clearError } from '$runes/errorRune'
  import type { Team } from '$types/team.js'
  import type { Account } from '$types/account.js'
  import { getProfileGradient, getInitials } from '$lib/utils/profileColor.js'
  import { normalizeAccounts } from '$lib/utils/normalizeAccount.js'

  let teamId = ''
  let teamName = ''
  let previewLoading = false
  let previewError: string | null = null
  let joinError: string | null = null
  let isJoining = false
  let missingId = false
  let initialized = false
  let previewMembers: Account[] = []
  let previewTable = ''
  let membersCount = 0
  let previewLoaded = false

  $: currentTeam = $teamRune as Team | null
  $: alreadyInTarget = Boolean(
    currentTeam && teamId && currentTeam.id === teamId
  )
  $: inDifferentTeam = Boolean(
    currentTeam && teamId && currentTeam.id !== teamId
  )
  $: fallbackName =
    teamName || (teamId ? `team ${teamId.slice(0, 6)}…` : 'this team')
  $: derivedMemberCount = membersCount || previewMembers.length
  $: displayMembers = previewMembers.slice(0, 4)
  $: remainingMembers = Math.max(derivedMemberCount - displayMembers.length, 0)
  $: displayTeamName = previewLoading ? 'Loading…' : teamName || fallbackName
  $: teamFull = derivedMemberCount >= 4
  $: joinDisabled = previewLoading || isJoining || teamFull || $teamLoading

  onMount(() => {
    if (typeof window === 'undefined') return
    clearError()
    try {
      const params = new URLSearchParams(window.location.search)
      // Prefer explicit `teamID` query param; fall back to legacy `id` if present.
      const id = params.get('teamID') ?? params.get('id')
      const suppliedName = params.get('name')
      if (!id) {
        missingId = true
        return
      }
      teamId = id
      teamName = suppliedName?.trim() ?? ''
      initialized = true
      void initialize()
    } catch {
      missingId = true
    }
  })

  async function initialize() {
    await ensureTeamState()
    if (!teamName) {
      await loadPreview(teamId)
    }
  }

  async function ensureTeamState() {
    try {
      await getTeam()
    } catch (error) {
      if (
        isApiError(error) &&
        (error.status === 404 || error.status === 403 || error.status === 409)
      ) {
        // User is not yet in a team; clear without surfacing an error toast
        teamRune.set(null)
      } else {
        setError(error)
      }
    }
  }

  async function loadPreview(id: string) {
    previewLoading = true
    previewError = null
    previewMembers = []
    membersCount = 0
    previewTable = ''
    try {
      const preview = await openhackApi.Teams.preview(id)
      teamName = preview?.name?.trim() ?? ''
      previewTable = preview?.table?.trim() ?? ''
      previewMembers = normalizeAccounts(preview?.members)
      membersCount = preview?.members_count ?? previewMembers.length
      if (!teamName) {
        previewError =
          'Team name unavailable. You can still join using the button below.'
      }
    } catch (error) {
      previewError = isApiError(error)
        ? error.message
        : 'Unable to load team details. You can retry or continue anyway.'
    } finally {
      previewLoading = false
      previewLoaded = true
    }
  }

  async function handleJoin() {
    if (!teamId || isJoining || teamFull) return
    isJoining = true
    joinError = null
    clearError()
    try {
      if (inDifferentTeam) {
        // User is in a different team: leave old, then join new
        // Button stays loading through both operations and getTeam fetch
        await leaveAndJoin(teamId)
      } else {
        // Normal join flow: join, then fetch full team data
        await joinFast(teamId)
        // Refresh the full team document to ensure app state is up-to-date
        await getTeam()
      }
      // On success redirect to /team
      navigate('/team')
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        // Backend informs account already has a team
        joinError = 'You already have a team. Leave it before joining another.'
      } else {
        joinError = isApiError(error)
          ? error.message
          : 'Failed to join the team. Please try again.'
      }
      setError(error)
    } finally {
      isJoining = false
      void ensureTeamState()
    }
  }

  function handleCancel() {
    navigate('/')
  }

  function retryPreview() {
    if (!teamId) return
    void loadPreview(teamId)
  }

  function handleGoToTeam() {
    navigate('/team')
  }

  function getMemberDisplayName(member: Account): string {
    const first = member.firstName?.trim() ?? ''
    const last = member.lastName?.trim() ?? ''
    if (first || last) {
      return [first, last].filter(Boolean).join(' ')
    }
    return member.name?.trim() || member.email || 'Team member'
  }
</script>

<main class="min-h-screen bg-black text-white">
  <Navbar />

  <div
    class="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 pb-16 pt-16 md:px-8"
  >
    {#if missingId}
      <section
        class="w-full max-w-xl rounded-3xl border border-white/5 bg-[#121212] px-10 py-12 text-center shadow-lg shadow-black/40"
      >
        <h1 class="text-2xl font-semibold text-white">Invalid join link</h1>
        <p class="mt-4 text-sm text-zinc-400">
          We could not find a team identifier in this link. Please check with
          your team lead and try again.
        </p>
        <Button
          class="mt-8 h-12 w-full max-w-xs rounded-xl bg-white text-base font-semibold text-black transition hover:bg-white/90"
          on:click={handleCancel}
        >
          Back home
        </Button>
      </section>
    {:else if !initialized || (initialized && !previewLoaded)}
      <section
        class="flex w-full max-w-xl items-center justify-center rounded-3xl border border-white/5 bg-[#121212] px-10 py-16 shadow-lg shadow-black/40"
      >
        <div
          class="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"
        ></div>
      </section>
    {:else}
      <section
        class="w-full max-w-3xl rounded-3xl border border-white/5 bg-[#121212] px-10 py-12 shadow-lg shadow-black/40"
      >
        <header class="flex flex-col gap-1 text-center">
          <h1 class="text-2xl font-semibold text-white">Join team</h1>
          <p class="text-sm text-zinc-400">
            Confirm that you want to join the team below.
          </p>
        </header>

        <!-- Team card: full width of container -->
        <div class="mt-8">
          <div
            class="rounded-2xl border border-white/10 bg-black/20 px-6 py-6 w-full"
          >
            <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">Team</p>
            <div class="mt-3 text-2xl font-semibold text-white">
              {#if previewLoading}
                <span
                  class="inline-flex items-center gap-2 text-base text-zinc-400"
                >
                  <span
                    class="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"
                  ></span>
                  Loading…
                </span>
              {:else}
                {displayTeamName}
              {/if}
            </div>

            {#if previewTable}
              <p class="mt-3 text-sm text-zinc-400">
                Table <span class="font-medium text-white">{previewTable}</span>
              </p>
            {/if}

            {#if previewError}
              <p class="mt-4 text-sm text-amber-400">{previewError}</p>
              <Button
                variant="ghost"
                class="mt-3 h-9 rounded-full border border-white/10 px-4 text-sm font-medium text-white hover:border-white/20 hover:bg-white/5"
                on:click={retryPreview}
                disabled={previewLoading}
              >
                Retry
              </Button>
            {/if}
          </div>
        </div>

        <!-- Team Members card: stacked under Team card -->
        <div class="mt-6">
          <div class="rounded-2xl border border-white/10 bg-black/20 px-6 py-5">
            <div class="flex items-baseline justify-between">
              <h2
                class="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500"
              >
                Team Members
              </h2>
              {#if !previewLoading && derivedMemberCount > 0}
                <span class="text-xs text-zinc-400"
                  >{derivedMemberCount} total</span
                >
              {/if}
            </div>

            <div class="mt-4 space-y-3">
              {#if previewLoading}
                {#each Array(3) as _, index (index)}
                  <div class="flex items-center gap-3">
                    <div
                      class="h-9 w-9 animate-pulse rounded-full bg-white/5"
                    ></div>
                    <div
                      class="h-4 w-32 animate-pulse rounded bg-white/5"
                    ></div>
                  </div>
                {/each}
              {:else if displayMembers.length === 0}
                <p class="text-sm text-zinc-400">No members to display yet.</p>
              {:else}
                <ul class="space-y-3 text-left">
                  {#each displayMembers as member (member.id)}
                    <li class="flex items-center gap-3">
                      <div
                        class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={`background:${getProfileGradient(member.id)}`}
                      >
                        {getInitials(getMemberDisplayName(member))}
                      </div>
                      <div class="flex flex-col">
                        <span class="text-sm font-medium text-white"
                          >{getMemberDisplayName(member)}</span
                        >
                        {#if member.email}
                          <span class="text-xs text-zinc-500"
                            >{member.email}</span
                          >
                        {/if}
                      </div>
                    </li>
                  {/each}
                </ul>

                {#if remainingMembers > 0}
                  <p class="pt-2 text-xs text-zinc-400">
                    + {remainingMembers} more teammate{remainingMembers === 1
                      ? ''
                      : 's'}
                  </p>
                {/if}
              {/if}
            </div>
          </div>
        </div>

        {#if teamFull}
          <div
            class="mt-6 rounded-2xl border border-yellow-600/30 bg-yellow-600/5 px-4 py-3 text-sm text-amber-300"
          >
            This team already has 4 members and is full. You cannot join at this
            time.
          </div>
        {/if}

        {#if joinError}
          <div
            class="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {joinError}
          </div>
        {/if}

        <!-- Action buttons: Cancel (left, white), Join (right, orange) -->
        <div class="mt-6 flex items-center justify-between gap-4">
          <!-- Cancel on the left -->
          <div class="flex-1">
            <Button
              class="h-11 w-full rounded-xl bg-white text-base font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
              on:click={handleCancel}
              disabled={isJoining || $teamLoading}
            >
              Cancel
            </Button>
          </div>

          <!-- Join on the right (make equal width by using flex-1) -->
          <div class="flex-1">
            {#if alreadyInTarget}
              <Button
                class="h-11 w-full rounded-xl !bg-[#FE5428] px-6 text-base font-semibold text-white transition hover:!bg-[#ff734f]"
                on:click={handleGoToTeam}
              >
                Go to team
              </Button>
            {:else}
              <Button
                class="h-11 w-full rounded-xl !bg-[#FE5428] px-6 text-base font-semibold text-white transition hover:!bg-[#ff734f]"
                disabled={joinDisabled}
                on:click={handleJoin}
              >
                {isJoining || $teamLoading ? 'Joining…' : 'Join team'}
              </Button>
            {/if}
          </div>
        </div>
      </section>
    {/if}
  </div>
</main>
