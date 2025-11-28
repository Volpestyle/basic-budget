/// <reference types="@sveltejs/kit" />
/// <reference types="vite-plugin-pwa/svelte" />

declare global {
  namespace App {
    interface Locals {
      user?: {
        id: string
        email: string
        displayName: string
      }
    }
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  // Google Identity Services types
  namespace google {
    namespace accounts {
      namespace id {
        interface CredentialResponse {
          credential: string
          select_by?: string
        }

        interface IdConfiguration {
          client_id: string
          callback: (response: CredentialResponse) => void
          auto_select?: boolean
          cancel_on_tap_outside?: boolean
          context?: 'signin' | 'signup' | 'use'
        }

        interface GsiButtonConfiguration {
          type: 'standard' | 'icon'
          theme?: 'outline' | 'filled_blue' | 'filled_black'
          size?: 'large' | 'medium' | 'small'
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
          shape?: 'rectangular' | 'pill' | 'circle' | 'square'
          logo_alignment?: 'left' | 'center'
          width?: number
          locale?: string
        }

        function initialize(config: IdConfiguration): void
        function prompt(callback?: (notification: PromptMomentNotification) => void): void
        function renderButton(parent: HTMLElement, options: GsiButtonConfiguration): void
        function disableAutoSelect(): void
        function cancel(): void

        interface PromptMomentNotification {
          isDisplayMoment(): boolean
          isDisplayed(): boolean
          isNotDisplayed(): boolean
          getNotDisplayedReason(): string
          isSkippedMoment(): boolean
          getSkippedReason(): string
          isDismissedMoment(): boolean
          getDismissedReason(): string
          getMomentType(): string
        }
      }
    }
  }
}

export {}
