import { useState } from 'react';
import {
  Copy,
  Check,
  Share2,
  Users,
  UserPlus,
  Info,
  ArrowRight,
} from 'lucide-react';
import {
  AppState,
  buildInviteLink,
  computeTeamSummary,
  formatINR,
} from '../lib/investmentEngine';

interface ReferEarnViewProps {
  state: AppState;
}

export function ReferEarnView({ state }: ReferEarnViewProps) {
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);
  const [showAllMembers, setShowAllMembers] = useState(false);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const inviteLink = buildInviteLink(origin, state.referralCode);

  const overallSummary = computeTeamSummary(state.referralMembers);
  const levelSummary = computeTeamSummary(state.referralMembers, level);
  const levelMembers = state.referralMembers.filter((m) => m.level === level);

  const copyText = async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard fallback
    }
    setCopiedType(kind);
    window.setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <section className="rounded-2xl bg-[#0F172A] dark:bg-[#111827] text-white p-4 md:p-5 space-y-3 border border-[#0F172A] dark:border-white/[0.08]">
        <div>
          <p className="text-xs font-medium text-[#E08E45] mb-1.5">
            Your Referral Code
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 font-mono-tabular text-base font-bold tracking-widest">
              {state.referralCode}
            </div>
            <button
              type="button"
              onClick={() => copyText(state.referralCode, 'code')}
              aria-label="Copy referral code"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition-colors cursor-pointer"
            >
              {copiedType === 'code' ? (
                <Check className="w-4 h-4 text-emerald-300" />
              ) : (
                <Copy className="w-4 h-4 text-[#E08E45]" />
              )}
            </button>
          </div>
        </div>

        <div className="px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-xs text-slate-200 truncate font-mono-tabular">
          {inviteLink}
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/15 text-center">
          <div>
            <p className="text-lg font-extrabold tabular-nums">
              {overallSummary.totalMembers}
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">Total Team</p>
          </div>
          <div>
            <p className="text-lg font-extrabold tabular-nums">
              {formatINR(overallSummary.totalRecharge)}
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">Team Recharge</p>
          </div>
          <div>
            <p className="text-lg font-extrabold tabular-nums text-[#E08E45]">
              {formatINR(overallSummary.totalCommission)}
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">Commission</p>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => copyText(inviteLink, 'link')}
        className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        {copiedType === 'link' ? (
          <>
            <Check className="w-4 h-4 text-emerald-400 dark:text-[#090D16]" />
            <span>Invite Link Copied</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            <span>Share Invite Link</span>
          </>
        )}
      </button>

      <div
        role="tablist"
        aria-label="Referral Levels"
        className="grid grid-cols-3 p-1 rounded-xl bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08]"
      >
        {([1, 2, 3] as const).map((lvl) => {
          const active = level === lvl;
          return (
            <button
              key={lvl}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setLevel(lvl)}
              className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#0F172A] text-white dark:bg-[#E08E45] dark:text-[#090D16]'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              Level {lvl}
            </button>
          );
        })}
      </div>

      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#F1F3F6] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
              Level {level} Team
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAllMembers((prev) => !prev)}
            className="text-xs font-semibold text-[#B86B28] dark:text-[#E08E45] hover:underline flex items-center gap-1 min-h-[44px] px-1 cursor-pointer whitespace-nowrap"
          >
            <span>{showAllMembers ? 'Hide' : 'View all'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#E6E8EE] dark:divide-white/[0.08] py-1 text-center">
          <div>
            <p className="text-lg font-extrabold text-[#B86B28] dark:text-[#E08E45] tabular-nums">
              {levelSummary.commissionRate}%
            </p>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Commission
            </p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-[#0F172A] dark:text-white tabular-nums">
              {levelSummary.totalMembers}
            </p>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Members
            </p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-[#0F172A] dark:text-white tabular-nums">
              {formatINR(levelSummary.totalRecharge)}
            </p>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Recharge
            </p>
          </div>
        </div>

        {levelMembers.length === 0 ? (
          <div className="py-5 text-center space-y-1.5">
            <UserPlus className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              No members yet. Start sharing!
            </p>
          </div>
        ) : (
          showAllMembers && (
            <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
              {levelMembers.map((m) => (
                <div
                  key={m.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-[#0F172A] dark:text-white">
                    {m.userName ? `${m.userName} · ` : ''}
                    {m.maskedPhone}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                    +{formatINR(m.commissionEarned)}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1.5">
            <span className="w-8 h-8 rounded-full bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] text-xs font-bold inline-flex items-center justify-center">
              1
            </span>
            <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] leading-snug">
              Share your invite link
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="w-8 h-8 rounded-full bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] text-xs font-bold inline-flex items-center justify-center">
              2
            </span>
            <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] leading-snug">
              Friend registers &amp; invests
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="w-8 h-8 rounded-full bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] text-xs font-bold inline-flex items-center justify-center">
              3
            </span>
            <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] leading-snug">
              Earn commission instantly
            </p>
          </div>
        </div>

        <p className="pt-3 border-t border-[#E6E8EE] dark:border-white/[0.06] text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
          <strong className="text-[#0F172A] dark:text-white">Level 1:</strong>{' '}
          40% |{' '}
          <strong className="text-[#0F172A] dark:text-white">Level 2:</strong>{' '}
          0% |{' '}
          <strong className="text-[#0F172A] dark:text-white">Level 3:</strong>{' '}
          0% commission on investments.
        </p>
      </section>
    </div>
  );
}
