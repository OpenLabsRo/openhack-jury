<script lang="ts">
  import logoUrl from '$img/logo.svg'

  export let title: string
  export let subtitle: string
</script>

<style>
  img {
    width: 45px;
    height: 45px;
  }
  p {
    color: #d4d4d4;
    font-size: 16px;
  }

  h1, p {
    line-height: 36px;
    margin: 0;
    border: 0;
  }

  h1 {
    font-size: 30px;
  }

</style>

<div class="text-center mb-8">
  <img
    src={logoUrl}
    alt="OpenHack logo"
    class="mx-auto mb-6 h-20 w-20 object-contain"
  />
  <h1 class="text-3xl font-bold text-white">{title}</h1>
  <p class="text-lg text-gray-400 mt-2">{subtitle}</p>
</div>
