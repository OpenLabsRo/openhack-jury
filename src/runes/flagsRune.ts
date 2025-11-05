import { derived, writable, get } from 'svelte/store'
import type { Flags } from '$types/flags.js'
import { openhackApi } from '$api/openhackApi.js'
import { withMinDuration } from '$lib/stores/withMinDuration.js'
import {
  DEFAULT_MIN_DURATION,
  waitMinimumDuration,
} from '$lib/utils/minDuration.js'

/**
 * flagsRune store
 * - holds feature flags and current stage from the backend
 */
export const flagsRune = writable<Flags | null>(null)
const flagsLoadingCounter = writable(0)
export const flagsLoadingPending = derived(
  flagsLoadingCounter,
  (pending) => pending > 0
)
export const flagsLoading = withMinDuration(flagsLoadingPending)

const MIN_LOADING_DURATION = DEFAULT_MIN_DURATION

function beginFlagsLoading() {
  const pending = get(flagsLoadingCounter)
  flagsLoadingCounter.set(pending + 1)
  return pending === 0
}

function endFlagsLoading() {
  flagsLoadingCounter.update((pending) => (pending > 0 ? pending - 1 : 0))
}

async function withFlagsLoading<T>(task: () => Promise<T>): Promise<T> {
  const isRoot = beginFlagsLoading()
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
    endFlagsLoading()
  }
}

let pollIntervalMs = 1000
let pollHandle: number | null = null

/**
 * configurePolling(ms)
 * - Purpose: adjust the poll interval used by startPolling
 */
export function configurePolling(ms: number) {
  pollIntervalMs = ms
}

/**
 * fetchFlags()
 * - Purpose: Retrieve flags from the backend. Requires Authorization header.
 * - Side effects: sets `flagsRune` to the returned payload.
 */
export async function fetchFlags() {
  return withFlagsLoading(async () => {
    const flags = await openhackApi.Flags.fetch()
    flagsRune.set(flags)
    return flags
  })
}

/**
 * startPolling()
 * - Purpose: Start a periodic poll that calls `fetchFlags` at `pollIntervalMs`.
 * - Behavior: clears any existing timer first. Errors from fetchFlags are swallowed.
 */
export function startPolling() {
  stopPolling()
  pollHandle = setInterval(
    () => fetchFlags().catch(() => {}),
    pollIntervalMs
  ) as unknown as number
}

/**
 * stopPolling()
 * - Purpose: Stop the polling timer if active.
 */
export function stopPolling() {
  if (pollHandle) {
    clearInterval(pollHandle)
    pollHandle = null
  }
}

// Placeholder for websocket subscription; to be implemented when backend
// provides websocket endpoint and event schema. subscribeWs should update
// flagsRune and handle kicked events (redirect/logout) when received.
/**
 * subscribeWs()
 * - Purpose: placeholder API that should return an unsubscribe function.
 * - Current behavior: returns a no-op unsubscribe. Will be implemented when
 *   backend exposes websocket events.
 */
export function subscribeWs() {
  // TODO: implement when backend WS API is available
  return () => {
    /* unsubscribe */
  }
}
