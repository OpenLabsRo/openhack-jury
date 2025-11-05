<script lang="ts">
  export let size = 48
  export let duration = 1.8
</script>

<style>
  .logo-loader {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--loader-size);
    height: var(--loader-size);
  }

  .logo {
    width: 100%;
    height: 100%;
  }

  .base {
    fill: #000;
  }

  .highlight {
    fill: #fff;
    opacity: 0.85;
    mask-image: linear-gradient(
      -75deg,
      rgba(0, 0, 0, 0) 35%,
      rgba(0, 0, 0, 0.9) 50%,
      rgba(0, 0, 0, 0) 65%
    );
    -webkit-mask-image: linear-gradient(
      -75deg,
      rgba(0, 0, 0, 0) 35%,
      rgba(0, 0, 0, 0.9) 50%,
      rgba(0, 0, 0, 0) 65%
    );
    mask-size: 200%;
    -webkit-mask-size: 200%;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    animation: shimmer var(--loader-duration) linear infinite;
  }

  @keyframes shimmer {
    0% {
      -webkit-mask-position: 200%;
      mask-position: 200%;
    }
    100% {
      -webkit-mask-position: -200%;
      mask-position: -200%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .highlight {
      animation-duration: calc(var(--loader-duration) * 4);
    }
  }
</style>

<div
  class="logo-loader"
  style={`--loader-size: ${size}px; --loader-duration: ${duration}s;`}
>
  <svg
    class="logo"
    viewBox="0 0 1000 1000"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Loading logo"
  >
    <path
      class="base"
      d="M500 0C511.111 154.815 626.667 471.556 1000 500C848.148 506.667 535.556 616 500 1000C464.444 616 151.852 506.667 0 500C373.333 471.556 488.889 154.815 500 0ZM498.096 302.222C493.701 363.459 447.992 488.747 300.318 499.999C360.384 502.636 484.032 545.884 498.096 697.777C512.16 545.884 635.808 502.636 695.874 499.999C548.2 488.748 502.491 363.46 498.096 302.222Z"
    />
    <path
      class="highlight"
      d="M500 0C511.111 154.815 626.667 471.556 1000 500C848.148 506.667 535.556 616 500 1000C464.444 616 151.852 506.667 0 500C373.333 471.556 488.889 154.815 500 0ZM498.096 302.222C493.701 363.459 447.992 488.747 300.318 499.999C360.384 502.636 484.032 545.884 498.096 697.777C512.16 545.884 635.808 502.636 695.874 499.999C548.2 488.748 502.491 363.46 498.096 302.222Z"
    />
  </svg>
</div>
