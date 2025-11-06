const TOKEN_KEY = 'auth_token'
const JUDGE_DATA_KEY = 'judge_data'

/**
 * Saves the authentication token to localStorage.
 * @param token The authentication token to save.
 */
export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_KEY, token)
  }
}

/**
 * Saves judge data to localStorage.
 * @param judgeData The judge data to save.
 */
export function saveJudgeData(judgeData: any): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(JUDGE_DATA_KEY, JSON.stringify(judgeData))
  }
}

/**
 * Retrieves the authentication token from localStorage.
 * @returns The authentication token, or null if it doesn't exist.
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(TOKEN_KEY)
  }
  return null
}

/**
 * Retrieves judge data from localStorage.
 * @returns The judge data, or null if it doesn't exist.
 */
export function getJudgeData(): any | null {
  if (typeof window !== 'undefined') {
    const data = window.localStorage.getItem(JUDGE_DATA_KEY)
    return data ? JSON.parse(data) : null
  }
  return null
}

/**
 * Removes the authentication token from localStorage.
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}

/**
 * Removes judge data from localStorage.
 */
export function removeJudgeData(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(JUDGE_DATA_KEY)
  }
}
