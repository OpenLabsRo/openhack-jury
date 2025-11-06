<script lang="ts">
  import Navbar from '$lib/components/desktop/Navbar.svelte'
  import { Button } from '$lib/components/ui/button'
  import { navigate } from 'svelte5-router'

  // Placeholder data for the teams list (frontend-only for now)
  const teams = [
    { id: 'team_001', name: 'Alpha Project', table: 'A1', submission: { name: 'Alpha App', desc: 'A demo project', repo: 'https://example.com/alpha' } },
    { id: 'team_002', name: 'Beta Builders', table: 'B3', submission: { name: 'Beta Service', desc: 'An interesting service', repo: 'https://example.com/beta' } },
    { id: 'team_003', name: 'Gamma Coders', table: 'C2', submission: { name: 'Gamma Platform', desc: 'Platform for testing', repo: 'https://example.com/gamma' } },
  ]

  function openTeam(teamId: string) {
    // For now just navigate to the judge page — actual view logic will be implemented later.
    navigate('/')
  }
</script>

<div class="min-h-screen bg-black flex flex-col">
  <Navbar />

  <main class="flex-1 overflow-y-auto px-8 py-8">
    <div class="max-w-4xl mx-auto space-y-6">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-white">Teams</h1>
        <p class="text-sm text-zinc-400">Browse all teams (placeholder)</p>
      </header>

      <div class="grid gap-4">
        {#each teams as team}
          <article class="flex items-center justify-between gap-4 p-4 rounded-lg border border-[#2E2E2E] bg-[#101010]">
            <div class="flex-1">
              <h2 class="text-white text-lg font-semibold">{team.name}</h2>
              {#if team.table}
                <p class="text-sm text-zinc-400 mt-1">Table {team.table}</p>
              {/if}
              {#if team.submission?.name}
                <p class="text-sm text-zinc-300 mt-2">{team.submission.name} — <span class="text-zinc-400">{team.submission.desc}</span></p>
              {/if}
            </div>
            <div class="flex flex-col items-end gap-2">
              {#if team.submission?.repo}
                <a href={team.submission.repo} target="_blank" rel="noopener noreferrer" class="text-[#FE5428] hover:underline text-sm">
                  Repo
                </a>
              {/if}
              <Button on:click={() => openTeam(team.id)} class="bg-[#FE5428] hover:bg-[#e64520] text-white">
                View
              </Button>
            </div>
          </article>
        {/each}
      </div>

      <div class="text-center mt-6">
        <p class="text-sm text-zinc-500">This is a frontend-only placeholder for the teams list. The UI will be wired to real data later.</p>
      </div>
    </div>
  </main>
</div>
