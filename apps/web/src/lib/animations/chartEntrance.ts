import { gsap } from 'gsap'

interface ChartEntranceOptions {
  duration?: number
  ease?: string
  delay?: number
}

interface ResolvedOptions {
  duration: number
  ease: string
  delay: number
}

const defaultOptions: ResolvedOptions = {
  duration: 0.6,
  ease: 'power2.out',
  delay: 0
}

export function donutChartEntrance(
  element: HTMLElement,
  options: ChartEntranceOptions = {}
): gsap.core.Tween {
  const { duration, ease, delay }: ResolvedOptions = { ...defaultOptions, ...options }

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(element, { opacity: 1, scale: 1, rotation: 0 })
    return gsap.to(element, { duration: 0 })
  }

  gsap.set(element, { opacity: 0, scale: 0.5, rotation: -90 })

  return gsap.to(element, {
    opacity: 1,
    scale: 1,
    rotation: 0,
    duration,
    ease,
    delay
  })
}

export function barChartEntrance(
  bars: HTMLElement[] | NodeListOf<Element>,
  options: ChartEntranceOptions = {}
): gsap.core.Tween {
  const { duration, ease, delay }: ResolvedOptions = { ...defaultOptions, ...options }

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(bars, { scaleY: 1, opacity: 1 })
    return gsap.to(bars, { duration: 0 })
  }

  gsap.set(bars, { scaleY: 0, transformOrigin: 'bottom center', opacity: 0 })

  return gsap.to(bars, {
    scaleY: 1,
    opacity: 1,
    duration,
    ease,
    delay,
    stagger: 0.1
  })
}

export function lineChartEntrance(
  path: SVGPathElement,
  options: ChartEntranceOptions = {}
): gsap.core.Tween {
  const { duration, ease, delay }: ResolvedOptions = { ...defaultOptions, ...options }

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(path, { strokeDashoffset: 0 })
    return gsap.to(path, { duration: 0 })
  }

  const length = path.getTotalLength()
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })

  return gsap.to(path, {
    strokeDashoffset: 0,
    duration: duration * 1.5,
    ease,
    delay
  })
}

export function progressBarEntrance(
  element: HTMLElement,
  targetWidth: string,
  options: ChartEntranceOptions = {}
): gsap.core.Tween {
  const { duration, ease, delay }: ResolvedOptions = { ...defaultOptions, ...options }

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(element, { width: targetWidth })
    return gsap.to(element, { duration: 0 })
  }

  gsap.set(element, { width: '0%' })

  return gsap.to(element, {
    width: targetWidth,
    duration,
    ease,
    delay
  })
}

export function chartFadeIn(
  element: HTMLElement,
  options: ChartEntranceOptions = {}
): gsap.core.Tween {
  const { duration, ease, delay }: ResolvedOptions = { ...defaultOptions, ...options }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(element, { opacity: 1, y: 0 })
    return gsap.to(element, { duration: 0 })
  }

  gsap.set(element, { opacity: 0, y: 20 })

  return gsap.to(element, {
    opacity: 1,
    y: 0,
    duration,
    ease,
    delay
  })
}
