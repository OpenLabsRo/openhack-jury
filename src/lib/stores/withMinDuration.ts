import { derived, type Readable } from 'svelte/store'
import { DEFAULT_MIN_DURATION } from '$lib/utils/minDuration.js'

/**
 * Ensures a boolean store stays `true` for at least `duration` milliseconds
 * after the most recent transition to true. Prevents quick flicker on loaders.
 */
export function withMinDuration(
  source: Readable<boolean>,
  duration = DEFAULT_MIN_DURATION
): Readable<boolean> {
  let startedAt = 0
  let timeout: ReturnType<typeof setTimeout> | null = null
  let active = false

  return derived(
    source,
    ($source, set) => {
      if ($source) {
        if (timeout) {
          clearTimeout(timeout)
          timeout = null
        }
        startedAt = Date.now()
        active = true
        set(true)
      } else if (!active) {
        set(false)
      } else {
        const elapsed = Date.now() - startedAt
        if (elapsed >= duration) {
          active = false
          set(false)
        } else {
          if (timeout) {
            clearTimeout(timeout)
          }
          timeout = setTimeout(() => {
            timeout = null
            active = false
            set(false)
          }, duration - elapsed)
        }
      }

      return () => {
        if (timeout) {
          clearTimeout(timeout)
          timeout = null
        }
      }
    },
    false
  )
}
