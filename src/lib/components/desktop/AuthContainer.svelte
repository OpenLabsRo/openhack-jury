<script lang="ts"></script>

<main class="auth-container">
  <slot />
</main>

<style>
  .auth-container {
    max-width: 378px;
    margin: 0 auto;
    margin-top: 30vh;
  } 

  @media (max-width: 400px) {
    .auth-container {
      max-width: 80%;
      margin: 0 auto;
      margin-top: 20vh;
    }
  }
</style>
