/**
 * Minimal declaration for the virtual module the @cloudflare/vite-plugin
 * provides inside the workerd runtime (dev) and deployed Workers (prod).
 * Only what this repo reads is declared: the environment bindings.
 */
declare module "cloudflare:workers" {
  export function getBindings(): Record<string, unknown>;
}
