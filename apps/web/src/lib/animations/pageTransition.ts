import { gsap } from 'gsap'

interface TransitionOptions {
  duration?: number
  ease?: string
}

interface ResolvedOptions {
  duration: number
  ease: string
}

const defaultOptions: ResolvedOptions = {
  duration: 0.4,
  ease: 'power2.out'
}

export function pageEnter(
  element: HTMLElement,
  options: TransitionOptions = {}
): gsap.core.Tween {
  const { duration, ease }: ResolvedOptions = { ...defaultOptions, ...options }

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(element, { opacity: 1, y: 0 })
    return gsap.to(element, { duration: 0 })
  }

  gsap.set(element, { opacity: 0, y: 20 })

  return gsap.to(element, {
    opacity: 1,
    y: 0,
    duration,
    ease
  })
}

export function pageExit(
  element: HTMLElement,
  options: TransitionOptions = {}
): gsap.core.Tween {
  const { duration, ease }: ResolvedOptions = { ...defaultOptions, ...options }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return gsap.to(element, { opacity: 0, duration: 0.1 })
  }

  return gsap.to(element, {
    opacity: 0,
    y: -20,
    duration: duration * 0.75,
    ease
  })
}

export function fadeIn(
  element: HTMLElement,
  options: TransitionOptions = {}
): gsap.core.Tween {
  const { duration, ease }: ResolvedOptions = { ...defaultOptions, ...options }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(element, { opacity: 1 })
    return gsap.to(element, { duration: 0 })
  }

  gsap.set(element, { opacity: 0 })

  return gsap.to(element, {
    opacity: 1,
    duration,
    ease
  })
}

export function fadeOut(
  element: HTMLElement,
  options: TransitionOptions = {}
): gsap.core.Tween {
  const { duration, ease }: ResolvedOptions = { ...defaultOptions, ...options }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return gsap.to(element, { opacity: 0, duration: 0.1 })
  }

  return gsap.to(element, {
    opacity: 0,
    duration,
    ease
  })
}
