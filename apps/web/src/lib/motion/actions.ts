/**
 * Svelte Actions for Liquid Motion System
 *
 * These actions can be applied to any element using the `use:` directive.
 * They handle GSAP timeline creation and cleanup automatically.
 */

import { gsap } from 'gsap'
import { duration, ease, transform, stagger, prefersReducedMotion } from './config'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface LiquidHoverOptions {
  scale?: number
  duration?: number
  ease?: string
}

interface LiquidPressOptions {
  pressScale?: number
  releaseEase?: string
}

interface LiquidEnterOptions {
  duration?: number
  ease?: string
  y?: number
  scale?: number
  delay?: number
}

interface LiquidStaggerOptions {
  duration?: number
  ease?: string
  stagger?: number
  y?: number
  scale?: number
}

// =============================================================================
// LIQUID HOVER ACTION
// =============================================================================

/**
 * Applies liquid hover effect to an element
 * Scales up slightly on hover with smooth easing
 *
 * Usage: <button use:liquidHover>Click me</button>
 * Usage: <button use:liquidHover={{ scale: 1.05 }}>Click me</button>
 */
export function liquidHover(node: HTMLElement, options: LiquidHoverOptions = {}) {
  const {
    scale = transform.hoverScale,
    duration: dur = duration.fast,
    ease: easeValue = ease.soft,
  } = options

  let hoverTween: gsap.core.Tween | null = null

  function handleMouseEnter() {
    if (prefersReducedMotion()) return
    if (node.hasAttribute('disabled')) return

    hoverTween?.kill()
    hoverTween = gsap.to(node, {
      scale,
      duration: dur,
      ease: easeValue,
    })
  }

  function handleMouseLeave() {
    if (prefersReducedMotion()) return

    hoverTween?.kill()
    hoverTween = gsap.to(node, {
      scale: 1,
      duration: dur,
      ease: easeValue,
    })
  }

  node.addEventListener('mouseenter', handleMouseEnter)
  node.addEventListener('mouseleave', handleMouseLeave)

  return {
    update(newOptions: LiquidHoverOptions) {
      Object.assign(options, newOptions)
    },
    destroy() {
      node.removeEventListener('mouseenter', handleMouseEnter)
      node.removeEventListener('mouseleave', handleMouseLeave)
      hoverTween?.kill()
    },
  }
}

// =============================================================================
// LIQUID PRESS ACTION
// =============================================================================

/**
 * Applies liquid press effect to an element
 * Scales down on press, springs back on release
 *
 * Usage: <button use:liquidPress>Click me</button>
 */
export function liquidPress(node: HTMLElement, options: LiquidPressOptions = {}) {
  const { pressScale = transform.pressScale, releaseEase = ease.elastic } = options

  let pressTween: gsap.core.Tween | null = null

  function handleMouseDown() {
    if (prefersReducedMotion()) return
    if (node.hasAttribute('disabled')) return

    pressTween?.kill()
    pressTween = gsap.to(node, {
      scale: pressScale,
      duration: duration.fast * 0.5,
      ease: ease.snappy,
    })
  }

  function handleMouseUp() {
    if (prefersReducedMotion()) return

    pressTween?.kill()
    pressTween = gsap.to(node, {
      scale: 1,
      duration: duration.normal,
      ease: releaseEase,
    })
  }

  node.addEventListener('mousedown', handleMouseDown)
  node.addEventListener('mouseup', handleMouseUp)
  node.addEventListener('mouseleave', handleMouseUp)

  return {
    destroy() {
      node.removeEventListener('mousedown', handleMouseDown)
      node.removeEventListener('mouseup', handleMouseUp)
      node.removeEventListener('mouseleave', handleMouseUp)
      pressTween?.kill()
    },
  }
}

// =============================================================================
// LIQUID BUTTON ACTION (Combined Hover + Press)
// =============================================================================

/**
 * Combined liquid button effect with hover and press
 * Handles all button interactions in a coordinated way
 *
 * Usage: <button use:liquidButton>Click me</button>
 */
export function liquidButton(
  node: HTMLElement,
  options: LiquidHoverOptions & LiquidPressOptions = {}
) {
  const {
    scale = transform.hoverScale,
    pressScale = transform.pressScale,
    duration: dur = duration.fast,
    ease: hoverEase = ease.soft,
    releaseEase = ease.elastic,
  } = options

  let tween: gsap.core.Tween | null = null
  let isPressed = false
  let isHovered = false

  function updateScale() {
    if (prefersReducedMotion()) return
    if (node.hasAttribute('disabled')) {
      tween?.kill()
      gsap.set(node, { scale: 1 })
      return
    }

    tween?.kill()

    if (isPressed) {
      tween = gsap.to(node, {
        scale: pressScale,
        duration: dur * 0.5,
        ease: ease.snappy,
      })
    } else if (isHovered) {
      tween = gsap.to(node, {
        scale,
        duration: dur,
        ease: hoverEase,
      })
    } else {
      tween = gsap.to(node, {
        scale: 1,
        duration: duration.normal,
        ease: releaseEase,
      })
    }
  }

  function handleMouseEnter() {
    isHovered = true
    updateScale()
  }

  function handleMouseLeave() {
    isHovered = false
    isPressed = false
    updateScale()
  }

  function handleMouseDown() {
    isPressed = true
    updateScale()
  }

  function handleMouseUp() {
    isPressed = false
    updateScale()
  }

  node.addEventListener('mouseenter', handleMouseEnter)
  node.addEventListener('mouseleave', handleMouseLeave)
  node.addEventListener('mousedown', handleMouseDown)
  node.addEventListener('mouseup', handleMouseUp)

  return {
    destroy() {
      node.removeEventListener('mouseenter', handleMouseEnter)
      node.removeEventListener('mouseleave', handleMouseLeave)
      node.removeEventListener('mousedown', handleMouseDown)
      node.removeEventListener('mouseup', handleMouseUp)
      tween?.kill()
    },
  }
}

// =============================================================================
// LIQUID ENTER ACTION
// =============================================================================

/**
 * Animates element entrance with liquid motion
 * Fades in and slides up from specified position
 *
 * Usage: <div use:liquidEnter>Content</div>
 * Usage: <div use:liquidEnter={{ y: 30, delay: 0.2 }}>Content</div>
 */
export function liquidEnter(node: HTMLElement, options: LiquidEnterOptions = {}) {
  const {
    duration: dur = duration.slow,
    ease: easeValue = ease.default,
    y = transform.slideDistance,
    scale = 1,
    delay = 0,
  } = options

  if (prefersReducedMotion()) {
    gsap.set(node, { opacity: 1, y: 0, scale: 1 })
    return { destroy() {} }
  }

  gsap.set(node, { opacity: 0, y, scale })

  const tween = gsap.to(node, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: dur,
    ease: easeValue,
    delay,
  })

  return {
    destroy() {
      tween.kill()
    },
  }
}

// =============================================================================
// LIQUID STAGGER ACTION (for parent containers)
// =============================================================================

/**
 * Staggers entrance animation for child elements
 * Apply to a parent container, children will animate in sequence
 *
 * Usage: <div use:liquidStagger>...children</div>
 * Usage: <div use:liquidStagger={{ stagger: 0.1, y: 20 }}>...children</div>
 */
export function liquidStagger(node: HTMLElement, options: LiquidStaggerOptions = {}) {
  const {
    duration: dur = duration.normal,
    ease: easeValue = ease.default,
    stagger: staggerValue = stagger.sm,
    y = 15,
    scale = 1,
  } = options

  const children = node.children

  if (prefersReducedMotion() || children.length === 0) {
    gsap.set(children, { opacity: 1, y: 0, scale: 1 })
    return { destroy() {} }
  }

  gsap.set(children, { opacity: 0, y, scale })

  const tween = gsap.to(children, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: dur,
    ease: easeValue,
    stagger: staggerValue,
  })

  return {
    destroy() {
      tween.kill()
    },
  }
}

// =============================================================================
// LIQUID REVEAL ACTION
// =============================================================================

/**
 * Reveals element with a pop/scale effect
 * Great for cards and panels
 *
 * Usage: <div use:liquidReveal>Content</div>
 */
export function liquidReveal(
  node: HTMLElement,
  options: { duration?: number; delay?: number } = {}
) {
  const { duration: dur = duration.slow, delay = 0 } = options

  if (prefersReducedMotion()) {
    gsap.set(node, { opacity: 1, scale: 1 })
    return { destroy() {} }
  }

  gsap.set(node, { opacity: 0, scale: 0.9 })

  const tween = gsap.to(node, {
    opacity: 1,
    scale: 1,
    duration: dur,
    ease: ease.elastic,
    delay,
  })

  return {
    destroy() {
      tween.kill()
    },
  }
}

// =============================================================================
// LIQUID MORPH HELPER (for FLIP animations)
// =============================================================================

interface FlipState {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Captures current position/size of an element for FLIP animation
 */
export function captureFlipState(element: HTMLElement): FlipState {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

/**
 * Animates element from captured state to current position (FLIP technique)
 */
export function animateFlip(
  element: HTMLElement,
  fromState: FlipState,
  options: { duration?: number; ease?: string } = {}
): gsap.core.Tween {
  const { duration: dur = duration.normal, ease: easeValue = ease.elastic } = options

  if (prefersReducedMotion()) {
    return gsap.to(element, { duration: 0 })
  }

  const currentRect = element.getBoundingClientRect()

  const deltaX = fromState.x - currentRect.left
  const deltaY = fromState.y - currentRect.top
  const scaleX = fromState.width / currentRect.width
  const scaleY = fromState.height / currentRect.height

  gsap.set(element, {
    x: deltaX,
    y: deltaY,
    scaleX,
    scaleY,
    transformOrigin: 'top left',
  })

  return gsap.to(element, {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    duration: dur,
    ease: easeValue,
  })
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a GSAP timeline with standard liquid defaults
 */
export function createLiquidTimeline(
  options: gsap.TimelineVars = {}
): gsap.core.Timeline {
  return gsap.timeline({
    defaults: {
      duration: duration.normal,
      ease: ease.default,
    },
    ...options,
  })
}

/**
 * Kills all GSAP animations on an element
 */
export function killAnimations(element: HTMLElement): void {
  gsap.killTweensOf(element)
}
