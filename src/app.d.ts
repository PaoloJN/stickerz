// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      ownerId: string;
    }
    interface PageData {
      /** social tags for the page, rendered once by the root layout */
      seo?: import("$lib/seo").Seo;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
