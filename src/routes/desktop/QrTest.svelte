<script lang="ts">
  import QRCode from '$lib/components/shared/QRCode.svelte'

  let data = 'ODF5ub'
  let size = 220
  let margin = 14
  let showLogo = true
  let logoScale = 0.35
</script>

<main class="min-h-screen bg-black px-6 py-12 text-white">
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-8">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight">QR Code Sandbox</h1>
      <p class="text-sm text-zinc-500">
        Tweak the payload and dimensions below to preview styling before integrating elsewhere.
      </p>
    </header>

    <section class="rounded-2xl border border-white/10 bg-[#171717] p-8">
      <div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div class="space-y-6">
          <div class="space-y-2">
            <label class="text-xs uppercase tracking-[0.14em] text-zinc-500" for="qr-data">
              QR Payload
            </label>
            <input
              id="qr-data"
              class="w-full rounded-lg border border-[#2E2E2E] bg-[#101010] px-4 py-2 text-sm text-white outline-none focus-visible:border-white/40"
              bind:value={data}
              placeholder="Participant ID"
            />
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.14em] text-zinc-500" for="qr-size">
                Size
              </label>
              <input
                id="qr-size"
                type="number"
                class="w-full rounded-lg border border-[#2E2E2E] bg-[#101010] px-4 py-2 text-sm text-white outline-none focus-visible:border-white/40"
                bind:value={size}
                min="120"
                max="400"
                step="10"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.14em] text-zinc-500" for="qr-margin">
                Margin
              </label>
              <input
                id="qr-margin"
                type="number"
                class="w-full rounded-lg border border-[#2E2E2E] bg-[#101010] px-4 py-2 text-sm text-white outline-none focus-visible:border-white/40"
                bind:value={margin}
                min="0"
                max="40"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.14em] text-zinc-500" for="qr-logo-scale">
                Logo Scale
              </label>
              <input
                id="qr-logo-scale"
                type="number"
                class="w-full rounded-lg border border-[#2E2E2E] bg-[#101010] px-4 py-2 text-sm text-white outline-none focus-visible:border-white/40"
                bind:value={logoScale}
                min="0.2"
                max="0.6"
                step="0.01"
              />
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              bind:checked={showLogo}
              class="size-4 rounded border border-[#2E2E2E] bg-[#101010]"
            />
            Show logo overlay
          </label>
        </div>

        <div class="flex items-center justify-center rounded-[10px] border border-[#2E2E2E] bg-transparent p-6">
          <QRCode
            data={data}
            size={size}
            margin={margin}
            logoScale={logoScale}
            showLogo={showLogo}
            className="flex items-center justify-center bg-transparent"
          />
        </div>
      </div>
    </section>
  </div>
</main>
