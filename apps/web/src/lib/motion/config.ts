/**
 * Motion Design System Configuration
 *
 * This module defines the standardized motion language for the entire application.
 * All animations should reference these tokens to ensure consistency.
 *
 * Motion Principles:
 * - Fluid, elastic but controlled, non-cartoonish
 * - No abrupt snaps; everything eases in/out with natural settling
 * - Coordinated transitions: siblings animate in related ways
 */

// =============================================================================
// DURATION TOKENS
// =============================================================================

export const duration = {
  /** Fast: 150-200ms - Small hover/feedback animations */
  fast: 0.15,
  /** Normal: 250-350ms - Button presses, basic transitions */
  normal: 0.3,
  /** Slow: 400-550ms - Full panel changes, modal in/out */
  slow: 0.5,
  /** Slower: 600-800ms - Complex morphing, page transitions */
  slower: 0.7,
} as const

// =============================================================================
// EASING TOKENS
// =============================================================================

export const ease = {
  /** Default liquid ease - smooth, natural feel */
  default: 'power3.out',
  /** Liquid in-out - for reversible animations */
  inOut: 'power3.inOut',
  /** Elastic/overshoot - subtle merge/split behavior */
  elastic: 'back.out(1.4)',
  /** Stronger elastic - more pronounced overshoot */
  elasticStrong: 'back.out(1.7)',
  /** Soft ease - gentle movements */
  soft: 'power2.out',
  /** Snappy - quick but not jarring */
  snappy: 'power4.out',
  /** Enter ease - elements appearing */
  enter: 'power2.out',
  /** Exit ease - elements disappearing */
  exit: 'power2.in',
} as const

// =============================================================================
// STAGGER TOKENS
// =============================================================================

export const stagger = {
  /** Extra small: 30ms - Very tight groupings */
  xs: 0.03,
  /** Small: 60ms - Standard list items */
  sm: 0.06,
  /** Medium: 100ms - Distinct sequential items */
  md: 0.1,
  /** Large: 150ms - Dramatic sequential reveals */
  lg: 0.15,
} as const

// =============================================================================
// TRANSFORM PRESETS
// =============================================================================

export const transform = {
  /** Hover scale - subtle lift effect */
  hoverScale: 1.02,
  /** Press scale - button press feedback */
  pressScale: 0.97,
  /** Modal enter scale - start slightly smaller */
  modalEnterScale: 0.95,
  /** Panel slide distance */
  slideDistance: 20,
  /** Menu expand origin scale */
  menuOriginScale: 0.9,
} as const

// =============================================================================
// Z-DEPTH / LAYERING BEHAVIOR
// =============================================================================

export const depth = {
  /** Background blur when overlay appears */
  backdropBlur: 'blur(8px)',
  /** Background scale when overlay appears */
  backdropScale: 0.98,
  /** Shadow for elevated elements */
  elevatedShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  /** Subtle shadow for hover states */
  hoverShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
} as const

// =============================================================================
// ANIMATION PRESETS
// =============================================================================

/** Common animation configurations */
export const presets = {
  /** Button hover animation */
  buttonHover: {
    duration: duration.fast,
    ease: ease.soft,
    scale: transform.hoverScale,
  },
  /** Button press animation */
  buttonPress: {
    duration: duration.fast * 0.5,
    ease: ease.snappy,
    scale: transform.pressScale,
  },
  /** Button release animation (springy) */
  buttonRelease: {
    duration: duration.normal,
    ease: ease.elastic,
    scale: 1,
  },
  /** Modal enter animation */
  modalEnter: {
    duration: duration.slow,
    ease: ease.elastic,
    scale: { from: transform.modalEnterScale, to: 1 },
    opacity: { from: 0, to: 1 },
  },
  /** Modal exit animation */
  modalExit: {
    duration: duration.normal,
    ease: ease.exit,
    scale: { from: 1, to: transform.modalEnterScale },
    opacity: { from: 1, to: 0 },
  },
  /** Panel slide in */
  panelEnter: {
    duration: duration.slow,
    ease: ease.default,
    y: { from: transform.slideDistance, to: 0 },
    opacity: { from: 0, to: 1 },
  },
  /** Menu dropdown open */
  menuOpen: {
    duration: duration.normal,
    ease: ease.elastic,
    scale: { from: transform.menuOriginScale, to: 1 },
    opacity: { from: 0, to: 1 },
  },
  /** Menu dropdown close */
  menuClose: {
    duration: duration.fast,
    ease: ease.exit,
    scale: { from: 1, to: transform.menuOriginScale },
    opacity: { from: 1, to: 0 },
  },
  /** List item stagger entrance */
  listStagger: {
    duration: duration.normal,
    ease: ease.default,
    stagger: stagger.sm,
    y: { from: 15, to: 0 },
    opacity: { from: 0, to: 1 },
  },
  /** Card entrance */
  cardEnter: {
    duration: duration.slow,
    ease: ease.default,
    scale: { from: 0.95, to: 1 },
    y: { from: 20, to: 0 },
    opacity: { from: 0, to: 1 },
  },
  /** Page transition in */
  pageEnter: {
    duration: duration.slow,
    ease: ease.default,
    y: { from: 30, to: 0 },
    opacity: { from: 0, to: 1 },
  },
  /** Page transition out */
  pageExit: {
    duration: duration.normal,
    ease: ease.exit,
    y: { from: 0, to: -20 },
    opacity: { from: 1, to: 0 },
  },
  /** Selection highlight morph */
  selectionMorph: {
    duration: duration.normal,
    ease: ease.elastic,
  },
  /** Nav item highlight slide */
  navHighlight: {
    duration: duration.normal,
    ease: ease.elastic,
  },
} as const

// =============================================================================
// REDUCED MOTION HELPER
// =============================================================================

/**
 * Check if user prefers reduced motion
 * Use this to conditionally disable or simplify animations
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get duration based on reduced motion preference
 * Returns instant duration if reduced motion is preferred
 */
export function getAnimationDuration(baseDuration: number): number {
  return prefersReducedMotion() ? 0.01 : baseDuration
}

/**
 * Get animation config with reduced motion support
 * Simplifies complex animations to simple fades when reduced motion is preferred
 */
export function getReducedMotionConfig<T extends Record<string, unknown>>(
  fullConfig: T,
  reducedConfig: Partial<T>
): T {
  return prefersReducedMotion() ? { ...fullConfig, ...reducedConfig } : fullConfig
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Duration = typeof duration
export type Ease = typeof ease
export type Stagger = typeof stagger
export type Transform = typeof transform
export type Presets = typeof presets
