import { derived, writable, get } from 'svelte/store'
import type { VotingStatusResponse, Team } from '$types/account.js'
import { openhackApi } from '$lib/api/openhackApi.js'
import { withMinDuration } from '$lib/stores/withMinDuration.js'
import {
  DEFAULT_MIN_DURATION,
  waitMinimumDuration,
} from '$lib/utils/minDuration.js'

/**
 * votingRune store
 * - holds finalists, voting status (hasVoted, votingOpen) from the backend
 * - prevents repeated API calls by caching the data
 */
export const votingRune = writable<VotingStatusResponse | null>(null)
const votingLoadingCounter = writable(0)
export const votingLoadingPending = derived(
  votingLoadingCounter,
  (pending) => pending > 0
)
export const votingLoading = withMinDuration(votingLoadingPending)

const MIN_LOADING_DURATION = DEFAULT_MIN_DURATION

function beginVotingLoading() {
  const pending = get(votingLoadingCounter)
  votingLoadingCounter.set(pending + 1)
  return pending === 0
}

function endVotingLoading() {
  votingLoadingCounter.update((pending) => (pending > 0 ? pending - 1 : 0))
}

async function withVotingLoading<T>(task: () => Promise<T>): Promise<T> {
  const isRoot = beginVotingLoading()
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
    endVotingLoading()
  }
}

/**
 * fetchVotingData()
 * - Purpose: Retrieve finalists and voting status from the backend. Requires Authorization header.
 * - Side effects: sets `votingRune` to the returned payload.
 */
export async function fetchVotingData() {
  return withVotingLoading(async () => {
    const data = await openhackApi.Voting.getStatus()
    votingRune.set(data)
    return data
  })
}

/**
 * castVote(teamID)
 * - Purpose: Cast a vote for a specific team and refresh the voting status in the rune.
 * - Side effects: updates `votingRune` with refreshed voting status including hasVoted flag.
 */
export async function castVote(teamID: string) {
  return withVotingLoading(async () => {
    await openhackApi.Voting.castVote({ teamID })
    // Refresh voting status to update hasVoted flag and store it in the rune
    const updatedData = await openhackApi.Voting.getStatus()
    votingRune.set(updatedData)
    return updatedData
  })
}

/**
 * getFinalists()
 * - Purpose: Get the finalists list from the cached voting rune data.
 * - Returns: Array of finalist teams, or empty array if data hasn't been loaded.
 */
export function getFinalists(): Team[] {
  const data = get(votingRune)
  return data?.finalists || []
}

/**
 * hasUserVoted()
 * - Purpose: Get the user's voting status from the cached rune data.
 * - Returns: true if user has already voted, false otherwise.
 */
export function hasUserVoted(): boolean {
  const data = get(votingRune)
  return data?.hasVoted || false
}

/**
 * isVotingOpen()
 * - Purpose: Check if voting is currently open from the cached rune data.
 * - Returns: true if voting is open, false otherwise.
 */
export function isVotingOpen(): boolean {
  const data = get(votingRune)
  return data?.votingOpen || false
}
