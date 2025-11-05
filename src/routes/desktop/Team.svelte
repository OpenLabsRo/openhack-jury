<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import { navigate } from 'svelte5-router'
  import Navbar from '$lib/components/desktop/Navbar.svelte'
  import VoteBanner from '$lib/components/shared/VoteBanner.svelte'
  import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte'
  import Button from '$components/ui/button/button.svelte'
  import { Input } from '$components/ui/input'
  import { RotateCw } from '@lucide/svelte'
  import {
    teamRune,
    teamMembersRune,
    teamLoading,
    getTeam,
    loadMembers,
    createTeam,
    changeTeamName,
    changeTable,
    leave,
  } from '$runes/teamRune.js'
  import { flagsRune } from '$runes/flagsRune.js'
  import { setError, clearError, setErrorMessage } from '$runes/errorRune'
  import { openhackApi, isApiError } from '$lib/api/openhackApi'
  import { getProfileGradient, getInitials } from '$lib/utils/profileColor.js'
  import type { Account } from '$types/account.js'
  import type { Team } from '$types/team.js'

  const DEBOUNCE_MS = 1000
  let isInitializing = true
  let isCreating = false
  let teamNameInput = ''
  let tableInput = ''
  let joinLink = ''
  let copied = false
  let lastJoinLink = ''
  let nameDirty = false
  let tableDirty = false
  let nameTimer: ReturnType<typeof setTimeout> | undefined
  let tableTimer: ReturnType<typeof setTimeout> | undefined
  let copyTimer: ReturnType<typeof setTimeout> | undefined
  let currentTeamId: string | null = null
  let pendingNameSync: string | null = null
  let pendingTableSync: string | null = null
  let unsubscribeTeam: (() => void) | undefined
  let canEditTeam = false
  let isReloading = false
  let showLeaveDialog = false
  let isLeavingTeam = false

  onMount(() => {
    let active = true

    const load = async () => {
      try {
        await Promise.all([getTeam(), loadMembers()])
        clearError()
      } catch (error) {
        if (
          isApiError(error) &&
          (error.status === 404 || error.status === 403)
        ) {
          teamRune.set(null)
          teamMembersRune.set([])
          clearError()
        } else {
          setError(error)
        }
      } finally {
        if (active) {
          isInitializing = false
        }
      }
    }

    unsubscribeTeam = teamRune.subscribe((team) => {
      const teamId = team?.id ?? null
      const teamChanged = teamId !== currentTeamId

      if (teamChanged) {
        nameDirty = false
        pendingNameSync = null
        tableDirty = false
        pendingTableSync = null
      }

      const serverName = team?.name ?? ''
      if (pendingNameSync !== null && serverName === pendingNameSync) {
        nameDirty = false
        pendingNameSync = null
      }

      if (!nameDirty || teamChanged) {
        teamNameInput = serverName
      }

      const serverTable = team?.table ?? ''
      if (pendingTableSync !== null && serverTable === pendingTableSync) {
        tableDirty = false
        pendingTableSync = null
      }

      if (!tableDirty || teamChanged) {
        tableInput = serverTable
      }

      currentTeamId = teamId
    })

    void load()

    return () => {
      active = false
    }
  })

  onDestroy(() => {
    if (nameTimer) clearTimeout(nameTimer)
    if (tableTimer) clearTimeout(tableTimer)
    if (copyTimer) clearTimeout(copyTimer)
    if (unsubscribeTeam) unsubscribeTeam()
  })

  $: currentTeam = $teamRune as Team | null
  $: members = $teamMembersRune as Account[]
  $: hasTeam = Boolean(currentTeam)
  $: isSyncing = $teamLoading
  $: canEditTeam = Boolean($flagsRune?.flags?.teams_write)

  $: joinLink = currentTeam?.id ? buildJoinLink(currentTeam.id) : ''
  $: if (joinLink !== lastJoinLink) {
    lastJoinLink = joinLink
    if (copied) {
      copied = false
      if (copyTimer) {
        clearTimeout(copyTimer)
        copyTimer = undefined
      }
    }
  }

  function buildJoinLink(teamId: string): string {
    const params = new URLSearchParams({ id: teamId })
    const query = params.toString()

    const envBase = (import.meta as any)?.env?.VITE_TEAM_JOIN_BASE as
      | string
      | undefined
    if (envBase && envBase.trim().length > 0) {
      const trimmed = envBase.trim().replace(/\/+$/, '')
      return `${trimmed}/join?${query}`
    }

    if (typeof window !== 'undefined' && window?.location?.origin) {
      return `${window.location.origin}/join?${query}`
    }

    return `/join?${query}`
  }

  function handleTeamNameInput() {
    if (!hasTeam || !canEditTeam) return
    nameDirty = true
    scheduleNameUpdate()
  }

  function handleTeamNameBlur() {
    if (!hasTeam || !canEditTeam) return
    if (nameTimer) {
      clearTimeout(nameTimer)
      nameTimer = undefined
    }
    if (nameDirty) {
      void submitTeamName()
    } else {
      const latestTeam = get(teamRune)
      teamNameInput = latestTeam?.name ?? ''
    }
  }

  function scheduleNameUpdate() {
    if (nameTimer) clearTimeout(nameTimer)
    nameTimer = setTimeout(() => {
      void submitTeamName()
    }, DEBOUNCE_MS)
  }

  async function submitTeamName() {
    if (!canEditTeam) return
    const latestTeam = get(teamRune)
    nameTimer = undefined
    if (!latestTeam) {
      pendingNameSync = null
      nameDirty = false
      return
    }

    const trimmed = teamNameInput.trim()
    const currentName = latestTeam.name ?? ''

    if (trimmed.length === 0) {
      teamNameInput = currentName
      pendingNameSync = null
      nameDirty = false
      return
    }

    if (trimmed === currentName) {
      pendingNameSync = null
      nameDirty = false
      return
    }

    try {
      pendingNameSync = trimmed
      const updatedTeam = await changeTeamName(trimmed)
      teamNameInput = updatedTeam?.name ?? trimmed
      currentTeamId = updatedTeam?.id ?? currentTeamId
      pendingNameSync = null
      nameDirty = false
      clearError()
    } catch (error) {
      setError(error)
      const updated = get(teamRune)
      const fallbackName = updated?.name ?? currentName
      teamNameInput = fallbackName
      pendingNameSync = null
      nameDirty = false
    }
  }

  function handleTableInput() {
    if (!hasTeam || !canEditTeam) return
    tableDirty = true
    scheduleTableUpdate()
  }

  function handleTableBlur() {
    if (!hasTeam || !canEditTeam) return
    if (tableTimer) {
      clearTimeout(tableTimer)
      tableTimer = undefined
    }
    if (tableDirty) {
      void submitTable()
    }
  }

  function scheduleTableUpdate() {
    if (tableTimer) clearTimeout(tableTimer)
    tableTimer = setTimeout(() => {
      void submitTable()
    }, DEBOUNCE_MS)
  }

  async function submitTable() {
    if (!canEditTeam) return
    const latestTeam = get(teamRune)
    tableTimer = undefined
    if (!latestTeam) {
      pendingTableSync = null
      tableDirty = false
      return
    }

    const normalized = tableInput.trim()
    const currentTable = latestTeam.table ?? ''

    if (normalized === currentTable) {
      pendingTableSync = null
      tableDirty = false
      return
    }

    try {
      pendingTableSync = normalized
      const updatedTeam = await changeTable(normalized)
      tableInput = updatedTeam?.table ?? normalized
      currentTeamId = updatedTeam?.id ?? currentTeamId
      pendingTableSync = null
      tableDirty = false
      clearError()
    } catch (error) {
      setError(error)
      const updated = get(teamRune)
      tableInput = updated?.table ?? currentTable
      pendingTableSync = null
      tableDirty = false
    }
  }

  async function handleCreateTeam() {
    if (isCreating || $teamLoading || !canEditTeam) return
    isCreating = true
    try {
      await createTeam('New Team')
      clearError()
    } catch (error) {
      setError(error)
    } finally {
      isCreating = false
    }
  }

  function openLeaveDialog() {
    showLeaveDialog = true
  }

  function closeLeaveDialog() {
    showLeaveDialog = false
  }

  async function confirmLeaveTeam() {
    if (!hasTeam) return

    isLeavingTeam = true
    try {
      await leave()
      clearError()
      closeLeaveDialog()
    } catch (error) {
      setError(error)
    } finally {
      isLeavingTeam = false
    }
  }

  async function copyJoinLink() {
    if (!joinLink || copied) return

    if (
      typeof navigator === 'undefined' ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== 'function'
    ) {
      setErrorMessage('Copy is not supported. Please copy the link manually.')
      return
    }

    try {
      await navigator.clipboard.writeText(joinLink)
      copied = true
      if (copyTimer) clearTimeout(copyTimer)
      copyTimer = setTimeout(() => {
        copied = false
      }, 2000)
    } catch (error) {
      setErrorMessage('Unable to copy the join link. Please copy it manually.')
    }
  }

  function getMemberDisplayName(member: Account): string {
    const first = member.firstName?.trim() ?? ''
    const last = member.lastName?.trim() ?? ''
    if (first || last) {
      return [first, last].filter(Boolean).join(' ')
    }
    return member.name?.trim() || member.email || 'Team member'
  }

  async function handleReload() {
    if (isReloading || $teamLoading) return
    isReloading = true
    try {
      await Promise.all([getTeam(), loadMembers()])
      clearError()
    } catch (error) {
      setError(error)
    } finally {
      isReloading = false
    }
  }
</script>

<main class="min-h-screen bg-black text-white">
  <Navbar />

  <div
    class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-16 pt-10 md:px-8"
  >
    <VoteBanner />
    {#if isInitializing && !hasTeam && isSyncing}
      <div class="flex flex-1 items-center justify-center py-24">
        <div
          class="flex h-48 w-full max-w-lg animate-pulse flex-col items-center justify-center rounded-3xl bg-white/5 text-center text-sm text-zinc-400"
        >
          Loading team information…
        </div>
      </div>
    {:else if !hasTeam}
      <section class="flex flex-1 items-center justify-center py-24">
        <div
          class="w-full max-w-lg rounded-3xl border border-white/5 bg-[#121212] px-10 py-12 text-center shadow-lg shadow-black/40"
        >
          <h1 class="text-2xl font-semibold text-white">Team Management</h1>
          <p class="mt-4 text-sm leading-relaxed text-zinc-400">
            Use the button below to create a team or join a team by clicking a
            link received by the team leader.
          </p>
          <Button
            class="mt-8 h-12 w-full rounded-xl bg-white text-base font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
            disabled={isSyncing || isCreating || !canEditTeam}
            on:click={handleCreateTeam}
          >
            {isSyncing || isCreating ? 'Creating…' : 'Create a Team'}
          </Button>
        </div>
      </section>
    {:else}
      <div
        class="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]"
      >
        <section
          class="flex h-full flex-col rounded-3xl border border-white/5 bg-[#121212] px-10 py-12 shadow-lg shadow-black/30"
        >
          <header
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <h1 class="text-2xl font-semibold text-white">
                Manage your team
              </h1>
              <p class="text-sm text-zinc-400">
                All the info is auto-saved as you type
              </p>
            </div>
            <div class="flex items-center gap-3 self-end sm:self-auto">
              <div
                class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200"
                aria-live="polite"
              >
                {#if isSyncing}
                  <span class="inline-flex h-3 w-3 items-center justify-center">
                    <span
                      class="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin"
                    ></span>
                  </span>
                  <span>Syncing…</span>
                {:else}
                  <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
                  <span>Up to date</span>
                {/if}
              </div>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                class:animate-spin={isReloading}
                disabled={isSyncing || isReloading}
                onclick={handleReload}
                title="Reload"
              >
                <RotateCw class="h-4 w-4" />
              </button>
            </div>
          </header>

          <div class="mt-9 flex flex-1 flex-col gap-7">
            <div class="space-y-2">
              <label
                for="team-name"
                class="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-zinc-500"
                >Team Name</label
              >
              <Input
                id="team-name"
                bind:value={teamNameInput}
                oninput={handleTeamNameInput}
                onblur={handleTeamNameBlur}
                disabled={isSyncing || !canEditTeam}
                class="h-10 rounded-lg border border-[#2E2E2E] bg-[#101010] text-sm text-zinc-100 focus-visible:border-[#444]"
              />
            </div>

            <div class="space-y-2">
              <label
                for="team-join-link"
                class="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-zinc-500"
                >Join Link</label
              >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  id="team-join-link"
                  value={joinLink}
                  readonly
                  disabled
                  class="h-10 flex-1 rounded-lg border border-[#2E2E2E] bg-[#101010] px-3 text-sm text-zinc-100 focus-visible:border-[#444]"
                />
                <Button
                  class="h-10 rounded-lg !bg-[#FE5428] px-5 text-sm font-semibold text-white transition hover:!bg-[#ff734f] disabled:!bg-[#6b2a1d]"
                  disabled={isSyncing || !joinLink || !canEditTeam}
                  on:click={copyJoinLink}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div class="space-y-2">
              <label
                for="team-table"
                class="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-zinc-500"
                >Table Number</label
              >
              <Input
                id="team-table"
                bind:value={tableInput}
                oninput={handleTableInput}
                onblur={handleTableBlur}
                disabled={isSyncing || !canEditTeam}
                placeholder="e.g. A1"
                class="h-10 rounded-lg border border-[#2E2E2E] bg-[#101010] text-sm text-zinc-100 focus-visible:border-[#444]"
              />
            </div>
          </div>
        </section>

        <section
          class="flex h-full flex-col rounded-3xl border border-white/5 bg-[#121212] p-8 shadow-lg shadow-black/30"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-white">Team Members</h2>
            <span class="text-sm text-zinc-500"
              >{members.length} member{members.length === 1 ? '' : 's'}</span
            >
          </div>

          <div class="mt-6 flex flex-1 flex-col gap-4">
            <ul class="flex-1 space-y-3.5">
              {#if members.length === 0}
                <li
                  class="rounded-2xl border border-white/5 bg-black/30 px-4 py-6 text-sm text-zinc-400"
                >
                  No teammates yet. Share the join link to invite teammates.
                </li>
              {:else}
                {#each members as member (member.id)}
                  <li
                    class="flex items-center justify-between gap-3 rounded-2xl bg-black/30 px-4 py-2.5"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={`background:${getProfileGradient(member.id)}`}
                      >
                        {getInitials(getMemberDisplayName(member))}
                      </div>
                      <div class="flex flex-col">
                        <span
                          class="text-sm font-medium leading-tight text-white"
                          >{getMemberDisplayName(member)}</span
                        >
                        {#if member.email}
                          <span class="text-xs text-zinc-400"
                            >{member.email}</span
                          >
                        {/if}
                      </div>
                    </div>
                  </li>
                {/each}
              {/if}
            </ul>

            <Button
              class="mt-auto h-12 w-full rounded-xl !bg-[#FF3B30] text-base font-semibold text-white transition hover:!bg-[#ff5249] disabled:!bg-[#833030]"
              disabled={isSyncing || !canEditTeam}
              on:click={openLeaveDialog}
            >
              Leave Team
            </Button>
          </div>
        </section>
      </div>
    {/if}

    <ConfirmDialog
      bind:isOpen={showLeaveDialog}
      title="Leave team?"
      description="You will no longer be part of this team. You can join another team later."
      confirmText="Leave"
      cancelText="Cancel"
      isDangerous={true}
      isLoading={isLeavingTeam}
      onConfirm={confirmLeaveTeam}
      onCancel={closeLeaveDialog}
    />
  </div>
</main>
