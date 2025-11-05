<script lang="ts">
  import { triggerPWAInstall, markInstallPromptAsShown } from '$lib/utils/pwaInitialize'

  interface Props {
    show: boolean
    deferredPrompt: any
  }

  let { show = false, deferredPrompt }: Props = $props()

  // local reactive state
  let isInstalling = $state(false)
  let isDismissing = $state(false)
  let showInstructions = $state(false)

  // Toggle body class to prevent background scroll when modal is open
  $effect(() => {
    try {
      if (show) document.body.classList.add('pwa-modal-open')
      else document.body.classList.remove('pwa-modal-open')
    } catch (err) {
      // ignore in SSR or restricted environments
    }

    // cleanup when component unmounts or effect re-runs
    return () => {
      try {
        document.body.classList.remove('pwa-modal-open')
      } catch (err) {}
    }
  })

  async function handleInstall() {
    if (isInstalling) return
    isInstalling = true
    try {
      if (deferredPrompt && typeof deferredPrompt.prompt === 'function') {
        // Call prompt() directly from the click handler call stack so browsers treat it as a user gesture.
        try {
          // @ts-ignore
          deferredPrompt.prompt()
          // @ts-ignore
          const choice = await deferredPrompt.userChoice
          // mark as shown regardless of choice
          markInstallPromptAsShown()
          show = false
          return choice
        } catch (err) {
          console.warn('deferredPrompt prompt failed:', err)
        }
      }

      // No native prompt available or prompt failed — show manual instructions fallback
      showInstructions = true
    } finally {
      isInstalling = false
    }
  }

  function handleDismiss(markShown: boolean = true) {
    if (isDismissing) return
    isDismissing = true
    try {
      if (markShown) markInstallPromptAsShown()
    } catch (err) {}
    showInstructions = false
    show = false
  }

  function handleDoneFromInstructions() {
    // user followed the manual instructions or dismissed them
    markInstallPromptAsShown()
    showInstructions = false
    show = false
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      // don't mark the prompt as shown when user casually clicks outside
      handleDismiss(false)
    }
  }

  // Best-effort: when modal opens and we have a deferred prompt, try to show it.
  // Browsers may block programmatic prompts; this is a helpful best-effort.
  $effect(() => {
    if (show && deferredPrompt) {
      // Attempt an automatic prompt after a very short delay to allow the modal to render.
      // We don't await this here because browsers may block it.
      void (async () => {
        try {
          await triggerPWAInstall(deferredPrompt)
          // If install prompt completed, mark the modal as dismissed
          show = false
        } catch (err) {
          // ignore failures (user agent blocking or other errors)
        }
      })()
    }

    return () => {}
  })
</script>

{#if show}
  <!-- Backdrop (more opaque, higher z) -->
  <div
    class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm transition-opacity duration-200"
    role="presentation"
    onclick={handleBackdropClick}
    onkeydown={(e) => {
      if (e.key === 'Escape') handleDismiss()
    }}
  ></div>

  <!-- Modal (flat minimal, higher z and more opaque) -->
  <div class="fixed inset-0 z-60 flex items-center justify-center p-4">
    <div class="w-full max-w-sm rounded-xl bg-white/8 border border-white/8 p-6 text-white shadow-2xl backdrop-saturate-120">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold">Install OpenHack</h3>
          <p class="mt-1 text-sm text-zinc-300">For the best experience we recommend installing the app</p>
          
        </div>
      </div>

  {#if deferredPrompt && typeof deferredPrompt.prompt === 'function' && !showInstructions}
        <div class="mt-4 flex gap-3">
          <button
            class="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            onclick={handleInstall}
            disabled={isInstalling}
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </button>
          <button
            class="flex-1 rounded-md border border-white/6 bg-transparent px-3 py-2 text-sm text-white/90 hover:bg-white/2"
            onclick={() => handleDismiss(true)}
          >
            Maybe later
          </button>
        </div>
      {:else}
        <!-- Show manual instructions when native prompt is not available or prompt failed -->
        <div class="mt-4 text-xs text-zinc-300">
          <ol class="list-decimal ml-5 space-y-2">
            <li>Open your browser menu (⋯ or share icon).</li>
            <li>Select "Add to Home screen" or "Install".</li>
            <li>Confirm to add the app to your device.</li>
          </ol>

          <div class="mt-4">
            <button
              class="w-full rounded-md border border-white/6 bg-transparent px-3 py-2 text-sm text-white/90 hover:bg-white/2"
              onclick={handleDoneFromInstructions}
            >
              Done
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(body) {
    overflow-y: auto;
  }

  :global(body.pwa-modal-open) {
    overflow: hidden;
  }
</style>
