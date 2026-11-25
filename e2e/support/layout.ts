import type { Page } from "@playwright/test";

/**
 * Layout problems on the page as it stands (layout sweep, Khai 2026-11-24):
 * sideways scroll, anything off screen or cut off by a box that hides its
 * overflow, and text drawn over other text. Mark something clipped on purpose
 * (a demo's flakes falling in) with `data-allow-clip`.
 */
export async function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1)
      out.push(`page scrolls sideways by ${String(de.scrollWidth - de.clientWidth)}px`);
    const shown = (el: Element) => {
      for (let p: Element | null = el; p; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0)
          return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };
    const hasText = (el: Element) =>
      [...el.childNodes].some((n) => n.nodeType === 3 && Boolean(n.textContent?.trim()));
    const name = (el: Element) =>
      `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent)
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 40)}"`;
    const items = [...document.querySelectorAll("main *")].filter(
      (el) => (hasText(el) || el.matches("button, [role=img], svg")) && shown(el),
    );
    for (const el of items) {
      const r = el.getBoundingClientRect();
      if (el.closest("[data-allow-clip]")) continue;
      if (r.right > innerWidth + 2 || r.left < -2) out.push(`off screen sideways: ${name(el)}`);
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (/(hidden|clip|auto|scroll)/.test(s.overflow + s.overflowX + s.overflowY)) {
          const b = p.getBoundingClientRect();
          const cut = Math.max(
            b.left - r.left,
            r.right - b.right,
            b.top - r.top,
            r.bottom - b.bottom,
          );
          if (cut > 4) out.push(`cut off by ${String(Math.round(cut))}px: ${name(el)}`);
          break;
        }
      }
    }
    const texts = items.filter(hasText);
    for (let i = 0; i < texts.length; i++)
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i];
        const b = texts[j];
        if (!a || !b || a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        const small = Math.min(ra.width * ra.height, rb.width * rb.height);
        if (w > 4 && h > 4 && (w * h) / small > 0.25)
          out.push(`text over text: ${name(a)} / ${name(b)}`);
      }
    return [...new Set(out)];
  });
}

/** Collects page errors and console errors, leaving out failed fetches (refused moves are expected). */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message.slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
      errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  return errors;
}
