import { gsap } from 'gsap'

interface CardEntranceOptions {
  stagger?: number
  duration?: number
  ease?: string
  y?: number
  scale?: number
}

const defaultOptions: CardEntranceOptions = {
  stagger: 0.08,
  duration: 0.5,
  ease: 'power2.out',
  y: 30,
  scale: 0.95
}

export function staggerCards(
  elements: HTMLElement[] | NodeListOf<Element>,
  options: CardEntranceOptions = {}
): gsap.core.Tween {
  const { stagger, duration, ease, y, scale } = { ...defaultOptions, ...options }

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(elements, { opacity: 1, y: 0, scale: 1 })
    return gsap.to(elements, { duration: 0 })
  }

  gsap.set(elements, { opacity: 0, y, scale })

  return gsap.to(elements, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration,
    ease,
    stagger
  })
}

export function cardPop(
  element: HTMLElement,
  options: CardEntranceOptions = {}
): gsap.core.Tween {
  const { duration } = { ...defaultOptions, ...options }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(element, { opacity: 1, scale: 1 })
    return gsap.to(element, { duration: 0 })
  }

  gsap.set(element, { opacity: 0, scale: 0.8 })

  return gsap.to(element, {
    opacity: 1,
    scale: 1,
    duration,
    ease: 'back.out(1.7)'
  })
}

export function cardHover(element: HTMLElement): {
  enter: () => gsap.core.Tween
  leave: () => gsap.core.Tween
} {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return {
      enter: () => gsap.to(element, { duration: 0 }),
      leave: () => gsap.to(element, { duration: 0 })
    }
  }

  return {
    enter: () =>
      gsap.to(element, {
        scale: 1.02,
        duration: 0.2,
        ease: 'power2.out'
      }),
    leave: () =>
      gsap.to(element, {
        scale: 1,
        duration: 0.2,
        ease: 'power2.out'
      })
  }
}
