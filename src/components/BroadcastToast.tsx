import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, BellRing, Megaphone, X } from 'lucide-react';
import { BroadcastMessage, BroadcastTone } from '../lib/broadcastMessage';

interface BroadcastToastProps {
  broadcast: BroadcastMessage | null;
  onDismiss: (broadcastId: string) => void;
}

const TONE_META: Record<
  BroadcastTone,
  {
    label: string;
    accentBg: string;
    accentText: string;
    border: string;
    icon: typeof Megaphone;
  }
> = {
  promo: {
    label: 'Promotional Alert',
    accentBg: 'bg-[#C26D27] dark:bg-[#E08E45]',
    accentText: 'text-[#C26D27] dark:text-[#E08E45]',
    border: 'border-[#E08E45]/50 dark:border-[#E08E45]/40',
    icon: Megaphone,
  },
  warning: {
    label: 'System Alert',
    accentBg: 'bg-rose-600 dark:bg-rose-500',
    accentText: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-300 dark:border-rose-500/40',
    icon: AlertTriangle,
  },
  info: {
    label: 'Platform Notice',
    accentBg: 'bg-emerald-600 dark:bg-emerald-500',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-500/40',
    icon: BellRing,
  },
};

export function BroadcastToast({ broadcast, onDismiss }: BroadcastToastProps) {
  useEffect(() => {
    if (!broadcast) return;
    const timer = window.setTimeout(() => {
      onDismiss(broadcast.id);
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [broadcast, onDismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-16 md:top-20 inset-x-3 sm:inset-x-auto sm:right-5 sm:w-[390px] z-50"
    >
      <AnimatePresence mode="wait">
        {broadcast && (() => {
          const meta = TONE_META[broadcast.tone] ?? TONE_META.info;
          const Icon = meta.icon;
          return (
            <motion.div
              key={broadcast.id}
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              role="status"
              aria-label="Broadcast Notification"
              className={`pointer-events-auto rounded-2xl bg-white/95 dark:bg-[#0E1422]/95 backdrop-blur-md border ${meta.border} shadow-[0_18px_40px_-14px_rgba(9,13,22,0.35)] p-3.5 flex items-start gap-3`}
            >
              <span
                className={`w-9 h-9 rounded-xl ${meta.accentBg} text-white dark:text-[#090D16] flex items-center justify-center shrink-0 shadow-xs`}
              >
                <Icon className="w-4 h-4" />
              </span>

              <div className="min-w-0 flex-1 space-y-0.5">
                <p
                  className={`text-[10px] font-extrabold uppercase tracking-wider ${meta.accentText}`}
                >
                  {meta.label}
                </p>
                <p className="text-xs font-extrabold text-[#0F172A] dark:text-white leading-snug">
                  {broadcast.title}
                </p>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed break-words">
                  {broadcast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(broadcast.id)}
                aria-label="Dismiss notification"
                className="min-w-[34px] min-h-[34px] -mr-1 -mt-1 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
