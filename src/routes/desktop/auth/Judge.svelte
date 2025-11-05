<script lang="ts">
  import { onMount } from 'svelte'
  import { navigate } from 'svelte5-router'
  import { upgrade } from '$runes/judgingRune'
  import { setError, errorMessage } from '$runes/errorRune'
  import { inFlightLoading } from '$runes/judgingRune'

  let error: string | null = null

  onMount(async () => {
    // Extract token from query params
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      setError('No token provided')
      error = 'Invalid QR code: missing token'
      return
    }

    try {
      // Upgrade the short token to a full session token
      await upgrade(token)
      // Redirect to the judge judging screen
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
      error = message
    }
  })

  $: if ($errorMessage) {
    error = $errorMessage
  }
</script>

<div class="flex items-center justify-center min-h-screen bg-black">
  {#if $inFlightLoading}
    <div class="text-center">
      <div class="text-white mb-4">
        <div class="w-12 h-12 border-4 border-[#FE5428] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
      <p class="text-white">Authenticating...</p>
    </div>
  {:else if error}
    <div class="text-center max-w-md mx-auto px-4">
      <h1 class="text-xl font-semibold text-white mb-4">Authentication Failed</h1>
      <p class="text-gray-300 mb-6">{error}</p>
      <p class="text-gray-500 text-sm">Please scan a new QR code or contact the organizers.</p>
    </div>
  {/if}
</div>
