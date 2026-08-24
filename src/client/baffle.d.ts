/**
 * Types for `baffle` (v0.3.6, MIT) — the library has none of its own.
 *
 * Only the surface this page uses is declared. The full API is documented at
 * https://github.com/camwiegert/baffle.
 */
declare module "baffle" {
  interface BaffleOptions {
    /** The pool of characters to obfuscate with. */
    characters?: string;
    /** Milliseconds between obfuscation updates. */
    speed?: number;
    /** Elements, or a selector for them. */
    exclude?: string[];
  }

  interface BaffleInstance {
    /** Obfuscate once, without starting the interval. */
    once(): BaffleInstance;
    /** Begin obfuscating, updating every `speed` milliseconds. */
    start(): BaffleInstance;
    /** Stop updating. Does not reveal the text. */
    stop(): BaffleInstance;
    /** Reveal the text over `duration` ms, after an optional `delay`. */
    reveal(duration?: number, delay?: number): BaffleInstance;
    /** Update options on a running instance. */
    set(options: BaffleOptions): BaffleInstance;
    /** Replace the text; `fn` receives the current text. */
    text(fn: (current: string) => string): BaffleInstance;
  }

  function baffle(
    target: string | Element | Element[] | NodeList,
    options?: BaffleOptions,
  ): BaffleInstance;

  export default baffle;
}
