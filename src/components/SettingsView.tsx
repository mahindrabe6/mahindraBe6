import {
  ArrowLeft,
  Contrast,
  ShieldCheck,
  Landmark,
  Send,
  Users,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import {
  AppRoute,
  AppState,
  formatAccountIdentifier,
} from '../lib/investmentEngine';
import { PasswordSecurityCard } from './PasswordSecurityCard';

interface SettingsViewProps {
  state: AppState;
  isImpersonating?: boolean;
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
  onToggleDarkMode: () => void;
  onOpenSupportModal: () => void;
  onOpenChannelModal: () => void;
  onLogout: () => void;
}

export function SettingsView({
  state,
  isImpersonating = false,
  onBack,
  onNavigate,
  onToggleDarkMode,
  onOpenSupportModal,
  onOpenChannelModal,
  onLogout,
}: SettingsViewProps) {
  return (
    <div className="max-w-xl mx-auto space-y-5">
      <section className="rounded-2xl bg-[#0F172A] dark:bg-[#111827] border border-[#0F172A] dark:border-white/[0.08] text-white px-4 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-bold">Settings</h2>
        <span className="w-11" aria-hidden="true" />
      </section>

      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#F1F3F6] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center">
              <Contrast className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                Theme Mode
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {state.darkMode ? 'Dark Obsidian Active' : 'Light Showroom Active'}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.darkMode}
            aria-label="Toggle dark mode"
            onClick={onToggleDarkMode}
            className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer ${
              state.darkMode ? 'bg-[#E08E45]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                state.darkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                Account Identity
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate">
                {formatAccountIdentifier(state.auth.phone, state.auth.email) ||
                  'Authenticated Account'}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('bank')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F6F7FA] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#F1F3F6] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                Bank Details
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Manage payout account
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#64748B]" />
        </button>

        <button
          type="button"
          onClick={onOpenChannelModal}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F6F7FA] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#F1F3F6] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center">
              <Send className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                Official Channel
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Join for latest updates
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#64748B]" />
        </button>

        <button
          type="button"
          onClick={onOpenSupportModal}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F6F7FA] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#F1F3F6] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                Customer Support
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Contact fleet &amp; UTR helpdesk
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#64748B]" />
        </button>
      </div>

      {isImpersonating ? (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 p-4 text-xs text-amber-900 dark:text-amber-200">
          <p className="font-bold">Admin Session Protection</p>
          <p className="mt-1 leading-relaxed">
            Password changes are disabled while logged into an investor’s
            account as Admin. Use Admin Console to send a password reset link
            to this user.
          </p>
        </div>
      ) : (
        <PasswordSecurityCard />
      )}

      <button
        type="button"
        onClick={onLogout}
        className="w-full min-h-[48px] px-5 py-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-[#111827] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out</span>
      </button>
    </div>
  );
}
