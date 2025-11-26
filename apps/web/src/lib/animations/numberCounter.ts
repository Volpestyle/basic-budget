import { gsap } from 'gsap'

interface CounterOptions {
  duration?: number
  ease?: string
  decimals?: number
  prefix?: string
  suffix?: string
}

const defaultOptions: CounterOptions = {
  duration: 0.8,
  ease: 'power2.out',
  decimals: 2,
  prefix: '',
  suffix: ''
}

export function animateNumber(
  element: HTMLElement,
  endValue: number,
  options: CounterOptions = {}
): gsap.core.Tween {
  const { duration, ease, decimals, prefix, suffix } = { ...defaultOptions, ...options }

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.textContent = `${prefix}${endValue.toFixed(decimals)}${suffix}`
    return gsap.to({}, { duration: 0 })
  }

  const obj = { value: 0 }

  return gsap.to(obj, {
    value: endValue,
    duration,
    ease,
    onUpdate: () => {
      element.textContent = `${prefix}${obj.value.toFixed(decimals)}${suffix}`
    }
  })
}

export function animateCurrency(
  element: HTMLElement,
  endValue: number,
  currency = 'USD',
  options: Omit<CounterOptions, 'prefix' | 'suffix' | 'decimals'> = {}
): gsap.core.Tween {
  const { duration, ease } = { ...defaultOptions, ...options }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.textContent = formatter.format(endValue)
    return gsap.to({}, { duration: 0 })
  }

  const obj = { value: 0 }

  return gsap.to(obj, {
    value: endValue,
    duration,
    ease,
    onUpdate: () => {
      element.textContent = formatter.format(obj.value)
    }
  })
}

export function animatePercentage(
  element: HTMLElement,
  endValue: number,
  options: Omit<CounterOptions, 'prefix' | 'suffix'> = {}
): gsap.core.Tween {
  const { duration, ease, decimals } = { ...defaultOptions, decimals: 0, ...options }

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.textContent = `${endValue.toFixed(decimals)}%`
    return gsap.to({}, { duration: 0 })
  }

  const obj = { value: 0 }

  return gsap.to(obj, {
    value: endValue,
    duration,
    ease,
    onUpdate: () => {
      element.textContent = `${obj.value.toFixed(decimals)}%`
    }
  })
}
