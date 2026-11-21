import { useState, FormEvent } from 'react';
import {
  KeyRound,
  Gift,
  Info,
  Bell,
  Send,
  IndianRupee,
  Clock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  AppState,
  DAILY_CHECKIN_CODE,
  formatINR,
  getTodayDateString,
} from '../lib/investmentEngine';

interface CheckInViewProps {
  state: AppState;
  onClaimCheckIn: (code: string) => Promise<{ ok: boolean; message: string }>;
  onOpenChannel: () => void;
}

export function CheckInView({
  state,
  onClaimCheckIn,
  onOpenChannel,
}: CheckInViewProps) {
  const [code, setCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const todayStr = getTodayDateString();
  const alreadyClaimed = state.lastCheckInDate === todayStr;
  const officialCode = state.settings?.dailyCheckInCode ?? DAILY_CHECKIN_CODE;
  const rewardAmount = state.settings?.checkInRewardAmount ?? 25;

  const submitClaim = async (claimCode: string) => {
    setClaiming(true);
    try {
      const res = await onClaimCheckIn(claimCode);
      if (res.ok) {
        setFeedback({ type: 'success', text: res.message });
        setCode('');
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submitClaim(code.trim() || 'DAILY');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* One-Tap Daily Bonus Banner (Once Per Day) */}
      <section className="rounded-2xl bg-[#0F172A] dark:bg-[#111827] border border-[#0F172A] dark:border-white/[0.08] text-white p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#E08E45]">
              <Sparkles className="w-4 h-4" />
              <span>Once Per Day · Instant Wallet Credit</span>
            </p>
            <h2 className="text-xl font-extrabold tracking-tight mt-1">
              Daily Fleet Loyalty Bonus ({formatINR(rewardAmount)})
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {alreadyClaimed
                ? `Claimed for ${todayStr}. Your next daily bonus unlocks at 12:00 AM.`
                : `Tap once today to credit ${formatINR(rewardAmount)} directly to your withdrawable wallet.`}
            </p>
          </div>
          <span className="w-11 h-11 rounded-xl bg-[#E08E45] text-[#090D16] flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5" />
          </span>
        </div>

        <button
          type="button"
          disabled={alreadyClaimed || claiming}
          onClick={() => submitClaim('DAILY')}
          className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#E08E45] hover:bg-[#EA9B54] disabled:bg-white/10 disabled:text-slate-300 text-[#090D16] text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Gift className="w-4 h-4" />
          <span>
            {alreadyClaimed
              ? `Bonus Claimed Today (${formatINR(state.lastCheckInReward ?? rewardAmount)})`
              : claiming
                ? 'Crediting Bonus...'
                : `Claim Today's ${formatINR(rewardAmount)} Daily Bonus`}
          </span>
        </button>
      </section>

      {/* Optional Promo / Channel Code Form */}
      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-8 h-8 rounded-lg bg-[#F1F3F6] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
            Or Enter Daily Check-In Code
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="checkin-code-input" className="sr-only">
              Daily check-in code
            </label>
            <input
              id="checkin-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={alreadyClaimed}
              placeholder={`Optional: enter ${officialCode}`}
              className="w-full min-h-[48px] px-4 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-white placeholder:normal-case placeholder:text-[#94A3B8] text-sm font-medium uppercase focus:outline-none focus:ring-2 focus:ring-[#B86B28] disabled:opacity-60"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#B86B28] dark:text-[#E08E45] shrink-0" />
              <span>
                Daily updates on{' '}
                <button
                  type="button"
                  onClick={onOpenChannel}
                  className="min-h-[36px] font-semibold text-[#B86B28] dark:text-[#E08E45] hover:underline cursor-pointer"
                >
                  Telegram channel
                </button>
              </span>
            </div>
            {!alreadyClaimed && (
              <button
                type="button"
                onClick={() => setCode(officialCode)}
                className="min-h-[36px] text-xs font-semibold text-[#B86B28] dark:text-[#E08E45] hover:underline cursor-pointer"
              >
                Fill code: {officialCode}
              </button>
            )}
          </div>

          {feedback && (
            <div
              role="status"
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.text}</span>
            </div>
          )}

          {alreadyClaimed && !feedback && (
            <div className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Today’s reward ({formatINR(state.lastCheckInReward ?? rewardAmount)}) has
                been credited to your wallet.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={alreadyClaimed || claiming}
            className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#192234] dark:hover:bg-[#232F46] disabled:bg-slate-200 dark:disabled:bg-white/[0.06] text-white disabled:text-slate-500 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Gift className="w-4 h-4" />
            <span>{alreadyClaimed ? 'Claimed Today' : 'Claim With Code'}</span>
          </button>
        </form>
      </section>

      {/* Check-In Guidelines Card */}
      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="w-8 h-8 rounded-lg bg-[#F1F3F6] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center">
            <Info className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
            Daily Bonus Guidelines
          </h2>
        </div>

        <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
          <div className="flex items-center gap-3 py-3 first:pt-1">
            <span className="w-9 h-9 rounded-xl bg-[#F6F7FA] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                Once Every 24 Hours
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Every investor can claim the daily bonus once per calendar day
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-3">
            <span className="w-9 h-9 rounded-xl bg-[#F6F7FA] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                Official Channel Updates
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Bonus boosts &amp; fleet updates posted on our{' '}
                <button
                  type="button"
                  onClick={onOpenChannel}
                  className="font-semibold text-[#B86B28] dark:text-[#E08E45] hover:underline cursor-pointer"
                >
                  Telegram channel
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-3">
            <span className="w-9 h-9 rounded-xl bg-[#F6F7FA] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                Today’s Bonus Amount
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Fixed{' '}
                <strong className="text-[#B86B28] dark:text-[#E08E45]">
                  {formatINR(rewardAmount)}
                </strong>{' '}
                credited instantly to your wallet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-3 last:pb-1">
            <span className="w-9 h-9 rounded-xl bg-[#F6F7FA] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                Daily Reset Window
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Next claim unlocks at{' '}
                <strong className="text-[#B86B28] dark:text-[#E08E45]">
                  12:00 AM IST
                </strong>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
