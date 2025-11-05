<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  interface Props {
    isOpen: boolean
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    isDangerous?: boolean
    isLoading?: boolean
    onConfirm?: () => void
    onCancel?: () => void
  }

  let {
    isOpen = $bindable(false),
    title = '',
    description = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDangerous = false,
    isLoading = false,
    onConfirm,
    onCancel,
  }: Props = $props()

  const dispatch = createEventDispatcher<{
    confirm: void
    cancel: void
  }>()

  function handleConfirm() {
    dispatch('confirm')
    onConfirm?.()
  }

  function handleCancel() {
    dispatch('cancel')
    onCancel?.()
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      event.stopPropagation()
      handleCancel()
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <button
      type="button"
      class="absolute inset-0 z-0 h-full w-full bg-black/70"
      aria-label="Close dialog"
      onclick={handleCancel}
    ></button>
    <div
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      class="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[#141414] p-6 text-white shadow-lg shadow-black/40"
    >
      <h2 id="dialog-title" class="text-lg font-semibold text-white">
        {title}
      </h2>
      <p id="dialog-description" class="mt-2 text-sm text-zinc-400">
        {description}
      </p>
      <div class="mt-6 flex flex-col gap-3">
        <button
          type="button"
          disabled={isLoading}
          class="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed active:opacity-70"
          onclick={handleCancel}
        >
          {cancelText}
        </button>
        <button
          type="button"
          disabled={isLoading}
          class={`rounded-full px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80 ${
            isDangerous
              ? 'bg-[#ff3b30] hover:bg-[#ff3b30]/90'
              : 'bg-[#FE5428] hover:bg-[#FE5428]/90'
          }`}
          onclick={handleConfirm}
        >
          {#if isLoading}
            Loading...
          {:else}
            {confirmText}
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
