<script lang="ts">
  import { onMount } from 'svelte'
  import Navbar from '$lib/components/mobile/Navbar.svelte'
  import TopBar from '$lib/components/mobile/TopBar.svelte'
  import VoteBanner from '$lib/components/shared/VoteBanner.svelte'
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '$components/ui/card'
  import { Input } from '$components/ui/input'
  import { Mail as MailIcon, Phone as PhoneIcon } from '@lucide/svelte'
  import { accountRune } from '$runes/accountRune.js'
  import { teamRune, getTeam } from '$runes/teamRune.js'
  import { isApiError } from '$lib/api/openhackApi'
  import { getProfileGradient, getInitials } from '$lib/utils/profileColor.js'
  import QRCode from '$lib/components/shared/QRCode.svelte'

  let qrData = 'openhack-participant'

  onMount(() => {
    let isActive = true

    const ensureTeam = async () => {
      if (!$teamRune) {
        try {
          await getTeam()
        } catch (error) {
          if (!isActive) return
          if (
            isApiError(error) &&
            (error.status === 404 || error.status === 403)
          ) {
            // Team is unavailable; rune already reflects this.
          } else {
            console.error('Failed to fetch team detail:', error)
          }
        }
      }
    }

    void ensureTeam()

    return () => {
      isActive = false
    }
  })

  $: teamName = $teamRune?.name ?? ''
  $: firstName = $accountRune?.firstName?.trim() || 'Mihai'
  $: lastName = $accountRune?.lastName?.trim() || 'Ionel'
  $: displayName =
    [firstName, lastName].filter(Boolean).join(' ') || 'Mihai Ionel'
  $: email = $accountRune?.email ?? 'mihai.ionel@openlabs.ro'
  $: phoneNumber = $accountRune?.phoneNumber ?? '07356436232'
  $: university = $accountRune?.university ?? 'UPB FILS CTI'
  $: extraField = formatDate($accountRune?.dob)
  $: profileGradient = getProfileGradient($accountRune?.id ?? displayName)
  $: qrData = $accountRune?.id ?? 'openhack-participant'
  $: initials = getInitials(displayName)

  function truncateEnd(value: string | undefined | null, max = 25) {
    if (!value) return ''
    if (value.length <= max) return value
    return value.slice(0, max - 1) + '…'
  }

  function formatDate(value: string | undefined | null): string {
    if (!value) return ''
    // Backend sends dates in dd.mm.yyyy format
    const parts = value.split('.')
    if (parts.length !== 3) return ''
    const day = parts[0]
    const month = parseInt(parts[1], 10)
    const year = parts[2]

    const date = new Date(Number(year), month - 1, Number(day))
    return date.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
</script>

<main class="min-h-screen bg-black pb-28 text-white">
  <TopBar />
  <!-- Content -->
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-4">
    <VoteBanner />
    <Card class="p-5">
      <div class="flex flex-col gap-6">
        <div class="flex items-center gap-6">
          <div
            class="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-full text-5xl font-bold text-white"
            style={`background:${profileGradient}`}
          >
            {initials}
          </div>
          <div class="flex-1 space-y-2.5 text-left">
            <div>
              <h2 class="text-xl font-semibold text-white">{displayName}</h2>
              {#if teamName}
                <p class="text-sm text-zinc-400">Team {teamName}</p>
              {/if}
            </div>
            <div class="flex flex-col gap-2 text-sm text-zinc-300">
              {#if email}
                <div class="flex items-center gap-2">
                  <MailIcon class="h-4 w-4 flex-shrink-0 text-zinc-500" />
                  <span
                    class="flex-1 min-w-0 block overflow-hidden truncate"
                    title={email}>{truncateEnd(email, 25)}</span
                  >
                </div>
              {/if}

              {#if phoneNumber}
                <div class="flex items-center gap-2">
                  <PhoneIcon class="h-4 w-4 flex-shrink-0 text-zinc-500" />
                  <span>{phoneNumber}</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
        <div class="flex items-center justify-center">
          <QRCode
            data={qrData}
            size={240}
            margin={8}
            className="bg-transparent"
            showLogo={false}
            logoScale={0.22}
          />
        </div>
      </div>
    </Card>

    <Card>
      <CardHeader class="px-5 py-5 pb-3">
        <CardTitle>Personal Information</CardTitle>
        <CardDescription
          >Update your personal details and profile information.</CardDescription
        >
      </CardHeader>
      <CardContent class="px-5 pb-5 pt-0">
        <div class="grid gap-4 text-sm text-zinc-200">
          <div class="personal-field space-y-1.5">
            <label
              class="text-[10px] uppercase tracking-[0.14em] text-zinc-500"
              for="first-name">First Name</label
            >
            <Input
              id="first-name"
              value={firstName}
              disabled
              class="h-11 rounded-[10px] border border-[#2E2E2E] bg-[#101010] text-base text-zinc-100"
            />
          </div>

          <div class="personal-field space-y-1.5">
            <label
              class="text-[10px] uppercase tracking-[0.14em] text-zinc-500"
              for="last-name">Last Name</label
            >
            <Input
              id="last-name"
              value={lastName}
              disabled
              class="h-11 rounded-[10px] border border-[#2E2E2E] bg-[#101010] text-base text-zinc-100"
            />
          </div>

          <div class="personal-field space-y-1.5">
            <label
              class="text-[10px] uppercase tracking-[0.14em] text-zinc-500"
              for="email">Email</label
            >
            <Input
              id="email"
              value={email}
              disabled
              class="h-11 rounded-[10px] border border-[#2E2E2E] bg-[#101010] text-base text-zinc-100"
            />
          </div>

          <div class="personal-field space-y-1.5">
            <label
              class="text-[10px] uppercase tracking-[0.14em] text-zinc-500"
              for="phone">Phone Number</label
            >
            <Input
              id="phone"
              value={phoneNumber}
              disabled
              class="h-11 rounded-[10px] border border-[#2E2E2E] bg-[#101010] text-base text-zinc-100"
            />
          </div>

          <div class="personal-field space-y-1.5">
            <label
              class="text-[10px] uppercase tracking-[0.14em] text-zinc-500"
              for="university">University</label
            >
            <Input
              id="university"
              value={university}
              disabled
              class="h-11 rounded-[10px] border border-[#2E2E2E] bg-[#101010] text-base text-zinc-100"
            />
          </div>

          <div class="personal-field space-y-1.5">
            <label
              class="text-[10px] uppercase tracking-[0.14em] text-zinc-500"
              for="dob">Date of Birth</label
            >
            <Input
              id="dob"
              value={extraField}
              disabled
              class="h-11 rounded-[10px] border border-[#2E2E2E] bg-[#101010] text-base text-zinc-100"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <Navbar />
</main>
