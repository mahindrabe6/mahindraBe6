import confetti from 'canvas-confetti';

export function fireCelebrationConfetti(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const colors = ['#E08E45', '#10B981', '#F59E0B', '#FFFFFF', '#0F172A'];
    confetti({
      particleCount: 55,
      spread: 68,
      origin: { y: 0.62 },
      colors,
      disableForReducedMotion: true,
    });
    window.setTimeout(() => {
      confetti({
        particleCount: 32,
        angle: 60,
        spread: 52,
        origin: { x: 0.15, y: 0.68 },
        colors,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 32,
        angle: 120,
        spread: 52,
        origin: { x: 0.85, y: 0.68 },
        colors,
        disableForReducedMotion: true,
      });
    }, 160);
  } catch {
    // Non-fatal if canvas/confetti is unavailable
  }
}
