import tailwind from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

export default (ctx) => {
  const file = ctx?.file
  const basename = file?.basename ?? ''
  const isSvelteVirtual = basename.includes('.svelte')

  if (isSvelteVirtual) {
    return {
      plugins: [],
    }
  }

  return {
    plugins: [
      tailwind(),
      autoprefixer(),
    ],
  }
}
