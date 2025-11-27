<script lang="ts">
  interface Props {
    size?: 'sm' | 'md' | 'lg'
    color?: string
  }

  let { size = 'md', color }: Props = $props()

  const sizes = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-8 w-8'
  }
</script>

<svg
  class="animate-spin text-ink-900/30 dark:text-white/30 {sizes[size]}"
  style={color ? `color: ${color}` : ''}
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 24 24"
>
  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"
  ></circle>
  <path
    class="opacity-75"
    fill="currentColor"
    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
  ></path>
</svg>
