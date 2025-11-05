<script lang="ts">
  import { onMount } from 'svelte'
  import TopBar from '$lib/components/mobile/TopBar.svelte'
  import Navbar from '$lib/components/mobile/Navbar.svelte'
  import Button from '$components/ui/button/button.svelte'
  import { navigate } from 'svelte5-router'
  import {
    teamRune,
    join as joinTeam,
    joinFast,
    getTeam,
    leave as leaveTeam,
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

  // business rule: max team size is 4
  const MAX_TEAM_SIZE = 4

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
  $: teamIsFull = derivedMemberCount >= MAX_TEAM_SIZE

  onMount(() => {
    if (typeof window === 'undefined') return
    clearError()
    try {
      const params = new URLSearchParams(window.location.search)
      // prefer `teamID` query param (backend join expects this), fallback to `id`
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
        previewError = 'Team name unavailable. You can still join below.'
      }
    } catch (error) {
      previewError = isApiError(error)
        ? error.message
        : 'Unable to load team details. You can retry or continue.'
    } finally {
      previewLoading = false
    }
  }

  async function handleJoin() {
    if (!teamId || isJoining || teamIsFull) return
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
        // Refresh the full team document so the UI state is consistent
        await getTeam()
      }
      // On success redirect to /team
      navigate('/team')
    } catch (error) {
      // Surface a clearer message when the account already belongs to another team.
      if (isApiError(error) && error.status === 409) {
        joinError =
          'You are already a member of a different team. Leave your current team before joining another.'
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

  function handleGoToTeam() {
    navigate('/team')
  }

  function retryPreview() {
    if (!teamId) return
    void loadPreview(teamId)
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

<main class="min-h-screen bg-black pb-28 text-white">
  <TopBar />

  <div
    class="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 pt-6"
  >
    {#if missingId}
      <section
        class="w-full rounded-3xl border border-white/5 bg-[#121212] px-6 py-8 text-center shadow-lg shadow-black/40"
      >
        <h1 class="text-xl font-semibold text-white">Invalid join link</h1>
        <p class="mt-3 text-sm text-zinc-400">
          We couldn't find a team identifier in this link. Ask your team lead to
          resend the invite.
        </p>
        <Button
          class="mt-6 h-11 w-full rounded-xl bg-white text-base font-semibold text-black transition hover:bg-white/90"
          on:click={handleCancel}
        >
          Back home
        </Button>
      </section>
    {:else if !initialized}
      <section
        class="flex w-full items-center justify-center rounded-3xl border border-white/5 bg-[#121212] px-6 py-10 shadow-lg shadow-black/40"
      >
        <div
          class="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"
        ></div>
      </section>
    {:else}
      <section
        class="w-full rounded-3xl border border-white/5 bg-[#121212] px-6 py-8 shadow-lg shadow-black/40"
      >
        <header class="flex flex-col gap-1 text-center">
          <h1 class="text-xl font-semibold text-white">Join team</h1>
          <p class="text-sm text-zinc-400">
            Confirm that you want to join this team.
          </p>
        </header>

        <!-- Team card: full width -->
        <div class="mt-6">
          <div
            class="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-center w-full"
          >
            <p class="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Team
            </p>
            <div class="mt-2 text-xl font-semibold text-white">
              {#if previewLoading}
                <span
                  class="inline-flex items-center gap-2 text-sm text-zinc-400"
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
              <p class="mt-4 text-xs text-amber-400">{previewError}</p>
              <Button
                variant="ghost"
                class="mt-3 h-9 rounded-full border border-white/10 px-4 text-sm font-medium text-white hover:border-white/20 hover:bg-white/5"
                on:click={retryPreview}
                disabled={previewLoading}
              >
                Retry
              </Button>
            {/if}

            {#if teamIsFull}
              <p class="mt-4 text-sm text-amber-400">
                This team is full — no more than {MAX_TEAM_SIZE} members allowed.
              </p>
            {/if}
          </div>
        </div>

        <!-- Team members: full width and stacked under team -->
        <div class="mt-5">
          <div
            class="rounded-2xl border border-white/10 bg-black/20 px-5 py-5 w-full"
          >
            <div class="flex items-center justify-between">
              <h2
                class="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500"
              >
                Team members
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
                      class="h-4 w-28 animate-pulse rounded bg-white/5"
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
                  <p class="pt-1 text-xs text-zinc-400">
                    + {remainingMembers} more teammate{remainingMembers === 1
                      ? ''
                      : 's'}
                  </p>
                {/if}
              {/if}
            </div>
          </div>
        </div>

        {#if joinError}
          <div
            class="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {joinError}
          </div>
        {/if}

        <!-- Actions: cancel (left, white) and join (right, orange). Join disabled when team full -->
        <div class="mt-6">
          {#if inDifferentTeam}
            <p class="text-sm leading-relaxed text-zinc-300">
              You're already part of <span class="font-semibold text-white"
                >{currentTeam?.name}</span
              >. You can leave and join this team instead.
            </p>
            <div class="mt-3 flex gap-3">
              <Button
                class="flex-1 h-11 rounded-xl bg-white text-base font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
                on:click={handleCancel}
                disabled={isJoining || $teamLoading}
              >
                Cancel
              </Button>
              <Button
                class="flex-1 h-11 rounded-xl !bg-[#FE5428] px-6 text-base font-semibold text-white transition hover:!bg-[#ff734f] disabled:opacity-60"
                on:click={handleJoin}
                disabled={isJoining || $teamLoading}
              >
                {isJoining || $teamLoading ? 'Joining…' : 'Join team'}
              </Button>
            </div>
          {:else if alreadyInTarget}
            <p class="text-sm leading-relaxed text-zinc-300">
              You are already a member of <span class="font-semibold text-white"
                >{currentTeam?.name}</span
              >.
            </p>
            <div class="mt-3 flex gap-3">
              <Button
                class="flex-1 h-11 rounded-xl bg-white text-base font-semibold text-black transition hover:bg-white/90"
                on:click={handleCancel}
              >
                Back
              </Button>
              <Button
                class="flex-1 h-11 rounded-xl !bg-[#FE5428] px-6 text-base font-semibold text-white transition hover:!bg-[#ff734f]"
                on:click={handleGoToTeam}
              >
                Go to team
              </Button>
            </div>
          {:else}
            <p class="text-sm leading-relaxed text-zinc-300">
              Joining will give you access to this team's members, submission
              and updates.
            </p>

            <div class="mt-3 flex gap-3">
              <!-- Cancel: left, white with black text -->
              <Button
                class="flex-1 h-11 rounded-xl bg-white text-base font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
                disabled={isJoining || $teamLoading}
                on:click={handleCancel}
              >
                Cancel
              </Button>

              <!-- Join: right, orange; disabled when team is full -->
              <Button
                class="flex-1 h-11 rounded-xl !bg-[#FE5428] px-6 text-base font-semibold text-white transition hover:!bg-[#ff734f] disabled:opacity-60"
                disabled={previewLoading ||
                  isJoining ||
                  teamIsFull ||
                  $teamLoading}
                on:click={handleJoin}
              >
                {isJoining || $teamLoading
                  ? 'Joining…'
                  : teamIsFull
                    ? 'Team full'
                    : 'Join team'}
              </Button>
            </div>
          {/if}
        </div>
      </section>
    {/if}
  </div>

  <Navbar />
</main>
