<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import logoFallback from '$img/logo.svg?url'

type QRCodeStyling = typeof import('qr-code-styling').default
type QRCodeStylingOptions = ConstructorParameters<QRCodeStyling>[0]
type QRCodeStylingInstance = InstanceType<QRCodeStyling>

  export let data: string = 'openhack-participant'
  export let size = 220
  export let margin = 14
  export let className = ''
  export let style = ''
  export let showLogo = true
  export let logoUrl: string | null = logoFallback
  export let logoScale = 0.2

  let container: HTMLDivElement | null = null
  let qrCode: QRCodeStylingInstance | null = null
  let isMounted = false
  let containerStyle = ''

function buildConfig(): QRCodeStylingOptions {
  const config: QRCodeStylingOptions = {
      width: size,
      height: size,
      type: 'svg',
      margin,
      data: data || 'openhack-participant',
      dotsOptions: {
        color: '#ffffff',
        type: 'rounded',
      },
      cornersSquareOptions: {
        type: 'rounded',
        color: '#ffffff',
      },
      cornersDotOptions: {
        color: '#ffffff',
      },
      backgroundOptions: {
        color: 'transparent',
      },
    }

    if (showLogo && logoUrl) {
      config.image = logoUrl
      config.imageOptions = {
        crossOrigin: 'anonymous',
        hideBackgroundDots: true,
        margin: Math.max(6, Math.round(size * 0.1)),
        imageSize: Math.min(0.28, Math.max(0.16, logoScale)),
      }
    }

    return config
  }

  onMount(() => {
    isMounted = true
    void setupQr()

    return () => {
      isMounted = false
      teardown()
    }
  })

  onDestroy(() => {
    isMounted = false
    teardown()
  })

  async function setupQr() {
    if (!isMounted) return

    const { default: QRCodeStylingModule } = await import('qr-code-styling')
    const QRCodeStylingCtor: QRCodeStyling = QRCodeStylingModule
    if (!isMounted) return

    qrCode = new QRCodeStylingCtor(buildConfig())
    if (container) {
      qrCode.append(container)
    }
  }

  function teardown() {
    if (container) {
      container.innerHTML = ''
    }
    qrCode = null
  }

  $: if (qrCode) {
    qrCode.update(buildConfig())
  }

  $: baseStyle = `width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;`
  $: containerStyle = style ? `${baseStyle}${style.startsWith(';') ? style : `;${style}`}` : baseStyle
</script>

<div bind:this={container} class={className} style={containerStyle}></div>
