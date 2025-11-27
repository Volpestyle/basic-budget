<script lang="ts">
  interface Props {
    name: string
    color: string
    size?: 'sm' | 'md'
  }

  let { name, color, size = 'md' }: Props = $props()

  const sizes = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs'
  }
</script>

<span
  class="inline-flex items-center gap-1 {sizes[size]}"
  style="background-color: {color}15; color: {color};"
>
  <span class="w-1.5 h-1.5" style="background-color: {color};"></span>
  {name}
</span>
