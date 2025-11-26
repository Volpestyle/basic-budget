<script lang="ts">
  interface Props {
    name: string
    color: string
    size?: 'sm' | 'md'
  }

  let { name, color, size = 'md' }: Props = $props()

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  }
</script>

<span
  class="inline-flex items-center gap-1.5 rounded-full font-medium {sizes[size]}"
  style="background-color: {color}20; color: {color};"
>
  <span class="w-2 h-2 rounded-full" style="background-color: {color};"></span>
  {name}
</span>
