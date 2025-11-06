<script lang="ts">
  interface Props {
    size?: 'sm' | 'md' | 'lg'
    color?: string
  }

  let { size = 'md', color = '#FE5428' }: Props = $props()

  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const dotSizeMap = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  }
</script>

<div class={`flex items-center justify-center ${sizeMap[size]}`}>
  <div class="relative w-full h-full">
    {#each [0, 1, 2] as i}
      <div
        class={`absolute ${dotSizeMap[size]} rounded-full animate-pulse`}
        style={`
          background-color: ${color};
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(${i * 120}deg) translateY(-${size === 'sm' ? '10px' : size === 'md' ? '14px' : '20px'});
          opacity: ${1 - i * 0.3};
          animation: apple-loader 1.4s infinite;
          animation-delay: ${i * 0.2}s;
        `}
      ></div>
    {/each}
  </div>
</div>

<style>
  @keyframes apple-loader {
    0% {
      opacity: 0.3;
      transform: translate(-50%, -50%) rotate(0deg) translateY(-10px) scale(1);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) rotate(180deg) translateY(-10px)
        scale(1.1);
    }
    100% {
      opacity: 0.3;
      transform: translate(-50%, -50%) rotate(360deg) translateY(-10px) scale(1);
    }
  }

  :global(body.dark) div {
    --loader-color: currentColor;
  }
</style>
