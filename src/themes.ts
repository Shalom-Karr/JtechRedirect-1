/**
 * The palettes the banner cycles through — Omarchy's own default themes, in the
 * order and with the exact values oligarchy.fyi ships. Transcribed straight
 * from that page's `themes:start`/`themes:end` block rather than retyped.
 *
 * The tuple is positional and the client destructures it skipping the name:
 * `[name, mode, background, banner, tagline, link, linkHover, bannerHover]`.
 */

export type ThemeMode = "dark" | "light";

export type Theme = readonly [
  name: string,
  mode: ThemeMode,
  background: string,
  banner: string,
  tagline: string,
  link: string,
  linkHover: string,
  bannerHover: string,
];

/** The palette the stylesheet already paints, so the first click moves off it. */
export const INITIAL_THEME = "tokyo-night";

export const THEMES: readonly Theme[] = [
  ["catppuccin", "dark", "#1e1e2e", "#a6e3a1", "#89b4fa", "#94e2d5", "#cdd6f4", "#89b4fa"],
  ["catppuccin-latte", "light", "#eff1f5", "#40a02b", "#1e66f5", "#179299", "#4c4f69", "#1e66f5"],
  ["ethereal", "dark", "#060b1e", "#92a593", "#7d82d9", "#dfeaf0", "#ffcead", "#7d82d9"],
  ["everforest", "dark", "#2d353b", "#a7c080", "#7fbbb3", "#83c092", "#d3c6aa", "#7fbbb3"],
  ["flexoki-light", "light", "#fffcf0", "#879a39", "#205ea6", "#3aa99f", "#100f0f", "#205ea6"],
  ["gruvbox", "dark", "#282828", "#a9b665", "#7daea3", "#89b482", "#d4be98", "#7daea3"],
  ["hackerman", "dark", "#0b0c16", "#4fe88f", "#829dd4", "#d1fffe", "#ddf7ff", "#82fb9c"],
  ["kanagawa", "dark", "#1f1f28", "#76946a", "#7e9cd8", "#7aa89f", "#dcd7ba", "#dcd7ba"],
  ["last-horizon", "dark", "#0c0b0c", "#87a9b0", "#b59790", "#a5a0b6", "#e2dddc", "#b59790"],
  ["lumon", "dark", "#16242d", "#5e95bc", "#6fb8e3", "#d1eef8", "#f2fcff", "#8bc9eb"],
  ["lupine", "light", "#fafafa", "#4a2fd0", "#3264eb", "#3986ff", "#000000", "#3264eb"],
  ["matte-black", "dark", "#121212", "#ffc107", "#e68e0d", "#eaeaea", "#bebebe", "#e68e0d"],
  ["miasma", "dark", "#222222", "#5f875f", "#78824b", "#c9a554", "#c2c2b0", "#78824b"],
  ["nord", "dark", "#2e3440", "#a3be8c", "#81a1c1", "#8fbcbb", "#d8dee9", "#81a1c1"],
  ["osaka-jade", "dark", "#111c18", "#549e6a", "#509475", "#8cd3cb", "#f7e8b2", "#509475"],
  ["retro-82", "dark", "#05182e", "#028391", "#3f8f8a", "#8cbfb8", "#f6dcac", "#faa968"],
  ["ristretto", "dark", "#2c2525", "#adda78", "#f38d70", "#9bf1e1", "#e6d9db", "#f38d70"],
  ["rose-pine", "light", "#faf4ed", "#286983", "#56949f", "#d7827e", "#575279", "#56949f"],
  ["solitude", "dark", "#101315", "#9fa5a9", "#798186", "#707070", "#a5aeb4", "#798186"],
  ["tokyo-night", "dark", "#1a1b26", "#9ece6a", "#7aa2f7", "#0db9d7", "#c0caf5", "#7aa2f7"],
  ["vantablack", "dark", "#000000", "#b6b6b6", "#8d8d8d", "#b0b0b0", "#ffffff", "#8d8d8d"],
  ["white", "light", "#ffffff", "#3a3a3a", "#1a1a1a", "#3e3e3e", "#000000", "#6e6e6e"],
];

const names = new Set(THEMES.map((theme) => theme[0]));
if (names.size !== THEMES.length) {
  throw new Error("themes: duplicate theme name");
}
if (!names.has(INITIAL_THEME)) {
  throw new Error(`themes: INITIAL_THEME ${INITIAL_THEME} is not in the table`);
}
