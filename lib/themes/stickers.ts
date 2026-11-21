/**
 * The stickers' own colors (spec 31). Stickers are props with real-world
 * colors (a red Santa hat, a gold crown), so they look the same in every
 * theme, on the TV and in Controls. Applied as CSS variables on each sticker.
 */
export const STICKER_PALETTE = {
  "--sticker-red": "#c8232f",
  "--sticker-white": "#ffffff",
  "--sticker-fur-line": "#d8d8d4",
  "--sticker-ink": "#1b1b1b",
  "--sticker-gold": "#e5b553",
  "--sticker-green": "#1f7a52",
  "--sticker-brown": "#8a5a2b",
} as const;
