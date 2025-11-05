<script lang="ts">
  import { Card } from '$components/ui/card'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Home as HomeIcon } from '@lucide/svelte'

  export let homeHref = '/'
  export let code = '404'
  export let title = 'Page not found'
  export let description = 'This page might be missing or the link could be outdated.'
</script>

<section
  style="font-family: 'Inter', sans-serif;"
  class="flex min-h-screen items-center justify-center bg-[#000000] px-4 py-12 text-white sm:px-6 lg:px-8"
>
  <div class="relative w-full max-w-lg">
    <div class="pointer-events-none absolute inset-0 -z-10 mx-auto h-[320px] max-w-sm rounded-[40px] bg-gradient-to-b from-[#2F76FF]/12 via-[#2F315B]/8 to-transparent blur-[110px]"></div>
    <Card
      class="relative flex flex-col items-center gap-5 border border-[#2E2E2E] bg-[#171717] px-8 py-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:px-12 sm:py-12"
    >
      <img src="/icons/logo.svg" alt="OpenHack logo" class="h-14 w-auto sm:h-16" />
      <span class="text-6xl font-black tracking-[0.22em] text-white sm:text-7xl">{code}</span>
      <div class="space-y-1.5">
        <h1 class="text-lg font-semibold text-white sm:text-xl">{title}</h1>
        <p class="text-sm text-zinc-400 sm:text-base">{description}</p>
      </div>
      <Button
        href={homeHref}
        class="mt-4 inline-flex w-full max-w-xs items-center justify-center bg-white text-black hover:bg-white/90"
      >
        <HomeIcon class="h-4 w-4" />
        Go back home
      </Button>
    </Card>
  </div>
</section>
