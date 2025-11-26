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
}

export {}
