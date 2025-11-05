/**
 * PWA Initialization and Detection Utilities
 * Handles PWA installation prompts, detection, and state management
 */

const INSTALL_SHOWN_KEY = 'pwa-install-shown'

/**
 * Checks if the app is currently running as a Progressive Web App (installed)
 * @returns true if running as PWA, false otherwise
 */
export function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') return false

  return (
    // Chrome, Edge, Firefox on Android
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari on iOS
    // @ts-ignore
    navigator.standalone === true ||
    // Android app context
    document.referrer.includes('android-app://')
  )
}

/**
 * Checks if the install prompt has already been shown to this user
 * @returns true if already shown, false otherwise
 */
export function hasInstallPromptBeenShown(): boolean {
  try {
    return !!localStorage.getItem(INSTALL_SHOWN_KEY)
  } catch {
    return false
  }
}

/**
 * Marks the install prompt as shown in localStorage
 */
export function markInstallPromptAsShown(): void {
  try {
    localStorage.setItem(INSTALL_SHOWN_KEY, '1')
  } catch {
    // ignore localStorage errors during SSR or private browsing
  }
}

/**
 * Determines whether the PWA install prompt should be shown
 * @returns true if prompt should be shown, false otherwise
 */
export function shouldShowInstallPrompt(): boolean {
  return !isRunningAsPWA() && !hasInstallPromptBeenShown()
}

/**
 * Sets up PWA install event listeners
 * @param onPromptReady Callback when beforeinstallprompt event fires
 * @returns Cleanup function to remove event listeners
 */
export function setupPWAListeners(
  onPromptReady: (event: Event) => void
): () => void {
  const beforeHandler = (e: Event) => {
    // Note: browsers may or may not fire this event depending on installability heuristics
    console.info('[PWA] beforeinstallprompt event received')
    e.preventDefault?.()
    onPromptReady(e)
  }

  const appinstalledHandler = () => {
    console.info('[PWA] appinstalled event received')
    markInstallPromptAsShown()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', beforeHandler)
    window.addEventListener('appinstalled', appinstalledHandler)
  }

  // Return cleanup function
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeinstallprompt', beforeHandler)
      window.removeEventListener('appinstalled', appinstalledHandler)
    }
  }
}

/**
 * Triggers the PWA install prompt
 * @param deferredPrompt The deferred beforeinstallprompt event
 * @returns Promise resolving to the user's choice
 */
export async function triggerPWAInstall(deferredPrompt: any): Promise<any> {
  if (!deferredPrompt) return null

  try {
    deferredPrompt.prompt?.()
    const choice = await deferredPrompt.userChoice
    markInstallPromptAsShown()
    return choice
  } catch (err) {
    console.warn('PWA install prompt failed:', err)
    return null
  }
}
