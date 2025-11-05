<script lang="ts">
  import { onMount } from 'svelte'
  import { writable, type Writable } from 'svelte/store'
  import { navigate } from 'svelte5-router'
  import { flagsRune } from '$runes/flagsRune.js'

  interface NavItem {
    label: string
    href: string
    icon: string
    flagRequired?: string
    disabled?: boolean
    matchPaths?: string[]
  }

  const navItemsConfig: NavItem[] = [
    {
      label: 'Profile',
      href: '/',
      icon: '/icons/home_icon.svg',
      disabled: false,
    },
    {
      label: 'Team',
      href: '/team',
      matchPaths: ['/team'],
      icon: '/icons/team_icon.svg',
      flagRequired: 'teams_read',
      disabled: true,
    },
    {
      label: 'Submission',
      href: '/submission',
      icon: '/icons/submissions_icon.svg',
      flagRequired: 'submissions_read',
      disabled: true,
    },
  ]

  const currentPath: Writable<string> = writable('/')

  $: navItems = navItemsConfig.map((item) => ({
    ...item,
    disabled:
      item.disabled === false
        ? false
        : item.flagRequired
          ? !($flagsRune?.flags?.[item.flagRequired] ?? false)
          : item.disabled,
  }))

  onMount(() => {
    const updatePath = () => {
      currentPath.set(window.location.pathname)
    }

    updatePath()
    window.addEventListener('popstate', updatePath)

    return () => {
      window.removeEventListener('popstate', updatePath)
    }
  })

  function handleNavClick(event: MouseEvent, item: NavItem) {
    event.preventDefault()
    if (item.disabled) return

    if (window.location.pathname === item.href) {
      return
    }

    navigate(item.href)
    currentPath.set(item.href)
  }

  $: currentHref = $currentPath

  function isItemActive(item: NavItem, path: string): boolean {
    if (path.startsWith('/vote')) {
      return false
    }
    if (item.matchPaths && item.matchPaths.length > 0) {
      return item.matchPaths.some((matchPath) => {
        if (path === matchPath) return true
        const withSlash = matchPath.endsWith('/') ? matchPath : `${matchPath}/`
        return path.startsWith(withSlash)
      })
    }
    return path === item.href
  }
</script>

<nav
  class="fixed bottom-4 left-1/2 z-50 flex w-[80%] max-w-md -translate-x-1/2 items-center justify-around rounded-3xl border border-white/10 bg-black/40 px-4 py-2 shadow-2xl backdrop-blur-2xl"
  style="backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);"
>
  {#each navItems as item}
    <button
      type="button"
      class={`flex items-center justify-center p-3 transition ${item.disabled ? 'cursor-not-allowed opacity-40' : 'active:scale-95'}`}
      onclick={(event) => handleNavClick(event, item)}
      aria-current={isItemActive(item, currentHref) ? 'page' : undefined}
      aria-disabled={item.disabled ? 'true' : undefined}
      aria-label={item.label}
      disabled={item.disabled}
    >
      <img
        src={item.icon}
        alt=""
        class="h-6 w-6 transition"
        style={`filter: ${
          item.disabled
            ? 'invert(56%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(93%) contrast(90%)'
            : isItemActive(item, currentHref)
              ? 'invert(47%) sepia(98%) saturate(4454%) hue-rotate(352deg) brightness(101%) contrast(99%)'
              : 'invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'
        }`}
      />
    </button>
  {/each}
</nav>
