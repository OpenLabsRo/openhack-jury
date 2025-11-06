<script lang="ts">
  import TopBar from '$lib/components/mobile/TopBar.svelte'
  import { Button } from '$lib/components/ui/button'
  import { navigate } from 'svelte5-router'

  // Placeholder team data for mobile view
  const teams = [
    {
      id: 'team_001',
      name: 'Alpha Project',
      table: 'A1',
      submission: { name: 'Alpha App', desc: 'A demo project', repo: 'https://example.com/alpha' },
    },
    {
      id: 'team_002',
      name: 'Beta Builders',
      table: 'B3',
      submission: { name: 'Beta Service', desc: 'An interesting service', repo: 'https://example.com/beta' },
    },
    {
      id: 'team_003',
      name: 'Gamma Coders',
      table: 'C2',
      submission: { name: 'Gamma Platform', desc: 'Platform for testing', repo: 'https://example.com/gamma' },
    },
  ]

  function openTeam(teamId: string) {
    // For now just navigate back to the jury view; wiring to a detail view will come later
    navigate('/')
  }
</script>

<div class="min-h-screen bg-black flex flex-col">
  <TopBar />

  <main class="flex-1 overflow-y-auto px-4 py-6">
    <div class="max-w-lg mx-auto space-y-6">
      <header class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-white">Teams</h1>
        <p class="text-xs text-zinc-400">Placeholder list</p>
      </header>

      <div class="space-y-3">
        {#each teams as team}
          <article class="flex items-start gap-3 p-4 rounded-lg border border-[#2E2E2E] bg-[#101010]">
            <div class="flex-1">
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-white font-semibold">{team.name}</h2>
                {#if team.table}
                  <span class="text-xs text-zinc-400">Table {team.table}</span>
                {/if}
              </div>

              {#if team.submission?.name}
                <p class="text-sm text-zinc-300 mt-2">
                  <span class="font-medium text-zinc-200">{team.submission.name}</span>
                  <span class="text-zinc-400"> — {team.submission.desc}</span>
                </p>
              {/if}
            </div>

            <div class="flex flex-col items-end gap-2">
              {#if team.submission?.repo}
                <a
                  href={team.submission.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[#FE5428] text-xs hover:underline break-all"
                >
                  Repo
                </a>
              {/if}
              <Button on:click={() => openTeam(team.id)} class="bg-[#FE5428] hover:bg-[#e64520] text-white py-2 px-3">
                View
              </Button>
            </div>
          </article>
        {/each}
      </div>

      <div class="text-center mt-4">
        <p class="text-xs text-zinc-500">This is a frontend-only placeholder for the teams list. Real data will be wired later.</p>
      </div>
    </div>
  </main>
</div>
