<script lang="ts">
  import { Router, Route } from 'svelte5-router'
  import { onMount } from 'svelte'
  import './app.css'
  import { openhackApi } from '$lib/api/openhackApi'
  import {
    accountRune,
    getToken,
    whoami,
    removeToken,
  } from '$runes/accountRune'
  import { navigate } from 'svelte5-router'
  import {
    fetchFlags,
    startPolling as startFlagPolling,
    stopPolling as stopFlagPolling,
  } from '$runes/flagsRune'
  import {
    shouldShowInstallPrompt,
    setupPWAListeners,
    isRunningAsPWA,
  } from '$lib/utils/pwaInitialize'

  // desktop routes
  import DesktopIndex from '$routes/desktop/Index.svelte'
  // @ts-ignore: resolution may point to generated .d.svelte.ts with an unusual extension
  import DesktopTeam from '$routes/desktop/Team.svelte'
  import DesktopSubmissions from '$routes/desktop/Submissions.svelte'
  import DesktopQrTest from '$routes/desktop/QrTest.svelte'
  import DesktopJoin from '$routes/desktop/Join.svelte'
  import DesktopVote from '$routes/desktop/Vote.svelte'
  import DesktopCheck from '$routes/desktop/auth/Check.svelte'
  import DesktopRegister from '$routes/desktop/auth/Register.svelte'
  import DesktopLogin from '$routes/desktop/auth/Login.svelte'
  import DesktopNotFound from '$routes/desktop/auth/NotFound.svelte'

  // mobile routes
  import MobileIndex from '$routes/mobile/Index.svelte'
  import MobileTeam from '$routes/mobile/Team.svelte'
  import MobileSubmissions from '$routes/mobile/Submissions.svelte'
  import MobileCheck from '$routes/mobile/auth/Check.svelte'
  import MobileRegister from '$routes/mobile/auth/Register.svelte'
  import MobileLogin from '$routes/mobile/auth/Login.svelte'
  import MobileJoin from '$routes/mobile/Join.svelte'
  import MobileVote from '$routes/mobile/Vote.svelte'
  import MobileNotFound from '$routes/mobile/auth/NotFound.svelte'

  // shared components
  import Loading from '$lib/components/shared/Loading.svelte'
  import PWAInstallPrompt from '$lib/components/shared/PWAInstallPrompt.svelte'

  export let url = ''
  let isAuthPage = false
  let is404Page = false

  $: isAuthPage = url.startsWith('/auth')
  $: is404Page = url.startsWith('/404')

  function checkDesktop(): boolean {
    if (typeof window === 'undefined') return true // assume desktop during SSR

    const mqWidth = window.matchMedia('(min-width: 768px)').matches
    const mqHover = window.matchMedia('(hover: hover)').matches
    const mqPointer = window.matchMedia('(pointer: fine)').matches

    return mqWidth && (mqHover || mqPointer)
  }

  let isLoading = true
  let pingFailed = false
  let isDesktop = true
  let deferredPrompt: any = null
  let showInstallPrompt = false
  let accountUnsubscribe: (() => void) | null = null
  let flagsPollingActive = false

  onMount(() => {
    isDesktop = checkDesktop()

    // Setup PWA install listeners
    const cleanupPWAListeners = setupPWAListeners((event) => {
      deferredPrompt = event
      if (shouldShowInstallPrompt()) {
        showInstallPrompt = true
      }
    })

    // If no beforeinstallprompt event has fired yet, still show the modal on first load
    // when the heuristics say we should show it (platform-agnostic fallback)
    try {
      const params =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : null
      const forceShow = params?.get('showPwa') === '1'
      if (forceShow || shouldShowInstallPrompt()) {
        // show a modal immediately; deferredPrompt may be null (handled by the component)
        showInstallPrompt = true
      }
    } catch (err) {
      // ignore localStorage/DOM errors in SSR or restricted environments
    }

    let isActive = true
    accountUnsubscribe = accountRune.subscribe((account) => {
      if (account && !flagsPollingActive) {
        flagsPollingActive = true
        void fetchFlags().catch(() => {})
        startFlagPolling()
      } else if (!account && flagsPollingActive) {
        stopFlagPolling()
        flagsPollingActive = false
      }
    })

    const run = async () => {
      const sessionCheck = async () => {
        if (is404Page || !isActive) return

        try {
          // Ping the API to check for connectivity and CORS
          await openhackApi.General.ping()

          const token = getToken()

          if (token) {
            let currentPath =
              typeof window !== 'undefined' ? window.location.pathname : '/'
            let currentSearch =
              typeof window !== 'undefined' ? window.location.search : ''

            if (typeof window !== 'undefined') {
              currentPath = window.location.pathname
              currentSearch = window.location.search
            }

            if (currentPath.startsWith('/auth')) {
              try {
                const params = new URLSearchParams(currentSearch)
                const joinId = params.get('joinId')
                const joinName = params.get('joinName')
                if (joinId) {
                  const target = new URLSearchParams({ id: joinId })
                  if (joinName) {
                    target.set('name', joinName)
                  }
                  navigate(`/join?${target.toString()}`)
                } else {
                  navigate('/')
                }
              } catch {
                navigate('/')
              }
            }
            // If a token exists, try to fetch the user's account data to restore the session
            try {
              await whoami()
              // After successful whoami, fetch flags for the user
              await fetchFlags()
            } catch (error) {
              console.error('Failed to restore session:', error)
              // If the token is invalid, remove it and redirect to the login page
              removeToken()
              if (!isAuthPage) {
                navigate('/auth/check')
              }
            }
          } else if (!isAuthPage) {
            // If no token, redirect to auth check
            let currentPath =
              typeof window !== 'undefined' ? window.location.pathname : '/'
            let currentSearch =
              typeof window !== 'undefined' ? window.location.search : ''

            if (typeof window !== 'undefined') {
              currentPath = window.location.pathname
              currentSearch = window.location.search
            }

            if (currentPath === '/join') {
              try {
                const params = new URLSearchParams(currentSearch)
                const joinId = params.get('id')
                const joinName = params.get('name')
                if (joinId) {
                  const target = new URLSearchParams({ joinId })
                  if (joinName) {
                    target.set('joinName', joinName)
                  }
                  navigate(`/auth/check?${target.toString()}`)
                } else {
                  navigate('/auth/check')
                }
              } catch {
                navigate('/auth/check')
              }
            } else {
              navigate('/auth/check')
            }
          }
        } catch (error) {
          console.error('API Ping failed:', error)
          pingFailed = true
          navigate('/404')
          return
        }
      }

      const minimumWait = new Promise((resolve) => setTimeout(resolve, 300))

      try {
        await Promise.all([sessionCheck(), minimumWait])
      } finally {
        if (isActive) isLoading = false
      }
    }

    void run()

    // cleanup listeners when component is destroyed
    return () => {
      isActive = false
      cleanupPWAListeners()
      if (accountUnsubscribe) {
        accountUnsubscribe()
        accountUnsubscribe = null
      }
      if (flagsPollingActive) {
        stopFlagPolling()
        flagsPollingActive = false
      }
    }
  })
</script>

{#if isLoading}
  <Loading />
{:else if pingFailed && isDesktop}
  <DesktopNotFound />
{:else if pingFailed && !isDesktop}
  <MobileNotFound />
{:else if isDesktop}
  <Router {url}>
    <Route path="/">
      <DesktopIndex />
    </Route>
    <Route path="/team">
      <DesktopTeam />
    </Route>
    <Route path="/vote">
      <DesktopVote />
    </Route>
    <Route path="/submission">
      <DesktopSubmissions />
    </Route>
    <Route path="/join">
      <DesktopJoin />
    </Route>
    <Route path="/qr-test">
      <DesktopQrTest />
    </Route>
    <Route path="/auth/check">
      <DesktopCheck />
    </Route>
    <Route path="/auth/register">
      <DesktopRegister />
    </Route>
    <Route path="/auth/login">
      <DesktopLogin />
    </Route>
    <Route path="/404">
      <DesktopNotFound />
    </Route>
    <Route path="*">
      <DesktopNotFound />
    </Route>
  </Router>
{:else}
  <Router {url}>
    <Route path="/">
      <MobileIndex />
    </Route>
    <Route path="/team">
      <MobileTeam />
    </Route>
    <Route path="/vote">
      <MobileVote />
    </Route>
    <Route path="/submission">
      <MobileSubmissions />
    </Route>
    <Route path="/join">
      <MobileJoin />
    </Route>
    <Route path="/auth/check">
      <MobileCheck />
    </Route>
    <Route path="/auth/register">
      <MobileRegister />
    </Route>
    <Route path="/auth/login">
      <MobileLogin />
    </Route>
    <Route path="/404">
      <MobileNotFound />
    </Route>
    <Route path="*">
      <MobileNotFound />
    </Route>
  </Router>
{/if}

<!-- PWA Install Prompt Modal -->
<PWAInstallPrompt show={!isLoading && showInstallPrompt} {deferredPrompt} />
