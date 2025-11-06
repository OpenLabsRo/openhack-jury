<script lang="ts">
  import { Router, Route } from 'svelte5-router'
  import { onMount } from 'svelte'
  import './app.css'
  import { openhackApi } from '$lib/api/openhackApi'
  import { navigate } from 'svelte5-router'
  import { getToken } from '$lib/auth'
  import { initJudgeSession } from '$runes/judgingRune'
  import {
    shouldShowInstallPrompt,
    setupPWAListeners,
  } from '$lib/utils/pwaInitialize'

  // desktop routes
  import DesktopJudge from '$routes/desktop/auth/Judge.svelte'
  import DesktopJudging from '$routes/desktop/Judge.svelte'
  import DesktopTeams from '$routes/desktop/Teams.svelte'
  import DesktopNotFound from '$routes/desktop/auth/NotFound.svelte'

  // mobile routes
  import MobileJudge from '$routes/mobile/auth/Judge.svelte'
  import MobileJudging from '$routes/mobile/Judge.svelte'
  import MobileTeams from '$routes/mobile/Teams.svelte'
  import MobileNotFound from '$routes/mobile/auth/NotFound.svelte'

  // shared components
  import PWAInstallPrompt from '$lib/components/shared/PWAInstallPrompt.svelte'
  import BottomNav from '$lib/components/shared/BottomNav.svelte'

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
        showInstallPrompt = true
      }
    } catch (err) {
      // ignore localStorage/DOM errors in SSR or restricted environments
    }

    let isActive = true

    const run = async () => {
      // Check if there is a token; if not and not on auth page, redirect to 404
      const token = getToken()
      const currentPath =
        typeof window !== 'undefined' ? window.location.pathname : '/'
      const currentSearch =
        typeof window !== 'undefined' ? window.location.search : ''

      // Allow auth page (where token might be in URL) and redirect pages
      const isAuthPage =
        currentPath === '/auth' || currentSearch.includes('token=')
      const isNotFoundPage = currentPath === '/404'

      if (!token && !isAuthPage && !isNotFoundPage) {
        console.log(
          '[App] No token found and not on auth page; redirecting to 404'
        )
        if (isActive) {
          navigate('/404')
          isLoading = false
          return
        }
      }

      // Restore judge session from stored token if available
      if (token) {
        await initJudgeSession()
      }

      const sessionCheck = async () => {
        if (is404Page || !isActive) return

        try {
          // Ping the API to check for connectivity and CORS
          await openhackApi.General.ping()

          let currentPath =
            typeof window !== 'undefined' ? window.location.pathname : '/'
          let currentSearch =
            typeof window !== 'undefined' ? window.location.search : ''

          if (typeof window !== 'undefined') {
            currentPath = window.location.pathname
            currentSearch = window.location.search
          }

          // Check if this is a judge QR code auth request
          if (currentPath === '/auth' && currentSearch.includes('token=')) {
            // Let it go through to the Judge auth route
            return
          }

          // For judge-only app, redirect to 404 if not on auth or home paths
          if (
            currentPath !== '/' &&
            currentPath !== '/auth' &&
            !currentSearch.includes('token=')
          ) {
            navigate('/404')
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
    }
  })
</script>

{#if isLoading}
  <!-- Blank loading state - no shimmer animation for judge experience -->
  <div class="min-h-screen bg-black"></div>
{:else if pingFailed && isDesktop}
  <DesktopNotFound />
{:else if pingFailed && !isDesktop}
  <MobileNotFound />
{:else if isDesktop}
  <Router {url}>
    <Route path="/">
      <DesktopJudging />
    </Route>
    <Route path="/teams">
      <DesktopTeams />
    </Route>
    <Route path="/auth">
      <DesktopJudge />
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
      <MobileJudging />
    </Route>
    <Route path="/teams">
      <MobileTeams />
    </Route>
    <Route path="/auth">
      <MobileJudge />
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
<BottomNav />
<PWAInstallPrompt show={!isLoading && showInstallPrompt} {deferredPrompt} />
