<script lang="ts">
  interface Props {
    cents: number
    currency?: string
    type?: 'default' | 'income' | 'expense'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    showSign?: boolean
  }

  let { cents, currency = 'USD', type = 'default', size = 'md', showSign = false }: Props = $props()

  const amount = cents / 100
  const isNegative = cents < 0
  const displayAmount = Math.abs(amount)

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  const formatted = formatter.format(displayAmount)
  const prefix = showSign ? (isNegative ? '-' : '+') : ''

  const colors = {
    default: 'text-ink-900 dark:text-white',
    income: 'text-positive',
    expense: 'text-negative'
  }

  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-2xl'
  }
</script>

<span class="{colors[type]} {sizes[size]}">
  {prefix}{formatted}
</span>
