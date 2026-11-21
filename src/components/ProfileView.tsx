import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Wallet,
  BanknoteArrowUp,
  Landmark,
  Settings,
  CarFront,
  CheckCircle2,
  Coins,
  ChevronRight,
  LogOut,
  History,
  Clock,
  TrendingUp,
} from 'lucide-react';
import {
  AppRoute,
  AppState,
  computePendingYieldSummary,
  formatINR,
  getActiveOngoingPlans,
  getPlanStatus,
  getRemainingDurationDays,
  getTodayDateString,
  maskAccountNumber,
} from '../lib/investmentEngine';
import { VehicleImage } from './VehicleImage';
import { AnimatedCounter } from './AnimatedCounter';

interface ProfileViewProps {
  state: AppState;
  onNavigate: (route: AppRoute) => void;
  onClaimYield: (activePlanId: string) => Promise<{ ok: boolean; message: string }>;
  onOpenAllTransactions: () => void;
  onLogout: () => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function ProfileView({
  state,
  onNavigate,
  onClaimYield,
  onOpenAllTransactions,
  onLogout,
}: ProfileViewProps) {
  const [yieldFeedback, setYieldFeedback] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<
    'all' | 'active' | 'completed'
  >('all');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const todayStr = getTodayDateString(new Date(nowMs));

  const ongoingPlans = getActiveOngoingPlans(state.activePlans);
  const totalDailyYield = ongoingPlans.reduce((sum, p) => sum + p.dailyIncome, 0);

  const pendingYield = useMemo(
    () => computePendingYieldSummary(state.activePlans, todayStr, nowMs),
    [state.activePlans, todayStr, nowMs],
  );

  // Live ticker for Pending Yield real-time accumulation when yield is accruing
  useEffect(() => {
    if (
      pendingYield.claimableTodayTotal <= 0 ||
      pendingYield.accruedAmount >= pendingYield.claimableTodayTotal
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 100);
    return () => window.clearInterval(timer);
  }, [pendingYield.claimableTodayTotal, pendingYield.accruedAmount]);

  const historyPlans = state.activePlans.filter((p) => {
    if (historyFilter === 'all') return true;
    return getPlanStatus(p) === historyFilter;
  });

  const handleClaim = async (planId: string) => {
    const res = await onClaimYield(planId);
    setYieldFeedback(res.message);
    window.setTimeout(() => setYieldFeedback(null), 3500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Luxury Portfolio & Live Pending Yield Hero Card */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B101D] via-[#11192E] to-[#080C16] text-white p-5 md:p-6 border border-white/[0.08] shadow-[0_20px_48px_-24px_rgba(9,13,22,0.55)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(229,154,84,0.16),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(52,211,153,0.12),transparent_50%)]"
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E59A54] to-[#C8742D] text-[#090D16] font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
              BE6
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {state.auth.userName}
              </p>
              <p className="text-xs text-slate-300 font-mono-tabular truncate">
                ID: {state.userId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              aria-label="Open Settings"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Log Out"
              className="min-h-[44px] px-3.5 rounded-xl bg-white/10 hover:bg-rose-600/80 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Real-Time Pending Yield Live Accrual Display */}
        <div
          aria-label="Pending Yield"
          className="relative z-10 mt-5 pt-4 border-t border-white/12 flex flex-col sm:flex-row sm:items-end justify-between gap-3"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pending Yield</span>
              {pendingYield.claimableTodayTotal > 0 && (
                <span className="text-[11px] font-normal text-slate-400 font-mono-tabular">
                  · +{formatINR(pendingYield.yieldPerHour, true)}/hr
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2.5 flex-wrap">
              <AnimatedCounter
                value={pendingYield.accruedAmount}
                decimals={2}
                subDecimals={2}
                durationMs={700}
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
                subClassName="text-sm sm:text-base font-semibold text-emerald-400/85"
              />
              {pendingYield.claimableTodayTotal > 0 ? (
                <span className="text-[11px] text-slate-300 tabular-nums">
                  of {formatINR(pendingYield.claimableTodayTotal)} ready today
                </span>
              ) : pendingYield.allClaimedToday ? (
                <span className="text-[11px] text-emerald-300/90">
                  Today’s yield claimed · Resets 12:00 AM
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Activate a BE6 plan to earn live yield
                </span>
              )}
            </div>
          </div>

          {pendingYield.unclaimedCount > 0 && (
            <span className="text-[11px] font-semibold text-[#E59A54] tabular-nums whitespace-nowrap">
              {pendingYield.unclaimedCount}{' '}
              {pendingYield.unclaimedCount === 1 ? 'vehicle' : 'vehicles'}{' '}
              accruing
            </span>
          )}
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/12">
          <div>
            <p className="text-[11px] text-slate-400">Wallet Balance</p>
            <p className="text-base sm:text-lg font-extrabold text-white mt-0.5">
              <AnimatedCounter value={state.balance} decimals={0} durationMs={600} />
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Active Vehicles</p>
            <p className="text-base sm:text-lg font-extrabold tabular-nums text-white mt-0.5">
              {ongoingPlans.length}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Daily Yield</p>
            <p className="text-base sm:text-lg font-extrabold tabular-nums text-[#E59A54] mt-0.5">
              <AnimatedCounter
                value={totalDailyYield}
                decimals={0}
                durationMs={550}
              />
            </p>
          </div>
        </div>
      </motion.section>

      {/* Clean Wallet & Account Shortcuts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.04, ease: EASE_OUT_EXPO }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <button
          type="button"
          onClick={() => onNavigate('recharge')}
          className="min-h-[50px] p-3.5 rounded-2xl bg-white dark:bg-[#0E1422] border border-[#E4E7EE] dark:border-white/[0.08] hover:border-[#C26D27]/50 dark:hover:border-[#E59A54]/40 flex items-center gap-2.5 text-left active:scale-[0.97] transition-all cursor-pointer"
        >
          <Wallet className="w-4 h-4 text-[#C26D27] dark:text-[#E59A54] shrink-0" />
          <span className="text-xs font-bold text-[#0F172A] dark:text-white whitespace-nowrap">
            Recharge
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('withdraw')}
          className="min-h-[50px] p-3.5 rounded-2xl bg-white dark:bg-[#0E1422] border border-[#E4E7EE] dark:border-white/[0.08] hover:border-[#C26D27]/50 dark:hover:border-[#E59A54]/40 flex items-center gap-2.5 text-left active:scale-[0.97] transition-all cursor-pointer"
        >
          <BanknoteArrowUp className="w-4 h-4 text-[#C26D27] dark:text-[#E59A54] shrink-0" />
          <span className="text-xs font-bold text-[#0F172A] dark:text-white whitespace-nowrap">
            Withdraw
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('bank')}
          className="min-h-[50px] p-3.5 rounded-2xl bg-white dark:bg-[#0E1422] border border-[#E4E7EE] dark:border-white/[0.08] hover:border-[#C26D27]/50 dark:hover:border-[#E59A54]/40 flex items-center gap-2.5 text-left active:scale-[0.97] transition-all cursor-pointer"
        >
          <Landmark className="w-4 h-4 text-[#C26D27] dark:text-[#E59A54] shrink-0" />
          <span className="text-xs font-bold text-[#0F172A] dark:text-white whitespace-nowrap">
            Bank Card
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="min-h-[50px] p-3.5 rounded-2xl bg-white dark:bg-[#0E1422] border border-[#E4E7EE] dark:border-white/[0.08] hover:border-[#C26D27]/50 dark:hover:border-[#E59A54]/40 flex items-center gap-2.5 text-left active:scale-[0.97] transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4 text-[#C26D27] dark:text-[#E59A54] shrink-0" />
          <span className="text-xs font-bold text-[#0F172A] dark:text-white whitespace-nowrap">
            Settings
          </span>
        </button>
      </motion.div>

      {yieldFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{yieldFeedback}</span>
        </motion.div>
      )}

      {/* Active Fleet Daily Yield Claim */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.08, ease: EASE_OUT_EXPO }}
        className="bg-white dark:bg-[#0E1422] rounded-2xl border border-[#E4E7EE] dark:border-white/[0.08] p-4 md:p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CarFront className="w-4 h-4 text-[#C26D27] dark:text-[#E59A54]" />
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
              Active Mahindra BE6 Fleet
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('plans')}
            className="min-h-[40px] px-2 text-xs font-semibold text-[#C26D27] dark:text-[#E59A54] hover:underline cursor-pointer whitespace-nowrap"
          >
            + Add Plan
          </button>
        </div>

        {ongoingPlans.length === 0 ? (
          <div className="py-5 text-center space-y-2">
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
              No ongoing fleet plans right now.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('plans')}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#0B1120] dark:bg-[#E59A54] text-white dark:text-[#090D16] text-xs font-bold active:scale-[0.98] transition-transform cursor-pointer"
            >
              Browse Plans
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E4E7EE] dark:divide-white/[0.06]">
            {ongoingPlans.map((ap) => {
              const claimedToday = ap.lastClaimDate === todayStr;
              const remaining = getRemainingDurationDays(ap);
              return (
                <div
                  key={ap.id}
                  className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <VehicleImage
                      src={ap.imageUrl}
                      alt={ap.modelName}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
                        {ap.name} · {ap.modelName}
                      </p>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                        Daily {formatINR(ap.dailyIncome)} · {remaining} days left
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={claimedToday}
                    onClick={() => handleClaim(ap.id)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0B1120] hover:bg-[#162036] dark:bg-[#E59A54] dark:hover:bg-[#ECA868] disabled:bg-[#F1F3F6] dark:disabled:bg-white/[0.06] disabled:text-[#64748B] dark:disabled:text-[#94A3B8] text-white dark:text-[#090D16] text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 active:scale-[0.98] transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>
                      {claimedToday
                        ? 'Yield Claimed'
                        : `Claim ${formatINR(ap.dailyIncome)}`}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Investment History with Sliding Filter Indicator & Animated Progress */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.12, ease: EASE_OUT_EXPO }}
        aria-label="Investment History"
        className="bg-white dark:bg-[#0E1422] rounded-2xl border border-[#E4E7EE] dark:border-white/[0.08] p-4 md:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#C26D27] dark:text-[#E59A54]" />
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
              Investment History ({state.activePlans.length})
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Filter Investment History"
            className="flex items-center gap-1 p-1 rounded-xl bg-[#F2F4F8] dark:bg-[#151D2F]"
          >
            {(['all', 'active', 'completed'] as const).map((tab) => {
              const selected = historyFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setHistoryFilter(tab)}
                  className={`relative min-h-[34px] px-3 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer whitespace-nowrap ${
                    selected
                      ? 'text-[#0F172A] dark:text-white'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="profile-history-tab"
                      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                      className="absolute inset-0 rounded-lg bg-white dark:bg-[#0B101D] shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{tab}</span>
                </button>
              );
            })}
          </div>
        </div>

        {historyPlans.length === 0 ? (
          <p className="py-5 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
            No {historyFilter === 'all' ? '' : historyFilter} Mahindra BE6 fleet
            investments found.
          </p>
        ) : (
          <div className="divide-y divide-[#E4E7EE] dark:divide-white/[0.06]">
            {historyPlans.map((ap) => {
              const remaining = getRemainingDurationDays(ap);
              const status = getPlanStatus(ap);
              const earnedSoFar = ap.daysClaimed * ap.dailyIncome;
              const pct = Math.min(
                100,
                Math.round((ap.daysClaimed / Math.max(1, ap.durationDays)) * 100),
              );
              return (
                <div
                  key={ap.id}
                  className="py-3.5 first:pt-1 last:pb-1 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <VehicleImage
                        src={ap.imageUrl}
                        alt={ap.modelName}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
                          {ap.name} · {ap.modelName}
                        </p>
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                          Invested {formatINR(ap.investmentAmount)} ·{' '}
                          {new Date(ap.purchasedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-bold ${
                          status === 'active'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[#64748B] dark:text-[#94A3B8]'
                        }`}
                      >
                        {status === 'active' ? 'Active' : 'Completed'}
                      </span>
                      <p className="text-xs font-bold text-[#0F172A] dark:text-white tabular-nums mt-0.5">
                        {formatINR(earnedSoFar)} / {formatINR(ap.totalIncome)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 h-1.5 rounded-full bg-[#F1F3F6] dark:bg-[#151D2F] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                        className={`h-full rounded-full ${
                          status === 'active'
                            ? 'bg-gradient-to-r from-[#C26D27] to-[#E59A54]'
                            : 'bg-emerald-600 dark:bg-emerald-400'
                        }`}
                      />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#0F172A] dark:text-[#E2E8F0] tabular-nums whitespace-nowrap shrink-0">
                      <Clock className="w-3.5 h-3.5 text-[#C26D27] dark:text-[#E59A54]" />
                      <span>
                        {remaining > 0
                          ? `${remaining} of ${ap.durationDays} days remaining`
                          : '0 days remaining · Completed'}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Account Links & Logout */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.16, ease: EASE_OUT_EXPO }}
        className="bg-white dark:bg-[#0E1422] rounded-2xl border border-[#E4E7EE] dark:border-white/[0.08] divide-y divide-[#E4E7EE] dark:divide-white/[0.06]"
      >
        <button
          type="button"
          onClick={() => onNavigate('bank')}
          aria-label="Manage Linked Bank Account"
          className="w-full min-h-[56px] p-4 flex items-center justify-between text-left hover:bg-[#F8FAFC] dark:hover:bg-[#151D2F]/60 rounded-t-2xl transition-colors cursor-pointer"
        >
          <div>
            <p className="text-sm font-bold text-[#0F172A] dark:text-white">
              Linked Bank Account
            </p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono-tabular">
              {state.bankDetails
                ? `${state.bankDetails.accountHolderName} · ${maskAccountNumber(state.bankDetails.accountNumber)}`
                : 'Not configured'}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={onOpenAllTransactions}
          aria-label="Open Transaction Ledger"
          className="w-full min-h-[56px] p-4 flex items-center justify-between text-left hover:bg-[#F8FAFC] dark:hover:bg-[#151D2F]/60 transition-colors cursor-pointer"
        >
          <div>
            <p className="text-sm font-bold text-[#0F172A] dark:text-white">
              Transaction Ledger
            </p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              {state.transactions.length} account activities
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign Out of Account"
          className="w-full min-h-[56px] p-4 flex items-center justify-between text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 rounded-b-2xl transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-bold">Log Out</span>
          </div>
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.section>
    </div>
  );
}
