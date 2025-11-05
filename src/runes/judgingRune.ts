import { derived, writable, get } from 'svelte/store'
import { saveToken, getToken } from '$lib/auth.js'
import {
  openhackApi,
  type ApiError,
  isApiError,
} from '../lib/api/openhackApi.js'
import type {
  Judge,
  Team,
  JudgeUpgradeResponse,
  Judgment,
} from '$types/judge.js'
import { withMinDuration } from '$lib/stores/withMinDuration.js'
import {
  DEFAULT_MIN_DURATION,
  waitMinimumDuration,
} from '$lib/utils/minDuration.js'
import { setError, clearError } from './errorRune.js'
import { flagsRune } from './flagsRune.js'

/**
 * judgingRune store
 * - holds the current judge session state and teams during judging flow
 */
export const judgeDataRune = writable<Judge | null>(null)
export const currentTeamRune = writable<Team | null>(null)
export const previousTeamRune = writable<Team | null>(null)

const inFlightCounter = writable(0)
export const inFlightLoadingPending = derived(
  inFlightCounter,
  (pending) => pending > 0
)
export const inFlightLoading = withMinDuration(inFlightLoadingPending)

const MIN_LOADING_DURATION = DEFAULT_MIN_DURATION

function beginInFlightLoading() {
  const pending = get(inFlightCounter)
  inFlightCounter.set(pending + 1)
  return pending === 0
}

function endInFlightLoading() {
  inFlightCounter.update((pending) => (pending > 0 ? pending - 1 : 0))
}

async function withInFlightLoading<T>(task: () => Promise<T>): Promise<T> {
  const isRoot = beginInFlightLoading()
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
    endInFlightLoading()
  }
}

export { isApiError, getToken }
export type { ApiError }

/**
 * upgrade(token)
 * - Purpose: Exchange a short QR token for a full 24-hour judge session token.
 * - Input: short connect token from QR code query param
 * - Output: Judge data and new bearer token
 * - Side effects: stores new bearer token, updates judgeDataRune, and if currentTeam >= 0
 *   calls getJudgeCurrent to populate currentTeamRune before returning
 * - Error modes: throws if upgrade fails or token is invalid (401)
 */
export async function upgrade(qrToken: string) {
  return withInFlightLoading(async () => {
    const { token, judge }: JudgeUpgradeResponse =
      await openhackApi.Judges.upgrade({ token: qrToken })

    // Store the new bearer token
    saveToken(token)
    judgeDataRune.set(judge)
    clearError()

    // If judge already has a team assignment, recover its details
    if (judge.currentTeam >= 0) {
      try {
        const team = await openhackApi.Judges.currentTeam()
        currentTeamRune.set(team)
      } catch (err) {
        // If recovery fails, at least we have the judge state; don't blow up
        console.error('Failed to recover current team after upgrade:', err)
      }
    }

    return judge
  })
}

/**
 * startJudging()
 * - Purpose: Initiate judging by fetching the first team assignment.
 * - Output: The first team ID assigned
 * - Side effects: calls getNextTeam internally
 * - Error modes: throws if POST /judge/next-team fails or judging is finished (410)
 */
export async function startJudging() {
  return getNextTeam()
}

/**
 * getNextTeam()
 * - Purpose: Fetch the next team ID from the backend rotation.
 * - Output: The team ID of the next opponent
 * - Side effects: If not the first call, rotates currentTeam → previousTeam and fetches new current
 * - Error modes: 410 Gone (judging finished) is not thrown; use detectJudgingFinished to check
 */
export async function getNextTeam() {
  return withInFlightLoading(async () => {
    try {
      const response = await openhackApi.Judges.nextTeam()
      const nextTeamId = response.teamID

      // Fetch full team details
      const nextTeam = await openhackApi.Judges.team(nextTeamId)

      // Rotate: current becomes previous, new becomes current
      const current = get(currentTeamRune)
      if (current) {
        previousTeamRune.set(current)
      }
      currentTeamRune.set(nextTeam)
      clearError()

      return nextTeam
    } catch (error) {
      // Check if this is a 410 (judging finished)
      if (isApiError(error) && error.status === 410) {
        // Judging is finished; caller will detect this
        throw error
      }
      setError(error instanceof Error ? error.message : 'Failed to fetch next team')
      throw error
    }
  })
}

/**
 * recordJudgment(winner, loser)
 * - Purpose: Submit a judgment comparing two teams and automatically fetch the next team.
 * - Input: winning team ID and losing team ID
 * - Output: The Judgment record (confirmation)
 * - Side effects: POSTs judgment, then POSTs next-team, holding a single loading state for both;
 *   upon success rotates teams. If next-team returns 410 (judging finished), throws with 410.
 * - Error modes: throws if either call fails
 */
export async function recordJudgment(winnerID: string, loserID: string) {
  return withInFlightLoading(async () => {
    try {
      // Submit the judgment
      const judgment: Judgment = await openhackApi.Judges.judgment({
        winningTeamID: winnerID,
        losingTeamID: loserID,
      })

      // Automatically fetch the next team
      try {
        const response = await openhackApi.Judges.nextTeam()
        const nextTeamId = response.teamID
        const nextTeam = await openhackApi.Judges.team(nextTeamId)

        // Rotate teams
        const current = get(currentTeamRune)
        if (current) {
          previousTeamRune.set(current)
        }
        currentTeamRune.set(nextTeam)
      } catch (nextErr) {
        // If next-team fails with 410, judgment was recorded but judging is now finished
        // Propagate the error so caller can detect it
        throw nextErr
      }

      clearError()
      return judgment
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to record judgment')
      throw error
    }
  })
}

/**
 * detectJudgingFinished(error)
 * - Purpose: Helper to check if an error indicates judging is finished (410).
 * - Input: ApiError from any judge operation
 * - Output: true if status === 410, false otherwise
 */
export function detectJudgingFinished(error: unknown): boolean {
  return isApiError(error) && error.status === 410
}

/**
 * reset()
 * - Purpose: Clear all judging state (used on logout or navigation away)
 * - Side effects: clears all judge stores
 */
export function reset() {
  judgeDataRune.set(null)
  currentTeamRune.set(null)
  previousTeamRune.set(null)
}

// Flag polling for judge experience
let flagsPollHandle: number | null = null

/**
 * startFlagsPolling(pollIntervalMs)
 * - Purpose: Start polling for flags every 500ms (or custom interval)
 * - Behavior: Fetches /accounts/flags and updates flagsRune
 * - Errors are silently swallowed
 */
export function startFlagsPolling(pollIntervalMs: number = 500) {
  stopFlagsPolling()
  
  // Fetch immediately on start
  openhackApi.Flags.fetch()
    .then((flags) => flagsRune.set(flags))
    .catch(() => {})
  
  // Then poll at the specified interval
  flagsPollHandle = setInterval(
    () => {
      openhackApi.Flags.fetch()
        .then((flags) => flagsRune.set(flags))
        .catch(() => {})
    },
    pollIntervalMs
  ) as unknown as number
}

/**
 * stopFlagsPolling()
 * - Purpose: Stop the flags polling if active
 */
export function stopFlagsPolling() {
  if (flagsPollHandle) {
    clearInterval(flagsPollHandle)
    flagsPollHandle = null
  }
}
