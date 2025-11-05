const TOKEN_KEY = 'auth_token';

/**
 * Saves the authentication token to localStorage.
 * @param token The authentication token to save.
 */
export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Retrieves the authentication token from localStorage.
 * @returns The authentication token, or null if it doesn't exist.
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * Removes the authentication token from localStorage.
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}
