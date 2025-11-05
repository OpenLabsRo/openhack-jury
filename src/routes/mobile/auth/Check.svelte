<script lang="ts">
  import { onMount } from 'svelte'
  import { authEmail } from '$runes/authRune'
  import { accountLoading, check } from '$runes/accountRune'
  import { navigate } from 'svelte5-router'
  import { errorMessage, setError, clearError } from '$runes/errorRune'
  import AuthLeader from '$components/mobile/AuthLeader.svelte'
  import { Input } from "$components/ui/input";
  import Button from '$components/ui/button/button.svelte'
  import {Alert} from '$components/ui/alert'
  import { CircleAlertIcon } from '@lucide/svelte'
  import AlertDescription from '$components/ui/alert/alert-description.svelte'
  import AuthContainer from '$lib/components/mobile/AuthContainer.svelte'
  import LoadingIndicator from '$lib/components/shared/LoadingIndicator.svelte'

  $: $authEmail && clearError();

  let loading = false
  let joinId = ''
  let joinName = ''

  onMount(() => {
    if (typeof window === 'undefined') return
    try {
      const params = new URLSearchParams(window.location.search)
      joinId = params.get('joinId') ?? ''
      joinName = params.get('joinName') ?? ''
    } catch {
      joinId = ''
      joinName = ''
    }
  })

  async function handleSubmit(event: Event) {
    event.preventDefault()
    clearError() // Clear previous errors
    try {
      const { registered } = await check($authEmail)
      const nextParams = new URLSearchParams()
      if (joinId) nextParams.set('joinId', joinId)
      if (joinName) nextParams.set('joinName', joinName)
      const suffix = nextParams.toString()

      if (registered) {
        navigate(suffix ? `/auth/login?${suffix}` : '/auth/login')
      } else {
        navigate(suffix ? `/auth/register?${suffix}` : '/auth/register')
      }
    } catch (error) {
      setError(error)
    }
  }
</script>

<style>
  p {
    color: var(--secondary-text);
    text-align: center;
    font-size: 14px;
  }

  a {
    color: var(--secondary-text);
    text-decoration: underline;
  }

  .spacer {
    height: 20px;
  }

</style>

<AuthContainer>
  <AuthLeader
    title="OpenHack Registration"
    subtitle="Enter your email below to continue"
  />

  <form on:submit={handleSubmit}>
    <br>
    <Input
      id="email"
      type="email"
      bind:value={$authEmail}
      placeholder="example@openhack.ro"
      autofocus
    />
    <div class="spacer"></div> 
    {#if $errorMessage}
      <Alert variant="destructive" size="default">
        <CircleAlertIcon />
        <AlertDescription>{$errorMessage}</AlertDescription>
        <!-- <AlertDescription>Account not initialized - talk to the administrator</AlertDescription> -->
      </Alert>
      <div class="spacer"></div> 
    {/if}
    <Button
      type="submit"
      class="w-full"
      aria-busy={$accountLoading}
      disabled={$accountLoading}
    >
      {#if $accountLoading} 
        <LoadingIndicator size={28} duration={0.5} />
      {:else}
        Continue
      {/if}
    </Button>

    <p>
      By clicking "Continue", you agree to our
      <a href="https://tos.openhack.ro" target="_blank" rel="noopener noreferrer">Terms of Service</a>
      and
      <a href="https://privacy.openhack.ro" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
    </p>

  </form>
  
 
</AuthContainer>
