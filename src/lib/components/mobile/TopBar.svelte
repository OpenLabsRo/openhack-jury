<script lang="ts">
  import { accountRune, logout } from '$runes/accountRune.js'
  import { navigate } from 'svelte5-router'
  import { getProfileGradient, getInitials } from '$lib/utils/profileColor.js'

  let showLogoutModal = false

  $: displayName =
    [$accountRune?.firstName, $accountRune?.lastName]
      .filter((part) => (part ?? '').trim().length > 0)
      .join(' ') || 'Mihai Ionel'
  $: initials = getInitials(displayName)
  $: profileGradient = getProfileGradient($accountRune?.id ?? displayName)

  function openLogoutModal() {
    showLogoutModal = true
  }

  function closeLogoutModal() {
    showLogoutModal = false
  }

  function confirmLogout() {
    logout()
    closeLogoutModal()
    navigate('/auth/check')
  }

  function handleLogoClick() {
    navigate('/')
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && showLogoutModal) {
      event.stopPropagation()
      closeLogoutModal()
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex items-center justify-between bg-black px-6 py-4">
  <button
    type="button"
    class="rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    onclick={handleLogoClick}
    aria-label="Go to home page"
  >
    <img src="/icons/logo-full.svg" alt="OpenHack" class="h-8 w-auto" />
  </button>
  <button
    type="button"
    class="flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium text-white transition active:opacity-70"
    onclick={openLogoutModal}
    aria-haspopup="dialog"
    aria-expanded={showLogoutModal}
  >
    <span class="text-sm">{displayName}</span>
    <div
      class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wide text-white"
      style={`background:${profileGradient}`}
    >
      {initials}
    </div>
  </button>
</div>

{#if showLogoutModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <button
      type="button"
      class="absolute inset-0 z-0 h-full w-full bg-black/70"
      aria-label="Close logout dialog"
      onclick={closeLogoutModal}
    ></button>
    <div
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      aria-describedby="logout-dialog-description"
      class="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[#141414] p-6 text-white shadow-lg shadow-black/40"
    >
      <h2 id="logout-dialog-title" class="text-lg font-semibold text-white">
        Sign out?
      </h2>
      <p id="logout-dialog-description" class="mt-2 text-sm text-zinc-400">
        You will need to log in again to access your OpenHack profile.
      </p>
      <div class="mt-6 flex flex-col gap-3">
        <button
          type="button"
          class="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition active:opacity-70"
          onclick={closeLogoutModal}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-full bg-[#ff3b30] px-5 py-2 text-sm font-semibold text-white transition active:opacity-80"
          onclick={confirmLogout}
        >
          Logout
        </button>
      </div>
    </div>
  </div>
{/if}
