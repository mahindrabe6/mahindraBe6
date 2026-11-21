import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  subDecimals?: number;
  prefix?: string;
  durationMs?: number;
  className?: string;
  subClassName?: string;
}

function formatWithIndianGrouping(
  num: number,
  fractionDigits: number,
): string {
  const safe = Number.isFinite(num) ? Math.max(0, num) : 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safe);
}

export function AnimatedCounter({
  value,
  decimals = 2,
  subDecimals = 0,
  prefix = '₹',
  durationMs = 650,
  className = '',
  subClassName = 'text-[0.65em] opacity-65 font-normal',
}: AnimatedCounterProps) {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState<number>(safeTarget);
  const currentRef = useRef<number>(safeTarget);
  const hasMountedRef = useRef<boolean>(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      currentRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return;
    }

    const from = hasMountedRef.current ? currentRef.current : 0;
    hasMountedRef.current = true;

    const delta = Math.abs(safeTarget - from);
    // Tiny real-time accrual ticks jump directly without re-running long easing curves
    if (delta < 0.05 && from > 0) {
      currentRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return;
    }

    const startTime = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / Math.max(120, durationMs));
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (safeTarget - from) * eased;
      currentRef.current = next;
      setDisplayValue(next);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        currentRef.current = safeTarget;
        setDisplayValue(safeTarget);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [safeTarget, durationMs]);

  const totalDecimals = decimals + subDecimals;
  const formatted = formatWithIndianGrouping(displayValue, totalDecimals);

  if (subDecimals > 0) {
    const mainPart = formatted.slice(0, formatted.length - subDecimals);
    const subPart = formatted.slice(formatted.length - subDecimals);
    return (
      <span className={`font-mono-tabular tabular-nums ${className}`}>
        {prefix}
        {mainPart}
        <span className={subClassName}>{subPart}</span>
      </span>
    );
  }

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
    </span>
  );
}
