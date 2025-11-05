<script lang="ts">
  import { onMount } from 'svelte';
  import { authEmail } from '$runes/authRune';
  import { accountLoading, login } from '$runes/accountRune';
  import { navigate } from 'svelte5-router';
  import { errorMessage, setError, clearError } from '$runes/errorRune';
  import AuthLeader from '$lib/components/desktop/AuthLeader.svelte';
  import { Input } from "$components/ui/input";
  import Button from '$lib/components/ui/button/button.svelte'
  import { Alert } from '$lib/components/ui/alert'
  import { CircleAlertIcon } from '@lucide/svelte'
  import AlertDescription from '$lib/components/ui/alert/alert-description.svelte'
  import AuthContainer from '$lib/components/desktop/AuthContainer.svelte'
  import LoadingIndicator from '$lib/components/shared/LoadingIndicator.svelte'

  let password = '';
  let joinId = '';
  let joinName = '';

  onMount(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      joinId = params.get('joinId') ?? '';
      joinName = params.get('joinName') ?? '';
    } catch {
      joinId = '';
      joinName = '';
    }
  });

  async function handleSubmit(event: Event) {
    event.preventDefault();
    clearError();
    try {
      await login($authEmail, password);
      const nextParams = joinId ? new URLSearchParams({ id: joinId }) : null;
      if (nextParams && joinName) {
        nextParams.set('name', joinName);
      }
      const target = nextParams ? `/join?${nextParams.toString()}` : '/';
      navigate(target); // Redirect after login
    } catch (error) {
      setError(error);
    }
  }
</script>

<style>
  .spacer {
    height: 10px;
  }
</style>

<AuthContainer>
  <AuthLeader
    title="Welcome Back!"
    subtitle="Enter your password below to login"
  />

  <form on:submit={handleSubmit}>
    <br>
    <Input
      id="email"
      type="email"
      bind:value={$authEmail}
      placeholder="example@openhack.ro"
      disabled
    />
    <div class="spacer"></div>
    <Input
      id="password"
      type="password"
      bind:value={password}
      placeholder="Your password"
      autofocus
    />
    <div class="spacer"></div> 
    <Button
      type="submit"
      class="w-full"
      aria-busy={$accountLoading}
      disabled={$accountLoading}
    >
      {#if $accountLoading} 
        <LoadingIndicator size={28} duration={0.5} />
      {:else}
        Login
      {/if}
    </Button>
    <div class="spacer"></div>
    <div class="spacer"></div>
    {#if $errorMessage}
      <Alert variant="destructive" size="default">
        <CircleAlertIcon />
        <AlertDescription class="justify-self-start text-left">
          {$errorMessage}
        </AlertDescription>
      </Alert>
    {/if}

  </form>
</AuthContainer>
