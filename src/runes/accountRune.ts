import { derived, writable, get } from 'svelte/store'
import { saveToken, removeToken, getToken } from '$lib/auth.js'
import type { Account } from '$types/account.js'
import {
  openhackApi,
  type ApiError,
  isApiError,
  type AccountTokenResponse,
} from '../lib/api/openhackApi.js'
import { withMinDuration } from '$lib/stores/withMinDuration.js'
import {
  DEFAULT_MIN_DURATION,
  waitMinimumDuration,
} from '$lib/utils/minDuration.js'
import { normalizeAccount } from '$lib/utils/normalizeAccount.js'
import { teamRune, teamMembersRune } from './teamRune.js'
import { flagsRune, stopPolling } from './flagsRune.js'
import { clearError } from './errorRune.js'

/**
 * accountRune store
 * - holds the currently authenticated account or null when logged out
 * - updated by `register`, `login`, and `whoami`
 */
export const accountRune = writable<Account | null>(null)

const accountLoadingCounter = writable(0)
export const accountLoadingPending = derived(
  accountLoadingCounter,
  (pending) => pending > 0
)
export const accountLoading = withMinDuration(accountLoadingPending)

const MIN_LOADING_DURATION = DEFAULT_MIN_DURATION

function beginAccountLoading() {
  const pending = get(accountLoadingCounter)
  accountLoadingCounter.set(pending + 1)
  return pending === 0
}

function endAccountLoading() {
  accountLoadingCounter.update((pending) => (pending > 0 ? pending - 1 : 0))
}

async function withAccountLoading<T>(task: () => Promise<T>): Promise<T> {
  const isRoot = beginAccountLoading()
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
    endAccountLoading()
  }
}

/**
 * check(email)
 * - Purpose: Query the backend to determine if an email is registered.
 * - Input: email string
 * - Output: resolved response data, expected shape { registered: boolean }
 * - Side effects: none (does not update accountRune or auth token)
 * - Error modes: throws if the network call fails
 */
export { isApiError, getToken, removeToken }
export type { ApiError }

export async function check(email: string) {
  return withAccountLoading(() => openhackApi.Accounts.check(email))
}

/**
 * register(email, password)
 * - Purpose: Create a new account and sign-in the user.
 * - Input: email, password
 * - Output: the created account object
 * - Side effects: stores auth token (via saveToken) and updates `accountRune`
 * - Error modes: throws if register fails (backend validation, network error)
 */
export async function register(email: string, password: string) {
  return withAccountLoading(async () => {
    const { token, account }: AccountTokenResponse =
      await openhackApi.Accounts.register({
        email,
        password,
      })
    saveToken(token)
    const normalized = normalizeAccount(account)
    accountRune.set(normalized)
    return normalized
  })
}

/**
 * login(email, password)
 * - Purpose: Authenticate an existing user.
 * - Input: email, password
 * - Output: the authenticated account object
 * - Side effects: stores auth token and updates `accountRune`
 * - Error modes: throws on auth failure or network error
 */
export async function login(email: string, password: string) {
  return withAccountLoading(async () => {
    const { token, account }: AccountTokenResponse =
      await openhackApi.Accounts.login({
        email,
        password,
      })
    saveToken(token)
    const normalized = normalizeAccount(account)
    accountRune.set(normalized)
    return normalized
  })
}

/**
 * whoami()
 * - Purpose: Fetch the currently authenticated account from the backend.
 * - Input: none
 * - Output: account object
 * - Side effects: updates `accountRune` with the returned account
 * - Error modes: throws if the token is invalid or network fails
 */
export async function whoami() {
  return withAccountLoading(async () => {
    const account = await openhackApi.Accounts.whoami()
    const normalized = normalizeAccount(account)
    accountRune.set(normalized)
    return normalized
  })
}

/**
 * logout()
 * - Purpose: Clear local auth state and remove token header.
 * - Side effects: removes stored token, clears all runes, and stops polling
 */
export function logout() {
  removeToken()
  accountRune.set(null)
  teamRune.set(null)
  teamMembersRune.set([])
  flagsRune.set(null)
  clearError()
  stopPolling()
}
