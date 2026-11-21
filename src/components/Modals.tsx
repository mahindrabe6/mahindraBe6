import { useEffect, useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Info,
  Send,
  Zap,
  CheckCircle2,
  Headset,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
} from 'lucide-react';
import {
  DAILY_CHECKIN_CODE,
  InvestmentPlan,
  PLATFORM_INFO,
  Transaction,
  formatINR,
  formatRelativeTime,
} from '../lib/investmentEngine';
import { VehicleImage } from './VehicleImage';
import { fireCelebrationConfetti } from './SuccessCelebration';

export function PlatformInfoModal({
  open,
  onClose,
  onJoinChannel,
}: {
  open: boolean;
  onClose: () => void;
  onJoinChannel: () => void;
}) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="platform-info-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-2xl bg-white dark:bg-[#0E1422] border border-[#E4E7EE] dark:border-white/[0.1] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-5 shadow-2xl space-y-4"
      >
        <div
          aria-hidden="true"
          className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/15 mx-auto sm:hidden"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
            <h2
              id="platform-info-title"
              className="text-base font-bold text-[#0F172A] dark:text-white"
            >
              Mahindra BE6 Platform Guide
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close platform info"
            className="min-w-[44px] min-h-[44px] rounded-full bg-[#F1F3F6] dark:bg-[#192234] text-[#0F172A] dark:text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
          {PLATFORM_INFO.map((row) => (
            <div
              key={row.label}
              className="py-2.5 flex items-center justify-between text-xs gap-4"
            >
              <span className="text-[#64748B] dark:text-[#94A3B8]">
                {row.label}
              </span>
              <span className="font-bold text-[#0F172A] dark:text-white text-right">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onJoinChannel}
          className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Official Telegram Channel</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

export function PurchaseConfirmModal({
  plan,
  balance,
  onClose,
  onConfirm,
  onGoToRecharge,
}: {
  plan: InvestmentPlan | null;
  balance: number;
  onClose: () => void;
  onConfirm: (plan: InvestmentPlan) => Promise<{ ok: boolean; message: string }>;
  onGoToRecharge: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setError(null);
    setConfirmed(false);
    setSubmitting(false);
  }, [plan?.id]);

  if (!plan) return null;

  const canAfford = balance >= plan.investmentAmount;
  const dailyPct = Math.round(
    (plan.dailyIncome / plan.investmentAmount) * 100,
  );

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await onConfirm(plan);
      if (!res.ok) {
        setError(res.message);
      } else {
        setError(null);
        setConfirmed(true);
        fireCelebrationConfetti();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-2xl bg-white dark:bg-[#0E1422] border border-[#E4E7EE] dark:border-white/[0.1] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-5 shadow-2xl space-y-4"
      >
        <div
          aria-hidden="true"
          className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/15 mx-auto sm:hidden"
        />
        <div className="flex items-center justify-between">
          <h2
            id="purchase-modal-title"
            className="text-base font-bold text-[#0F172A] dark:text-white"
          >
            {confirmed
              ? 'Plan Activated!'
              : 'Confirm Mahindra BE6 Investment'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close purchase modal"
            className="min-w-[44px] min-h-[44px] rounded-full bg-[#F1F3F6] dark:bg-[#192234] text-[#0F172A] dark:text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {confirmed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="space-y-4 text-center py-2"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm"
            >
              <CheckCircle2 className="w-8 h-8" />
            </motion.div>

            <div className="space-y-1">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B86B28] dark:text-[#E08E45]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fleet Earning Started</span>
              </p>
              <p className="text-base font-extrabold text-[#0F172A] dark:text-white">
                {plan.name} · {plan.modelName}
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Active for {plan.durationDays} days · Yields credit automatically
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-left">
              <div className="p-3 rounded-xl bg-[#F6F7FA] dark:bg-[#192234]">
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Daily Earning
                </p>
                <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                  +{formatINR(plan.dailyIncome)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F6F7FA] dark:bg-[#192234]">
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Total Earning
                </p>
                <p className="text-sm font-extrabold text-[#0F172A] dark:text-white tabular-nums mt-0.5">
                  {formatINR(plan.totalIncome)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Done</span>
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#F6F7FA] dark:bg-[#192234]">
              <VehicleImage
                src={plan.imageUrl}
                alt={plan.modelName}
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
              <div>
                <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                  {plan.name} · {plan.modelName}
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {plan.durationDays} Days · Daily {formatINR(plan.dailyIncome)} (
                  {dailyPct}%)
                </p>
                <p className="text-xs font-bold text-[#B86B28] dark:text-[#E08E45] mt-0.5">
                  Total Earning: {formatINR(plan.totalIncome)}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  Investment Required
                </span>
                <span className="font-bold text-[#0F172A] dark:text-white tabular-nums">
                  {formatINR(plan.investmentAmount, true)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  Your Wallet Balance
                </span>
                <span className="font-bold text-[#0F172A] dark:text-white tabular-nums">
                  {formatINR(balance, true)}
                </span>
              </div>
            </div>

            {error && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            {canAfford ? (
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirm}
                className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Zap className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Activating Plan...'
                    : `Confirm & Activate (${formatINR(plan.investmentAmount)})`}
                </span>
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-amber-700 dark:text-[#E08E45] font-medium">
                  Insufficient balance. Recharge via UPI/QR to activate this
                  Mahindra BE6 plan.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToRecharge();
                  }}
                  className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>Recharge Wallet Now</span>
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export function SupportModal({
  open,
  mode,
  checkInCode,
  onClose,
}: {
  open: boolean;
  mode: 'support' | 'channel';
  checkInCode?: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  if (!open) return null;

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSent(true);
    setMessage('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-2xl bg-white dark:bg-[#0E1422] border border-[#E4E7EE] dark:border-white/[0.1] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-5 shadow-2xl space-y-4"
      >
        <div
          aria-hidden="true"
          className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/15 mx-auto sm:hidden"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === 'support' ? (
              <Headset className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
            ) : (
              <Send className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
            )}
            <h2
              id="support-modal-title"
              className="text-base font-bold text-[#0F172A] dark:text-white"
            >
              {mode === 'support'
                ? 'Mahindra BE6 Support'
                : 'Official Telegram Channel'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-w-[44px] min-h-[44px] rounded-full bg-[#F1F3F6] dark:bg-[#192234] text-[#0F172A] dark:text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === 'channel' ? (
          <div className="space-y-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
            <p>
              Daily gift codes, Mahindra BE6 luxury fleet updates, and UTR
              verification notices are posted every morning at 9:00 AM IST.
            </p>
            <div className="p-3 rounded-xl bg-[#F6F7FA] dark:bg-[#192234] text-[#0F172A] dark:text-[#E08E45] font-mono-tabular">
              Channel: @MahindraBE6Official · Today’s Code:{' '}
              {checkInCode ?? DAILY_CHECKIN_CODE}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] rounded-xl bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] font-bold text-sm cursor-pointer"
            >
              Got It
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-3">
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Our fleet &amp; UTR verification specialists respond within 15
              minutes (09:00–22:00 IST).
            </p>
            <label htmlFor="support-msg-input" className="sr-only">
              Support message
            </label>
            <textarea
              id="support-msg-input"
              rows={3}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setSent(false);
              }}
              placeholder="Describe your question about UPI UTR verification, bank payout, or BE6 plans..."
              className="w-full p-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F6F7FA] dark:bg-[#090D16] text-[#0F172A] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
            />
            {sent && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Support ticket submitted. Reference #BE6-4092.</span>
              </div>
            )}
            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] font-bold text-sm cursor-pointer"
            >
              Send Message
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

export function AllTransactionsModal({
  open,
  transactions,
  onClose,
}: {
  open: boolean;
  transactions: Transaction[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-tx-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-[28px] sm:rounded-2xl bg-white dark:bg-[#0E1422] border border-[#E4E7EE] dark:border-white/[0.1] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-5 shadow-2xl"
      >
        <div
          aria-hidden="true"
          className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/15 mx-auto mb-3 sm:hidden shrink-0"
        />
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E8EE] dark:border-white/[0.08]">
          <h2
            id="all-tx-title"
            className="text-base font-bold text-[#0F172A] dark:text-white"
          >
            Account Transaction History
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transactions"
            className="min-w-[44px] min-h-[44px] rounded-full bg-[#F1F3F6] dark:bg-[#192234] text-[#0F172A] dark:text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto divide-y divide-[#E6E8EE] dark:divide-white/[0.06] mt-2">
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
              No transactions recorded yet.
            </p>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      tx.isCredit
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-[#F1F3F6] text-[#B86B28] dark:bg-[#192234] dark:text-[#E08E45]'
                    }`}
                  >
                    {tx.isCredit ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                      {tx.userLabel}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate">
                      {tx.description}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      tx.isCredit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-[#0F172A] dark:text-[#E08E45]'
                    }`}
                  >
                    {tx.isCredit ? '+' : '-'}
                    {formatINR(tx.amount)}
                  </p>
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                    {formatRelativeTime(tx.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
