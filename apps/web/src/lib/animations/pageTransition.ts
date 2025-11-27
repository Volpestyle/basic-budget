/**
 * Page Transition Animations
 *
 * Provides coordinated page transitions where elements flow and rearrange
 * rather than just popping in and out.
 *
 * Usage in SvelteKit layout or pages:
 * - Use pageEnter/pageExit functions
 * - Tag elements with data-transition-key for FLIP animations
 */

import { gsap } from 'gsap'
import { duration, ease, stagger, prefersReducedMotion } from '$lib/motion/config'

/**
 * Animates a page entering the viewport
 * Coordinates multiple elements to enter together
 */
export function pageEnter(
  node: HTMLElement,
  { delay = 0 }: { delay?: number } = {}
): { destroy: () => void } {
  if (prefersReducedMotion()) {
    gsap.set(node, { opacity: 1, y: 0 })
    return { destroy: () => { } }
  }

  // Set initial state
  gsap.set(node, { opacity: 0, y: 30 })

  // Create entrance timeline
  const tl = gsap.timeline({ delay })

  // Main container fades and slides in
  tl.to(node, {
    opacity: 1,
    y: 0,
    duration: duration.slow,
    ease: ease.default
  })

  // Stagger child elements if they have the data-transition-stagger attribute
  const staggerChildren = node.querySelectorAll('[data-transition-stagger]')
  if (staggerChildren.length > 0) {
    tl.fromTo(
      staggerChildren,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: duration.normal,
        ease: ease.default,
        stagger: stagger.sm
      },
      0.2 // Start slightly after main container
    )
  }

  return {
    destroy: () => {
      tl.kill()
    }
  }
}

/**
 * Animates a page exiting the viewport
 */
export function pageExit(
  node: HTMLElement,
  { delay = 0 }: { delay?: number } = {}
): { destroy: () => void } {
  if (prefersReducedMotion()) {
    gsap.set(node, { opacity: 0, y: -20 })
    return { destroy: () => { } }
  }

  const tl = gsap.timeline({ delay })

  // Exit animation - slight upward movement
  tl.to(node, {
    opacity: 0,
    y: -20,
    duration: duration.normal,
    ease: ease.exit
  })

  return {
    destroy: () => {
      tl.kill()
    }
  }
}

/**
 * Simple fade in animation
 */
export function fadeIn(
  node: HTMLElement,
  { delay = 0, duration: dur = duration.normal }: { delay?: number; duration?: number } = {}
): { destroy: () => void } {
  if (prefersReducedMotion()) {
    gsap.set(node, { opacity: 1 })
    return { destroy: () => { } }
  }

  gsap.set(node, { opacity: 0 })

  const tween = gsap.to(node, {
    opacity: 1,
    duration: dur,
    ease: ease.default,
    delay
  })

  return {
    destroy: () => {
      tween.kill()
    }
  }
}

/**
 * Simple fade out animation
 */
export function fadeOut(
  node: HTMLElement,
  { delay = 0, duration: dur = duration.fast }: { delay?: number; duration?: number } = {}
): { destroy: () => void } {
  if (prefersReducedMotion()) {
    gsap.set(node, { opacity: 0 })
    return { destroy: () => { } }
  }

  const tween = gsap.to(node, {
    opacity: 0,
    duration: dur,
    ease: ease.exit,
    delay
  })

  return {
    destroy: () => {
      tween.kill()
    }
  }
}

/**
 * FLIP animation for elements that move between pages
 * Call this on elements with matching data-transition-key attributes
 */
export function flipTransition(element: HTMLElement, oldBounds: DOMRect): void {
  if (prefersReducedMotion()) return

  const newBounds = element.getBoundingClientRect()

  const deltaX = oldBounds.left - newBounds.left
  const deltaY = oldBounds.top - newBounds.top
  const scaleX = oldBounds.width / newBounds.width
  const scaleY = oldBounds.height / newBounds.height

  // Set initial position to old position
  gsap.set(element, {
    x: deltaX,
    y: deltaY,
    scaleX,
    scaleY,
    transformOrigin: 'top left'
  })

  // Animate to new position
  gsap.to(element, {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    duration: duration.slow,
    ease: ease.elastic
  })
}

/**
 * Capture positions of elements with transition keys
 * Use this before navigation to save element positions
 */
export function captureTransitionElements(): Map<string, DOMRect> {
  const elements = new Map<string, DOMRect>()

  document.querySelectorAll('[data-transition-key]').forEach((element) => {
    const key = element.getAttribute('data-transition-key')
    if (key) {
      elements.set(key, element.getBoundingClientRect())
    }
  })

  return elements
}

/**
 * Apply FLIP transitions to matching elements
 * Use this after navigation completes
 */
export function applyTransitionElements(savedPositions: Map<string, DOMRect>): void {
  savedPositions.forEach((oldBounds, key) => {
    const element = document.querySelector(
      `[data-transition-key="${key}"]`
    ) as HTMLElement
    if (element) {
      flipTransition(element, oldBounds)
    }
  })
}
