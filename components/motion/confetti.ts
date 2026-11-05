type ConfettiOptions = { colors: string[]; shapes?: ("circle" | "square")[] };

/**
 * Fires a confetti burst. canvas-confetti loads on the first call only
 * (S14-AC9), and skips itself for viewers who asked for reduced motion.
 */
export async function fireConfetti({ colors, shapes }: ConfettiOptions): Promise<void> {
  const { default: confetti } = await import("canvas-confetti");
  const wide = window.innerWidth >= 1024;
  await confetti({
    particleCount: wide ? 160 : 60,
    spread: wide ? 100 : 70,
    startVelocity: wide ? 45 : 35,
    origin: { y: 0.6 },
    colors,
    ...(shapes ? { shapes } : {}),
    disableForReducedMotion: true,
  });
}
