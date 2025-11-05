import { writable } from 'svelte/store'
import { isApiError } from '$api/openhackApi'

/**
 * A writable store that holds the current global error message.
 */
export const errorMessage = writable<string | null>(null)

/**
 * Capitalizes the first letter of a string.
 * @param message The string to capitalize.
 * @returns The capitalized string.
 */
function prettifyErrorMessage(message: string): string {
  if (!message) return 'An unexpected error occurred.'
  return message.charAt(0).toUpperCase() + message.slice(1)
}

/**
 * Sets the global error message from an unknown error type.
 * @param error The error caught from a try/catch block.
 */
export function setError(error: unknown) {
  let message: string
  if (isApiError(error)) {
    message = error.message
  } else if (error instanceof Error) {
    message = error.message
  } else {
    message = 'An unexpected error occurred.'
  }
  errorMessage.set(prettifyErrorMessage(message))
}

export function setErrorMessage(message: string) {
  errorMessage.set(prettifyErrorMessage(message))
}

/**
 * Clears the global error message.
 */
export function clearError() {
  errorMessage.set(null)
}
