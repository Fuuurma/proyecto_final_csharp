/**
 * Minimal declaration for the virtual module the @cloudflare/vite-plugin
 * provides inside the workerd runtime (dev) and deployed Workers (prod).
 * Only what this repo reads is declared: the environment bindings object.
 * (`env` is the real export — `getBindings` is a Miniflare class method,
 * not a member of this module.)
 */
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
