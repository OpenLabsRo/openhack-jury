/**
 * Shared utility helpers for enforcing minimum durations on async operations.
 */
export const DEFAULT_MIN_DURATION = 1000

export async function waitMinimumDuration(
  startTime: number,
  duration = DEFAULT_MIN_DURATION
) {
  const elapsed = Date.now() - startTime
  if (elapsed < duration) {
    await new Promise((resolve) => setTimeout(resolve, duration - elapsed))
  }
}
