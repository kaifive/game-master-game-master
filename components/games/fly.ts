/**
 * Sends a "+80" chip from the result to the header total (S08-AC15).
 * Resolves when it lands; does nothing under reduced motion or with no target.
 */
export async function flyPoints(from: Element, text: string, reduced: boolean): Promise<void> {
  const target = document.querySelector("[data-total-score]");
  if (reduced || !target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const chip = document.createElement("span");
  chip.textContent = text;
  chip.setAttribute("aria-hidden", "true");
  chip.className =
    // Inverted text and background: readable on the banner and the page alike.
    "pointer-events-none fixed z-50 rounded-full bg-gm-text px-3 py-1 font-gm-display text-2xl font-bold text-gm-bg shadow-lg ring-2 ring-gm-bg";
  chip.style.left = `${String(a.left + a.width / 2)}px`;
  chip.style.top = `${String(a.top + a.height / 2)}px`;
  document.body.append(chip);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  try {
    await chip.animate(
      [
        { transform: "translate(-50%, -50%) scale(1.2)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${String(dx)}px), calc(-50% + ${String(dy)}px)) scale(0.6)`,
          opacity: 0.6,
        },
      ],
      { duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
    ).finished;
  } finally {
    chip.remove();
  }
}
