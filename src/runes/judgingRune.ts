import { derived, writable, get } from 'svelte/store'
import {
  saveToken,
  getToken,
  saveJudgeData,
  getJudgeData,
  removeJudgeData,
} from '$lib/auth.js'
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
export const selectedWinnerRune = writable<string | null>(null)
export const isJudgingFinishedRune = writable<boolean>(false)

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
 * Helper to convert currentTeam from API response (which may be string) to number
 */
function parseCurrentTeam(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseInt(value, 10)
  return -1
}

/**
 * fetchAndUpdateJudgeMe()
 * - Purpose: Fetch fresh judge data from /judge/me and update currentTeam and nextTeamTime in judgeDataRune
 * - Side effects: Updates judgeDataRune.currentTeam and judgeDataRune.nextTeamTime from server
 * - Error modes: Silently returns false if call fails; true if successful
 */
async function fetchAndUpdateJudgeMe(): Promise<boolean> {
  try {
    const meResp = await openhackApi.Judges.me()
    if (!meResp) {
      console.warn('[fetchAndUpdateJudgeMe] /judge/me returned no data')
      return false
    }

    const currentJudge = get(judgeDataRune)
    if (!currentJudge) {
      console.warn('[fetchAndUpdateJudgeMe] No judge data in rune to update')
      return false
    }

    const updatedJudge = {
      id: currentJudge.id,
      name: currentJudge.name,
      pair: currentJudge.pair,
      currentTeam: parseCurrentTeam(meResp.currentTeam),
      nextTeamTime: meResp.nextTeamTime,
    }

    console.log('[judgeDataRune] Updated from /judge/me:', {
      currentTeam: updatedJudge.currentTeam,
      nextTeamTime: updatedJudge.nextTeamTime,
    })

    judgeDataRune.set(updatedJudge)
    saveJudgeData(updatedJudge)
    return true
  } catch (error) {
    console.error(
      '[fetchAndUpdateJudgeMe] Failed to fetch/update judge data:',
      error
    )
    return false
  }
}

/**
 * initJudgeSession()
 * - Purpose: Restore judge session from localStorage and verify with /judge/me on app startup.
 * - Output: Judge data if restoration succeeds, null if no token or restoration fails
 * - Side effects: Populates judgeDataRune, currentTeamRune if judge has active session
 * - Error modes: Returns null silently if no token or API calls fail (non-fatal)
 */
export async function initJudgeSession(): Promise<Judge | null> {
  try {
    const token = getToken()
    if (!token) {
      console.log(
        '[judgingRune] No stored token; skipping judge session restoration'
      )
      return null
    }

    console.log('[judgingRune] Restoring judge session from stored token...')

    // Restore judge data from localStorage (includes name, id, pair, etc.)
    const cachedJudgeData = getJudgeData()
    if (cachedJudgeData) {
      console.log('[judgeDataRune] Initialized from localStorage:', {
        id: cachedJudgeData.id,
        name: cachedJudgeData.name,
        currentTeam: cachedJudgeData.currentTeam,
        nextTeamTime: cachedJudgeData.nextTeamTime,
      })
      judgeDataRune.set(cachedJudgeData as Judge)
    }

    // Refresh judge metadata from server (fetches /judge/me and updates judgeDataRune)
    const meUpdated = await fetchAndUpdateJudgeMe()
    if (!meUpdated) {
      console.warn(
        '[judgingRune] Failed to restore judge session: /judge/me failed'
      )
      return cachedJudgeData || null
    }

    const currentJudge = get(judgeDataRune)

    // Check if judging is finished (currentTeam === 9000)
    if (currentJudge && currentJudge.currentTeam === 9000) {
      console.log(
        '[initJudgeSession] Judging finished detected (currentTeam === 9000)'
      )
      isJudgingFinishedRune.set(true)
      clearError()
      return currentJudge
    }

    // If judge has an active team assignment, restore team details
    if (currentJudge && currentJudge.currentTeam >= 0) {
      try {
        const team = await openhackApi.Judges.currentTeam()
        console.log(
          '[currentTeamRune] Restored from /judge/current-team on startup:',
          {
            id: team.id,
            name: team.name,
            table: team.table,
          }
        )
        currentTeamRune.set(team)

        // Refresh judge metadata after current-team
        await fetchAndUpdateJudgeMe()
      } catch (err) {
        // Non-fatal: at least we have the judge metadata
        console.warn(
          '[currentTeamRune] Failed to restore current team details:',
          err
        )
      }

      // Always restore previous team details (even at currentTeam === 0)
      try {
        const prevTeamResp = await openhackApi.Judges.previousTeam()
        // Check if response is a resting response (has 'message' field) or a team (has 'id' field)
        if (
          prevTeamResp &&
          typeof prevTeamResp === 'object' &&
          'id' in prevTeamResp
        ) {
          const prevTeam = prevTeamResp as Team
          console.log(
            '[previousTeamRune] Restored from /judge/previous-team on startup:',
            {
              id: prevTeam.id,
              name: prevTeam.name,
              table: prevTeam.table,
            }
          )
          previousTeamRune.set(prevTeam)
        } else {
          // Resting response - set previousTeamRune to null (default value)
          console.log(
            '[previousTeamRune] Judge is resting on startup, setting to null'
          )
          previousTeamRune.set(null)
        }
      } catch (err) {
        // Non-fatal: at least we have the current team
        console.warn(
          '[previousTeamRune] Failed to restore previous team details:',
          err
        )
        previousTeamRune.set(null)
      }
    }

    clearError()
    console.log('[initJudgeSession] Returning judge data:', {
      id: currentJudge?.id,
      name: currentJudge?.name,
      currentTeam: currentJudge?.currentTeam,
      pair: currentJudge?.pair,
      nextTeamTime: currentJudge?.nextTeamTime,
    })
    return currentJudge || null
  } catch (error) {
    console.warn('[judgingRune] Failed to restore judge session:', error)
    return null
  }
}

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
    console.log('[judgeDataRune] Initialized from upgrade:', {
      id: judge.id,
      currentTeam: judge.currentTeam,
      nextTeamTime: judge.nextTeamTime,
    })
    judgeDataRune.set(judge)
    saveJudgeData(judge)
    clearError()

    // If judge already has a team assignment, recover its details
    if (judge.currentTeam >= 0) {
      try {
        const team = await openhackApi.Judges.currentTeam()
        console.log('[currentTeamRune] Recovered after upgrade:', {
          id: team.id,
          name: team.name,
          table: team.table,
        })
        currentTeamRune.set(team)

        // Refresh judge metadata after current-team
        await fetchAndUpdateJudgeMe()
      } catch (err) {
        // If recovery fails, at least we have the judge state; don't blow up
        console.error('[currentTeamRune] Failed to recover after upgrade:', err)
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
 * - Purpose: Fetch the next team from the backend rotation and populate currentTeamRune.
 *           Then fetch the previous team and populate previousTeamRune.
 * - Output: The full Team object for the next opponent
 * - Side effects: Updates currentTeamRune with next team, then updates previousTeamRune
 * - Error modes: 410 Gone (judging finished) is not thrown; use detectJudgingFinished to check
 */
export async function getNextTeam() {
  return withInFlightLoading(async () => {
    try {
      // Step 1: Fetch next team and populate currentTeamRune
      const nextResp = await openhackApi.Judges.nextTeam()

      // Determine whether `nextResp` is a Team (has id) or a resting payload (has message).
      if (nextResp && typeof nextResp === 'object' && 'id' in nextResp) {
        const nextTeam = nextResp as Team
        console.log('currentTeamRune updated:', nextTeam)
        currentTeamRune.set(nextTeam)
      } else if (
        nextResp &&
        typeof nextResp === 'object' &&
        'message' in nextResp
      ) {
        // Resting response (202) - clear current team so UI can render a Resting element
        const resting = (nextResp as { message?: string }).message ?? 'Resting'
        console.log('currentTeamRune cleared (resting):', resting)
        currentTeamRune.set(null)
      } else {
        // Unexpected shape - clear current team to be safe
        console.log(
          'currentTeamRune cleared (unexpected nextTeam shape):',
          nextResp
        )
        currentTeamRune.set(null)
      }

      // Step 2: Fetch previous team and populate previousTeamRune
      try {
        const prevResp = await openhackApi.Judges.previousTeam()
        if (prevResp && typeof prevResp === 'object' && 'id' in prevResp) {
          const prevTeam = prevResp as Team
          console.log('previousTeamRune updated:', prevTeam)
          previousTeamRune.set(prevTeam)
        } else {
          // Resting response or unexpected shape - set previousTeamRune to null
          console.log('previousTeamRune set to null')
          previousTeamRune.set(null)
        }
      } catch (err) {
        // Non-fatal: at least we have the current team
        console.warn('[previousTeamRune] Failed to fetch previous team:', err)
        previousTeamRune.set(null)
      }

      // Refresh judge metadata from /judge/me (server is source of truth for currentTeam index)
      await fetchAndUpdateJudgeMe()

      clearError()

      return nextResp
    } catch (error) {
      // Check if this is a 410 (judging finished)
      if (isApiError(error) && error.status === 410) {
        // Judging is finished; caller will detect this
        throw error
      }
      setError(
        error instanceof Error ? error.message : 'Failed to fetch next team'
      )
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
 *   upon success updates currentTeamRune. If next-team returns 410 (judging finished), throws with 410.
 * - Error modes: throws if either call fails
 */
export async function recordJudgment(winnerID: string, loserID: string) {
  return withInFlightLoading(async () => {
    try {
      // Resolve team IDs from runes
      const current = get(currentTeamRune)
      const previous = get(previousTeamRune)

      // Determine which team is the winner and which is the loser
      let winningTeamID: string
      let losingTeamID: string

      if (winnerID === 'current' && current) {
        winningTeamID = current.id
        losingTeamID = previous?.id || loserID
      } else if (winnerID === 'previous' && previous) {
        winningTeamID = previous.id
        losingTeamID = current?.id || loserID
      } else {
        // Fallback to direct IDs if passed
        winningTeamID = winnerID
        losingTeamID = loserID
      }

      // Submit the judgment
      const judgment: Judgment = await openhackApi.Judges.judgment({
        winningTeamID,
        losingTeamID,
      })

      // Automatically fetch the next team
      try {
        // nextTeam may return either a Team (normal case) or a resting payload (202) with { message }.
        const resp = await openhackApi.Judges.nextTeam()

        // Populate or clear current team based on response shape
        if (resp && typeof resp === 'object' && 'id' in resp) {
          const nextTeam = resp as Team
          console.log('currentTeamRune updated:', nextTeam)
          // Store current team as previous before updating
          previousTeamRune.set(get(currentTeamRune))
          currentTeamRune.set(nextTeam)
        } else if (resp && typeof resp === 'object' && 'message' in resp) {
          const resting = (resp as { message?: string }).message ?? 'Resting'
          console.log('currentTeamRune cleared (resting):', resting)
          // Store current team as previous before clearing
          previousTeamRune.set(get(currentTeamRune))
          currentTeamRune.set(null)
        } else {
          console.log(
            'currentTeamRune cleared (unexpected nextTeam shape):',
            resp
          )
          // Store current team as previous before clearing
          previousTeamRune.set(get(currentTeamRune))
          currentTeamRune.set(null)
        }

        // Refresh judge metadata from /judge/me (server is source of truth for currentTeam index)
        await fetchAndUpdateJudgeMe()
      } catch (nextErr) {
        // If next-team fails with 410, judgment was recorded but judging is now finished
        // Propagate the error so caller can detect it
        throw nextErr
      }

      clearError()
      return judgment
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to record judgment'
      )
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
  console.log('[judgeDataRune] Cleared on reset')
  judgeDataRune.set(null as any)
  console.log('[previousTeamRune] Cleared on reset')
  previousTeamRune.set(null)
  console.log('[currentTeamRune] Cleared on reset')
  currentTeamRune.set(null)
  console.log('[selectedWinnerRune] Cleared on reset')
  selectedWinnerRune.set(null)
  console.log('[isJudgingFinishedRune] Cleared on reset')
  isJudgingFinishedRune.set(false)
  removeJudgeData()
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
  flagsPollHandle = setInterval(() => {
    openhackApi.Flags.fetch()
      .then((flags) => flagsRune.set(flags))
      .catch(() => {})
  }, pollIntervalMs) as unknown as number
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
