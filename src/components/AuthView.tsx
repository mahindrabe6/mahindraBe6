import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CarFront,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Landmark,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Zap,
} from 'lucide-react';
import {
  HERO_BANNER_IMAGE,
  INVESTMENT_PLANS,
  InvestmentPlan,
  formatAccountIdentifier,
  formatINR,
} from '../lib/investmentEngine';
import { VehicleImage } from './VehicleImage';

interface AuthViewProps {
  phase: 'signin' | 'onboarding';
  signedInEmail?: string;
  signedInName?: string;
  initialInviteCode?: string | null;
  signupBonusAmount?: number;
  plansCatalog?: InvestmentPlan[];
  onPasswordSignIn: (
    identifier: string,
    password: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  onPasswordRegister: (
    name: string,
    identifier: string,
    password: string,
    inviteCode?: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  onGoogleSignIn: () => Promise<{ ok: boolean; message?: string }>;
  onCompleteOnboarding: (
    name: string,
    phone: string,
    inviteCode?: string,
  ) => Promise<{ ok: boolean; message: string }>;
  onSignOut: () => Promise<void>;
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="w-4 h-4 shrink-0"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.54-5.17 3.54-8.88Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.21 7.21 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function AuthView({
  phase,
  signedInEmail = '',
  signedInName = '',
  initialInviteCode = null,
  signupBonusAmount = 40,
  plansCatalog = INVESTMENT_PLANS,
  onPasswordSignIn,
  onPasswordRegister,
  onGoogleSignIn,
  onCompleteOnboarding,
  onSignOut,
}: AuthViewProps) {
  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState(signedInName);
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formCardRef = useRef<HTMLDivElement | null>(null);
  const identifierInputRef = useRef<HTMLInputElement | null>(null);

  const showcasePlans = useMemo(() => {
    const source = plansCatalog.length > 0 ? plansCatalog : INVESTMENT_PLANS;
    const preferredIds = ['normal-a', 'normal-popular', 'vip-c'];
    const picked = preferredIds
      .map((id) => source.find((p) => p.id === id))
      .filter((p): p is InvestmentPlan => Boolean(p));
    return picked.length >= 2 ? picked : source.slice(0, 3);
  }, [plansCatalog]);

  const [previewPlanId, setPreviewPlanId] = useState<string>('normal-popular');
  const activePreviewPlan =
    showcasePlans.find((p) => p.id === previewPlanId) ?? showcasePlans[0];

  useEffect(() => {
    if (signedInName && !name) {
      setName(signedInName);
    }
  }, [signedInName, name]);

  useEffect(() => {
    if (initialInviteCode) {
      setAuthTab('register');
    }
  }, [initialInviteCode]);

  const handleTabChange = (nextTab: 'register' | 'login') => {
    setAuthTab(nextTab);
    setError(null);
  };

  const focusSignupWithPlan = (planId?: string) => {
    if (planId) {
      setPreviewPlanId(planId);
    }
    setAuthTab('register');
    setError(null);
    formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      identifierInputRef.current?.focus();
    }, 220);
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res =
        authTab === 'login'
          ? await onPasswordSignIn(identifier, password)
          : await onPasswordRegister(
              '',
              identifier,
              password,
              initialInviteCode ?? undefined,
            );
      if (!res.ok && res.message) {
        setError(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await onGoogleSignIn();
      if (!res.ok && res.message) {
        setError(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnboardingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await onCompleteOnboarding(
        name,
        phone,
        initialInviteCode ?? undefined,
      );
      if (!res.ok) {
        setError(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formattedAccount = formatAccountIdentifier('', signedInEmail);
  const errorSuggestsLogin =
    Boolean(error) &&
    authTab === 'register' &&
    error!.toLowerCase().includes('already exists');

  return (
    <div className="min-h-screen bg-[#F3F4F7] dark:bg-[#070B13] md:py-10 md:px-6 relative overflow-x-hidden">
      {/* Subtle ambient copper radial spotlight on desktop */}
      <div
        aria-hidden="true"
        className="hidden md:block pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(224,142,69,0.11),transparent_48%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.06),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(224,142,69,0.12),transparent_45%)]"
      />

      <div className="relative z-10 w-full md:max-w-[1060px] mx-auto md:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex flex-col md:grid md:grid-cols-12 md:min-h-[600px] md:rounded-[28px] md:overflow-hidden bg-[#090D16] md:bg-white md:dark:bg-[#0F1624] md:border md:border-black/[0.07] md:dark:border-white/[0.08] md:shadow-[0_28px_72px_-24px_rgba(9,13,22,0.24)]"
        >
          {/* Compact Mobile Header + Full Desktop Showroom */}
          <div className="shrink-0 md:col-span-5 relative h-[136px] md:h-auto md:min-h-full flex flex-col justify-between px-4 pt-3.5 pb-6 md:p-8 text-white bg-[#090D16] overflow-hidden">
            <VehicleImage
              src={HERO_BANNER_IMAGE}
              alt="Mahindra BE6 Luxury Electric SUV"
              className="absolute inset-0 w-full h-full object-cover object-[center_45%] scale-[1.03]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/65 to-[#090D16]/45 md:via-[#090D16]/55 md:to-[#090D16]/30"
            />
            <div
              aria-hidden="true"
              className="hidden md:block absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent"
            />

            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-xs">
                  <CarFront className="w-4 h-4 text-[#E08E45]" />
                </span>
                <span className="text-sm md:text-base font-extrabold tracking-tight text-white">
                  Mahindra BE6
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-300 tabular-nums">
                ₹{signupBonusAmount} Join Bonus · ₹0 IMPS Fee
              </span>
            </div>

            {/* Mobile compact hook */}
            <div className="relative z-10 md:hidden">
              <h1 className="text-lg font-extrabold tracking-tight text-white leading-snug">
                Daily EV Fleet Returns from ₹250
              </h1>
            </div>

            {/* Desktop editorial showcase & interactive plan calculator */}
            <div className="relative z-10 hidden md:flex flex-col space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#E08E45]">
                  Electric Fleet Atelier
                </p>
                <h1 className="text-[28px] font-extrabold leading-[1.16] tracking-tight text-white text-balance">
                  Daily EV Fleet Returns. Paid Direct via IMPS.
                </h1>
                <p className="text-xs text-slate-300/95 leading-relaxed">
                  Start with ₹250, earn daily fleet returns, and withdraw to
                  your bank with zero platform fees.
                </p>
              </div>

              {activePreviewPlan && (
                <div className="rounded-2xl bg-[#0F172A]/85 backdrop-blur-md border border-white/12 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-300">
                      Choose Plan to Invest
                    </span>
                    <div className="flex items-center gap-1">
                      {showcasePlans.map((p) => {
                        const active = p.id === activePreviewPlan.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPreviewPlanId(p.id)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold tabular-nums cursor-pointer transition-colors ${
                              active
                                ? 'bg-[#E08E45] text-[#090D16]'
                                : 'bg-white/10 text-slate-200 hover:bg-white/15'
                            }`}
                          >
                            ₹{p.investmentAmount}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-white/10">
                    <div>
                      <p className="text-[10px] text-slate-400">You Invest</p>
                      <p className="text-sm font-extrabold text-white tabular-nums">
                        {formatINR(activePreviewPlan.investmentAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">
                        Total Earning
                      </p>
                      <p className="text-sm font-extrabold text-[#E08E45] tabular-nums">
                        {formatINR(activePreviewPlan.totalIncome)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">
                        Daily Earning
                      </p>
                      <p className="text-xs font-bold text-emerald-400 tabular-nums">
                        {formatINR(activePreviewPlan.dailyIncome)}/day
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Cycle</p>
                      <p className="text-xs font-bold text-slate-200 tabular-nums">
                        {activePreviewPlan.durationDays} Days
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong className="text-white">
                      Free ₹{signupBonusAmount} welcome bonus
                    </strong>{' '}
                    + daily ₹25 check-in reward
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#E08E45] shrink-0" />
                  <span>
                    Fast UPI top-ups &amp;{' '}
                    <strong className="text-white">₹0 fee IMPS</strong> bank
                    payouts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* High-Conversion Onboarding & Authentication Sheet (Above the fold on 390x844 mobile) */}
          <div
            ref={formCardRef}
            className="flex-1 md:flex-none md:col-span-7 -mt-4 md:mt-0 relative z-20 rounded-t-[24px] md:rounded-none bg-white dark:bg-[#0F1624] px-4 pt-3.5 pb-6 sm:px-7 md:px-10 md:py-8 flex flex-col justify-start md:justify-center shadow-[0_-14px_34px_rgba(9,13,22,0.3)] md:shadow-none"
          >
            <div className="w-full max-w-[460px] mx-auto space-y-3 md:space-y-4">
              {phase === 'signin' ? (
                <>
                  {/* Compact Mobile Plan Strip so form & CTAs fit 100% above the fold */}
                  {authTab === 'register' && activePreviewPlan && (
                    <div className="md:hidden rounded-xl bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#E2E8F0] dark:border-white/[0.08] px-3 py-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#0F172A] dark:text-white">
                          Plan Preview
                        </span>
                        <div className="flex items-center gap-1">
                          {showcasePlans.map((p) => {
                            const active = p.id === activePreviewPlan.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setPreviewPlanId(p.id)}
                                className={`min-h-[26px] px-2 rounded-md text-[11px] font-bold tabular-nums cursor-pointer transition-colors ${
                                  active
                                    ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                                    : 'bg-white dark:bg-[#192234] border border-[#E2E8F0] dark:border-white/[0.08] text-[#64748B] dark:text-[#94A3B8]'
                                }`}
                              >
                                ₹{p.investmentAmount}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-[#E2E8F0] dark:border-white/[0.06] text-center">
                        <div>
                          <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                            You Invest
                          </p>
                          <p className="text-xs font-extrabold text-[#0F172A] dark:text-white tabular-nums">
                            {formatINR(activePreviewPlan.investmentAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                            Daily Earning
                          </p>
                          <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatINR(activePreviewPlan.dailyIncome)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                            Total Earning
                          </p>
                          <p className="text-xs font-extrabold text-[#B86B28] dark:text-[#E08E45] tabular-nums">
                            {formatINR(activePreviewPlan.totalIncome)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <h2 className="text-xl md:text-[26px] font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] leading-tight">
                      {authTab === 'login'
                        ? 'Welcome back to BE6'
                        : `Join Free & Claim ₹${signupBonusAmount} Bonus`}
                    </h2>
                    <p className="text-xs md:text-[13px] text-[#64748B] dark:text-[#94A3B8]">
                      {authTab === 'login' ? (
                        'Sign in to view your BE6 fleet earnings or Admin Console.'
                      ) : (
                        <>
                          2-step setup ·{' '}
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            No OTP delay
                          </span>{' '}
                          · Instant{' '}
                          <span className="font-bold text-[#B86B28] dark:text-[#E08E45] tabular-nums">
                            ₹{signupBonusAmount} credit
                          </span>
                          .
                        </>
                      )}
                    </p>
                  </div>

                  {/* Recessed Mode Switcher */}
                  <div
                    role="tablist"
                    aria-label="Authentication Mode"
                    className="grid grid-cols-2 p-1 rounded-xl bg-[#F2F4F7] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06]"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={authTab === 'register'}
                      onClick={() => handleTabChange('register')}
                      className={`relative min-h-[42px] px-3 py-1.5 rounded-[10px] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        authTab === 'register'
                          ? 'text-[#0F172A] dark:text-[#090D16]'
                          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                      }`}
                    >
                      {authTab === 'register' && (
                        <motion.span
                          layoutId="auth-mode-tab"
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute inset-0 rounded-[10px] bg-white dark:bg-[#E59A54] shadow-[0_1px_3px_rgba(15,23,42,0.1)]"
                        />
                      )}
                      <UserPlus
                        className={`relative z-10 w-3.5 h-3.5 ${
                          authTab === 'register'
                            ? 'text-[#C26D27] dark:text-[#090D16]'
                            : ''
                        }`}
                      />
                      <span className="relative z-10">Register Free</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={authTab === 'login'}
                      onClick={() => handleTabChange('login')}
                      className={`relative min-h-[42px] px-3 py-1.5 rounded-[10px] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        authTab === 'login'
                          ? 'text-[#0F172A] dark:text-[#090D16]'
                          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                      }`}
                    >
                      {authTab === 'login' && (
                        <motion.span
                          layoutId="auth-mode-tab"
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute inset-0 rounded-[10px] bg-white dark:bg-[#E59A54] shadow-[0_1px_3px_rgba(15,23,42,0.1)]"
                        />
                      )}
                      <LogIn
                        className={`relative z-10 w-3.5 h-3.5 ${
                          authTab === 'login'
                            ? 'text-[#C26D27] dark:text-[#090D16]'
                            : ''
                        }`}
                      />
                      <span className="relative z-10">Login</span>
                    </button>
                  </div>

                  {authTab === 'register' && initialInviteCode && (
                    <div
                      role="status"
                      className="px-3.5 py-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45] shrink-0" />
                      <div className="text-xs text-[#0F172A] dark:text-[#F1F5F9]">
                        Invite applied (
                        <span className="font-mono-tabular font-bold text-[#B86B28] dark:text-[#E08E45]">
                          {initialInviteCode}
                        </span>
                        ) — welcome bonus ready.
                      </div>
                    </div>
                  )}

                  {/* Streamlined 2-Field Form (Mobile/Email + Password) */}
                  <form onSubmit={handlePasswordSubmit} className="space-y-2.5 md:space-y-3">
                    <div className="group">
                      <label
                        htmlFor="auth-identifier-input"
                        className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] mb-1"
                      >
                        10-Digit Mobile Number or Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#94A3B8] group-focus-within:text-[#B86B28] dark:group-focus-within:text-[#E08E45] transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          ref={identifierInputRef}
                          id="auth-identifier-input"
                          type="text"
                          required
                          autoComplete="username"
                          value={identifier}
                          onChange={(e) => {
                            setIdentifier(e.target.value);
                            setError(null);
                          }}
                          placeholder="e.g. 9876543210 or name@gmail.com"
                          className="w-full min-h-[46px] pl-10 pr-4 rounded-xl border border-[#E2E8F0] dark:border-white/[0.1] bg-[#F8FAFC] hover:bg-white focus:bg-white dark:bg-[#090D16]/90 dark:focus:bg-[#090D16] text-base sm:text-sm text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-[#B86B28] dark:focus:border-[#E08E45] focus:ring-4 focus:ring-[#B86B28]/10 transition-all duration-150"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label
                        htmlFor="auth-password-input"
                        className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] mb-1"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#94A3B8] group-focus-within:text-[#B86B28] dark:group-focus-within:text-[#E08E45] transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="auth-password-input"
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoComplete={
                            authTab === 'login'
                              ? 'current-password'
                              : 'new-password'
                          }
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError(null);
                          }}
                          placeholder={
                            authTab === 'login'
                              ? 'Enter your password'
                              : 'Create 6+ character password'
                          }
                          className="w-full min-h-[46px] pl-10 pr-12 rounded-xl border border-[#E2E8F0] dark:border-white/[0.1] bg-[#F8FAFC] hover:bg-white focus:bg-white dark:bg-[#090D16]/90 dark:focus:bg-[#090D16] text-base sm:text-sm text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-[#B86B28] dark:focus:border-[#E08E45] focus:ring-4 focus:ring-[#B86B28]/10 transition-all duration-150"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={
                            showPassword ? 'Hide password' : 'Show password'
                          }
                          className="w-10 h-10 absolute right-1 top-1/2 -translate-y-1/2 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div
                        role="alert"
                        className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/40 text-xs font-semibold text-rose-700 dark:text-rose-300 leading-relaxed space-y-1.5"
                      >
                        <p>{error}</p>
                        {errorSuggestsLogin && (
                          <button
                            type="button"
                            onClick={() => handleTabChange('login')}
                            className="inline-flex items-center gap-1 text-[#0F172A] dark:text-[#E08E45] font-bold underline cursor-pointer"
                          >
                            <span>Switch to Login with this account →</span>
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#0B1120] hover:bg-[#162036] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-sm font-bold flex items-center justify-center gap-2 shadow-[0_10px_24px_-10px_rgba(11,17,32,0.55)] dark:shadow-[0_10px_24px_-10px_rgba(224,142,69,0.4)] active:scale-[0.99] transition-all duration-150 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                    >
                      <span>
                        {submitting
                          ? authTab === 'login'
                            ? 'Signing in...'
                            : 'Activating Bonus...'
                          : authTab === 'login'
                            ? 'Sign In'
                            : `Claim ₹${signupBonusAmount} & Start Earning`}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#E08E45] dark:text-[#090D16] shrink-0" />
                    </button>
                  </form>

                  <div className="relative flex items-center py-0.5">
                    <div className="flex-grow border-t border-[#E6E8EE] dark:border-white/[0.08]" />
                    <span className="px-3 text-[11px] font-medium text-[#94A3B8] dark:text-[#64748B]">
                      or continue with Google
                    </span>
                    <div className="flex-grow border-t border-[#E6E8EE] dark:border-white/[0.08]" />
                  </div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleGoogleClick}
                    className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-white dark:bg-[#172133] hover:bg-[#F8FAFC] dark:hover:bg-[#1E2A40] border border-[#E2E8F0] hover:border-[#B86B28]/60 dark:border-white/[0.12] text-[#0F172A] dark:text-white text-[13px] font-bold flex items-center justify-center gap-2.5 active:scale-[0.99] transition-all duration-150 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    <GoogleMark />
                    <span>
                      {authTab === 'login'
                        ? 'Continue with Google (Investors & Admins)'
                        : '1-Tap Sign Up with Google'}
                    </span>
                  </button>

                  {/* Concise Trust & Transparency Strip */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E6E8EE] dark:border-white/[0.06] text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[10px] font-semibold text-[#475569] dark:text-[#94A3B8]">
                        Verified UPI
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Zap className="w-3.5 h-3.5 text-[#B86B28] dark:text-[#E08E45]" />
                      <span className="text-[10px] font-semibold text-[#475569] dark:text-[#94A3B8]">
                        15m IMPS Payout
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Gift className="w-3.5 h-3.5 text-[#0F172A] dark:text-white" />
                      <span className="text-[10px] font-semibold text-[#475569] dark:text-[#94A3B8]">
                        ₹0 Platform Fee
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[22px] md:text-[26px] font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                        Finish &amp; Claim ₹{signupBonusAmount}
                      </h2>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                        Signed in as{' '}
                        <span className="font-semibold text-[#0F172A] dark:text-white">
                          {formattedAccount}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onSignOut()}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F4F6F9] dark:bg-white/[0.06] text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-rose-600 flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Switch</span>
                    </button>
                  </div>

                  <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                    <div className="group">
                      <label
                        htmlFor="auth-name-input"
                        className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] mb-1.5"
                      >
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#94A3B8] group-focus-within:text-[#B86B28] dark:group-focus-within:text-[#E08E45] transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="auth-name-input"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-[#E2E8F0] dark:border-white/[0.1] bg-[#F8FAFC] hover:bg-white focus:bg-white dark:bg-[#090D16]/90 dark:focus:bg-[#090D16] text-base sm:text-sm text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-[#B86B28] dark:focus:border-[#E08E45] focus:ring-4 focus:ring-[#B86B28]/10 transition-all duration-150"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label
                        htmlFor="auth-phone-input"
                        className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] mb-1.5"
                      >
                        10-Digit Mobile Number (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#94A3B8] group-focus-within:text-[#B86B28] dark:group-focus-within:text-[#E08E45] transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="auth-phone-input"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={phone}
                          onChange={(e) =>
                            setPhone(
                              e.target.value.replace(/\D/g, '').slice(0, 10),
                            )
                          }
                          placeholder="Enter 10-digit mobile number"
                          className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-[#E2E8F0] dark:border-white/[0.1] bg-[#F8FAFC] hover:bg-white focus:bg-white dark:bg-[#090D16]/90 dark:focus:bg-[#090D16] text-base sm:text-sm font-mono-tabular text-[#0F172A] dark:text-white placeholder:font-sans placeholder:text-[#94A3B8] focus:outline-none focus:border-[#B86B28] dark:focus:border-[#E08E45] focus:ring-4 focus:ring-[#B86B28]/10 transition-all duration-150"
                        />
                      </div>
                    </div>

                    {initialInviteCode && (
                      <div
                        role="status"
                        className="px-3.5 py-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 flex items-center gap-2.5"
                      >
                        <Sparkles className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45] shrink-0" />
                        <div className="text-xs text-[#0F172A] dark:text-[#F1F5F9]">
                          Invite link automatically applied (
                          <span className="font-mono-tabular font-bold text-[#B86B28] dark:text-[#E08E45]">
                            {initialInviteCode}
                          </span>
                          ).
                        </div>
                      </div>
                    )}

                    {error && (
                      <p
                        role="alert"
                        className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/40 text-xs font-semibold text-rose-700 dark:text-rose-300"
                      >
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full min-h-[50px] px-5 py-3 rounded-xl bg-[#0B1120] hover:bg-[#162036] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-sm font-bold flex items-center justify-center gap-2 shadow-[0_10px_24px_-10px_rgba(11,17,32,0.55)] active:scale-[0.99] transition-all duration-150 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#E08E45] dark:text-[#090D16] shrink-0" />
                      <span>
                        {submitting
                          ? 'Activating Account...'
                          : `Activate & Claim ₹${signupBonusAmount} Bonus`}
                      </span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Below-the-Fold Fleet Transparency & 3-Step Guide (Helps hesitant visitors convert) */}
        {phase === 'signin' && (
          <section
            aria-label="How BE6 Fleet Works"
            className="bg-white dark:bg-[#0F1624] md:rounded-[24px] border-t md:border border-black/[0.06] dark:border-white/[0.08] px-4 py-6 md:p-7 space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#B86B28] dark:text-[#E08E45]">
                  How Mahindra BE6 Fleet Works
                </p>
                <h3 className="text-lg md:text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                  Start Earning in 3 Transparent Steps
                </h3>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                PhonePe, GPay, Paytm &amp; BHIM UPI supported · ₹0 IMPS withdrawal fee
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  step: '01',
                  title: `Join Free & Claim ₹${signupBonusAmount}`,
                  desc: `Enter your mobile/email or use 1-tap Google Sign-Up. ₹${signupBonusAmount} credits immediately with ₹25 daily check-in.`,
                },
                {
                  step: '02',
                  title: 'Pick Any BE6 Fleet Plan',
                  desc: 'Start from ₹250. Every plan clearly lists your investment, daily earning, duration, and total earning.',
                },
                {
                  step: '03',
                  title: 'Withdraw Direct to Bank',
                  desc: 'Request IMPS bank payouts straight from your wallet once verified — zero platform deduction.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-white/[0.03] border border-[#E6E8EE] dark:border-white/[0.07] space-y-1.5"
                >
                  <p className="text-xs font-mono-tabular font-extrabold text-[#B86B28] dark:text-[#E08E45]">
                    {item.step}.
                  </p>
                  <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {showcasePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] bg-white dark:bg-[#111827] overflow-hidden flex flex-col"
                >
                  <div className="h-36 bg-[#090D16] relative overflow-hidden">
                    <VehicleImage
                      src={plan.imageUrl}
                      alt={plan.modelName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2 text-white">
                      <div>
                        <p className="text-xs font-extrabold">{plan.name}</p>
                        <p className="text-[11px] text-slate-300">
                          {plan.durationDays} Days Cycle
                        </p>
                      </div>
                      <span className="text-sm font-extrabold text-[#E08E45] tabular-nums">
                        {formatINR(plan.investmentAmount)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          Daily Earning
                        </p>
                        <p className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatINR(plan.dailyIncome)}/day
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          Total Earning
                        </p>
                        <p className="font-extrabold text-[#0F172A] dark:text-white tabular-nums">
                          {formatINR(plan.totalIncome)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => focusSignupWithPlan(plan.id)}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>Start &amp; Claim ₹{signupBonusAmount}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
