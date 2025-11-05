import { derived, writable, get } from 'svelte/store'
import { saveToken } from '$lib/auth.js'
import type { Team } from '$types/team.js'
import type { Account } from '$types/account.js'
import {
  openhackApi,
  type AccountTokenResponse,
  type AccountMembersResponse,
  type TeamMembersResponse,
} from '../lib/api/openhackApi.js'
import { accountRune } from './accountRune.js'
import { withMinDuration } from '$lib/stores/withMinDuration.js'
import {
  DEFAULT_MIN_DURATION,
  waitMinimumDuration,
} from '$lib/utils/minDuration.js'
import {
  normalizeAccount,
  normalizeAccounts,
} from '$lib/utils/normalizeAccount.js'

export const teamRune = writable<Team | null>(null)
export const teamMembersRune = writable<Account[]>([])
const teamLoadingCounter = writable(0)
export const teamLoadingPending = derived(
  teamLoadingCounter,
  (pending) => pending > 0
)
export const teamLoading = withMinDuration(teamLoadingPending)

const MIN_LOADING_DURATION = DEFAULT_MIN_DURATION

function beginTeamLoading() {
  const pending = get(teamLoadingCounter)
  teamLoadingCounter.set(pending + 1)
  return pending === 0
}

function endTeamLoading() {
  teamLoadingCounter.update((pending) => (pending > 0 ? pending - 1 : 0))
}

async function withTeamLoading<T>(task: () => Promise<T>): Promise<T> {
  const isRoot = beginTeamLoading()
  const startedAt = isRoot ? Date.now() : 0
  try {
    const result = await task()
    if (isRoot) {
      await waitMinimumDuration(startedAt, MIN_LOADING_DURATION)
    }
    return result
  } catch (error) {
    if (isRoot) {
      await waitMinimumDuration(startedAt, MIN_LOADING_DURATION)
    }
    throw error
  } finally {
    endTeamLoading()
  }
}

async function refreshAuth({ token, account }: AccountTokenResponse) {
  saveToken(token)
  accountRune.set(normalizeAccount(account))
}

function applyMembers(members: Account[]) {
  const normalized = normalizeAccounts(members)
  teamMembersRune.set(normalized)
  return normalized
}

export async function getTeam() {
  return withTeamLoading(async () => {
    const team = await openhackApi.Teams.detail()
    teamRune.set(team)
    return team
  })
}

export async function loadMembers() {
  return withTeamLoading(async () => {
    const members = await openhackApi.Teams.members()
    return applyMembers(members)
  })
}

export async function createTeam(name: string) {
  return withTeamLoading(async () => {
    const response = await openhackApi.Teams.create(name)
    await refreshAuth(response)
    const team = await getTeam()
    await loadMembers()
    return team
  })
}

export async function changeTeamName(name: string) {
  return withTeamLoading(async () => {
    const team = await openhackApi.Teams.changeName({ name })
    teamRune.set(team)
    return team
  })
}

export async function changeTable(table: string) {
  return withTeamLoading(async () => {
    const team = await openhackApi.Teams.changeTable({ table })
    teamRune.set(team)
    return team
  })
}

export async function deleteTeam() {
  return withTeamLoading(async () => {
    const response = await openhackApi.Teams.remove()
    await refreshAuth(response)
    teamRune.set(null)
    teamMembersRune.set([])
    return response
  })
}

export async function join(teamId: string) {
  return withTeamLoading(async () => {
    const response: AccountMembersResponse =
      await openhackApi.Teams.join(teamId)
    await refreshAuth(response)
    applyMembers(response.members)
    return await getTeam()
  })
}

export async function joinFast(teamId: string) {
  // Similar to `join` but returns the successful join response immediately
  // while refreshing the full team document in the background.
  return withTeamLoading(async () => {
    const response: AccountMembersResponse =
      await openhackApi.Teams.join(teamId)
    await refreshAuth(response)
    applyMembers(response.members)
    // trigger a background refresh of the team doc; don't await it here
    void getTeam()
    return response
  })
}

export async function leave() {
  return withTeamLoading(async () => {
    const response: AccountMembersResponse = await openhackApi.Teams.leave()
    await refreshAuth(response)
    teamRune.set(null)
    teamMembersRune.set([])
    return response
  })
}

export async function leaveAndJoin(newTeamId: string) {
  return withTeamLoading(async () => {
    // 1. Leave the current team
    const leaveResponse: AccountMembersResponse =
      await openhackApi.Teams.leave()
    await refreshAuth(leaveResponse)
    teamRune.set(null)
    teamMembersRune.set([])

    // 2. Join the new team
    const joinResponse: AccountMembersResponse =
      await openhackApi.Teams.join(newTeamId)
    await refreshAuth(joinResponse)
    applyMembers(joinResponse.members)

    // 3. Fetch the full team document and await it before returning
    const team = await getTeam()
    return team
  })
}

export async function kick(accountId: string) {
  return withTeamLoading(async () => {
    const { members }: TeamMembersResponse =
      await openhackApi.Teams.kick(accountId)
    applyMembers(members)
    return await getTeam()
  })
}

/**
 * Submission-related functions
 * These update submission fields on the backend and sync the team state
 */

export async function updateSubmissionName(name: string) {
  return withTeamLoading(async () => {
    const team = await openhackApi.Submissions.updateName(name)
    teamRune.set(team)
    return team
  })
}

export async function updateSubmissionDesc(desc: string) {
  return withTeamLoading(async () => {
    const team = await openhackApi.Submissions.updateDesc(desc)
    teamRune.set(team)
    return team
  })
}

export async function updateSubmissionRepo(repo: string) {
  return withTeamLoading(async () => {
    const team = await openhackApi.Submissions.updateRepo(repo)
    teamRune.set(team)
    return team
  })
}

export async function updateSubmissionPres(pres: string) {
  return withTeamLoading(async () => {
    const team = await openhackApi.Submissions.updatePres(pres)
    teamRune.set(team)
    return team
  })
}
