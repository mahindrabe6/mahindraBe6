import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { CarFront, LogOut, ShieldAlert } from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  AppRoute,
  AppState,
  BankDetails,
  DEFAULT_PLATFORM_SETTINGS,
  INITIAL_STATE,
  INVESTMENT_PLANS,
  InvestmentPlan,
  PaymentMethod,
  PlatformDatabase,
  PlatformSettings,
  UserAccount,
  deriveDisplayNameFromAuth,
  extractInviteCodeFromSearch,
  formatAccountIdentifier,
  parseAuthIdentifier,
  validatePasswordStrength,
} from './lib/investmentEngine';
import { getSwipeRouteDirection } from './lib/swipeNavigation';
import {
  resolveActiveInvestorTarget,
  resolveEffectiveAccountEmail,
} from './lib/adminImpersonation';
import { shouldDisplayBroadcastToast } from './lib/broadcastMessage';
import {
  InvestorSnapshotBundle,
  checkIsAdmin,
  claimDailyCheckInInFirestore,
  claimDailyYieldInFirestore,
  completeInvestorOnboarding,
  ensureAdminCatalogSeeded,
  ensureBootstrappedAdminRecord,
  purchasePlanInFirestore,
  recordUserLogin,
  runAdminFirestoreAction,
  saveBankDetailsInFirestore,
  submitRechargeInFirestore,
  submitWithdrawalInFirestore,
  subscribeAdminDatabase,
  subscribeInvestorBundle,
  subscribeIsAdmin,
  subscribePublicCatalog,
  toggleDarkModeInFirestore,
} from './lib/firestoreService';
import { AuthView } from './components/AuthView';
import { AppShell } from './components/AppShell';
import { HomeView } from './components/HomeView';
import { PlansView } from './components/PlansView';
import { CheckInView } from './components/CheckInView';
import { RechargeView } from './components/RechargeView';
import { WithdrawView } from './components/WithdrawView';
import { ReferEarnView } from './components/ReferEarnView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { BankDetailsView } from './components/BankDetailsView';
import { AdminView } from './components/AdminView';
import { BroadcastToast } from './components/BroadcastToast';
import {
  AllTransactionsModal,
  PlatformInfoModal,
  PurchaseConfirmModal,
  SupportModal,
} from './components/Modals';

const DISMISSED_BROADCASTS_KEY = 'be6_dismissed_broadcasts';

function readDismissedBroadcastIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_BROADCASTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

const PENDING_INVITE_KEY = 'be6_pending_invite';
const PENDING_INVITE_FROM_URL_KEY = 'be6_pending_invite_from_url';

function readInitialInvite(): { code: string | null; fromUrl: boolean } {
  if (typeof window === 'undefined') return { code: null, fromUrl: false };
  const fromUrl = extractInviteCodeFromSearch(window.location.search);
  if (fromUrl) {
    try {
      sessionStorage.setItem(PENDING_INVITE_KEY, fromUrl);
      sessionStorage.setItem(PENDING_INVITE_FROM_URL_KEY, '1');
    } catch {
      // ignore storage errors
    }
    return { code: fromUrl, fromUrl: true };
  }
  try {
    const stored = sessionStorage.getItem(PENDING_INVITE_KEY);
    const storedFromUrl =
      sessionStorage.getItem(PENDING_INVITE_FROM_URL_KEY) === '1';
    return { code: stored || null, fromUrl: storedFromUrl };
  } catch {
    return { code: null, fromUrl: false };
  }
}

function clearPendingInvite(): void {
  try {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    sessionStorage.removeItem(PENDING_INVITE_FROM_URL_KEY);
  } catch {
    // ignore storage errors
  }
  if (typeof window !== 'undefined' && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    if (params.has('invite') || params.has('ref')) {
      params.delete('invite');
      params.delete('ref');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }
}

function formatFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled yet in Firebase Console. Enable Email/Password under Authentication > Sign-in method.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email/mobile number or password. Please check and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email or mobile number already exists. Please use Login instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address or 10-digit mobile number.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Allow popups and try again.';
    default:
      return error instanceof Error
        ? error.message
        : 'Authentication failed. Please try again.';
  }
}

export default function App() {
  const initialInvite = useMemo(() => readInitialInvite(), []);
  const [pendingInvite, setPendingInvite] = useState<string | null>(
    initialInvite.code,
  );
  const [inviteFromUrl, setInviteFromUrl] = useState<boolean>(
    initialInvite.fromUrl,
  );

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [viewMode, setViewMode] = useState<'investor' | 'admin'>('investor');

  const [settings, setSettings] = useState<PlatformSettings>(
    DEFAULT_PLATFORM_SETTINGS,
  );
  const [plansCatalog, setPlansCatalog] =
    useState<InvestmentPlan[]>(INVESTMENT_PLANS);

  const [investorBundle, setInvestorBundle] =
    useState<InvestorSnapshotBundle | null>(null);

  const [adminDatabase, setAdminDatabase] = useState<PlatformDatabase>({
    users: [],
    rechargeRequests: [],
    withdrawalRequests: [],
    settings: DEFAULT_PLATFORM_SETTINGS,
    plans: INVESTMENT_PLANS,
  });
  const [selectedAdminUserUid, setSelectedAdminUserUid] = useState<
    string | null
  >(null);
  const [impersonatedUserUid, setImpersonatedUserUid] = useState<string | null>(
    null,
  );

  const [routeHistory, setRouteHistory] = useState<AppRoute[]>(['home']);
  const [navDirection, setNavDirection] = useState<-1 | 0 | 1>(0);
  const route = routeHistory[routeHistory.length - 1] ?? 'home';

  const [platformInfoOpen, setPlatformInfoOpen] = useState(false);
  const [purchasePlan, setPurchasePlan] = useState<InvestmentPlan | null>(null);
  const [supportModalMode, setSupportModalMode] = useState<
    'support' | 'channel' | null
  >(null);
  const [allTxOpen, setAllTxOpen] = useState(false);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useState<string[]>(
    () => readDismissedBroadcastIds(),
  );
  const autoOnboardingUidRef = useRef<string | null>(null);
  const [autoOnboardingState, setAutoOnboardingState] = useState<
    'idle' | 'running' | 'failed'
  >('idle');

  const handleDismissBroadcast = useCallback((broadcastId: string) => {
    setDismissedBroadcastIds((prev) => {
      if (prev.includes(broadcastId)) return prev;
      const next = [...prev.slice(-19), broadcastId];
      try {
        localStorage.setItem(DISMISSED_BROADCASTS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write failures
      }
      return next;
    });
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthResolved(true);
      setInvestorBundle(null);
      setAdminChecked(false);

      if (!user) {
        setIsAdminUser(false);
        setViewMode('investor');
        setImpersonatedUserUid(null);
        setRouteHistory(['home']);
        autoOnboardingUidRef.current = null;
        setAutoOnboardingState('idle');
        setAdminChecked(true);
        return;
      }

      try {
        const admin = await checkIsAdmin(user.uid, user.email);
        setIsAdminUser(admin);
        if (admin) {
          setViewMode('admin');
          void ensureBootstrappedAdminRecord(user);
          void ensureAdminCatalogSeeded();
        } else {
          setViewMode('investor');
        }
      } catch {
        setIsAdminUser(false);
        setViewMode('investor');
      } finally {
        setAdminChecked(true);
      }

      void recordUserLogin(user.uid);
    });

    return () => unsubscribe();
  }, []);

  // Real-time admins/{uid} sync so promoted admins switch into Admin Console immediately
  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeIsAdmin(
      firebaseUser.uid,
      firebaseUser.email,
      (nextAdmin) => {
        setIsAdminUser((prevAdmin) => {
          if (!prevAdmin && nextAdmin) {
            setViewMode('admin');
            void ensureAdminCatalogSeeded();
          } else if (!nextAdmin) {
            setViewMode('investor');
          }
          return nextAdmin;
        });
      },
    );
  }, [firebaseUser]);

  // Public catalog subscription (only after sign-in per Firestore rules)
  useEffect(() => {
    if (!firebaseUser) return;
    return subscribePublicCatalog(setSettings, setPlansCatalog);
  }, [firebaseUser]);

  const { targetUid: activeInvestorUid, isImpersonating } = useMemo(
    () =>
      resolveActiveInvestorTarget({
        currentAuthUid: firebaseUser?.uid,
        isAdminUser,
        viewMode,
        impersonatedUserUid,
      }),
    [firebaseUser?.uid, isAdminUser, viewMode, impersonatedUserUid],
  );

  // Investor Firestore bundle subscription (subscribes to impersonated investor when Admin enters a user's account)
  useEffect(() => {
    if (!firebaseUser || !adminChecked || !activeInvestorUid) return;
    setInvestorBundle(null);
    return subscribeInvestorBundle(activeInvestorUid, (bundle) => {
      setInvestorBundle(bundle);
    });
  }, [firebaseUser, adminChecked, activeInvestorUid]);

  // Admin Firestore subscription (only when in Admin Console)
  useEffect(() => {
    if (!firebaseUser || !isAdminUser || viewMode !== 'admin') return;
    return subscribeAdminDatabase(selectedAdminUserUid, (dbData) => {
      setAdminDatabase(dbData);
      if (
        dbData.users.length > 0 &&
        (!selectedAdminUserUid ||
          !dbData.users.some((u) => u.uid === selectedAdminUserUid))
      ) {
        setSelectedAdminUserUid(dbData.users[0].uid);
      }
    });
  }, [firebaseUser, isAdminUser, viewMode, selectedAdminUserUid]);

  const appState: AppState = useMemo(() => {
    if (!firebaseUser || !investorBundle?.profileExists || !investorBundle.userProfile) {
      return {
        ...INITIAL_STATE,
        settings,
        plansCatalog,
      };
    }

    const p = investorBundle.userProfile;
    const effectiveEmail = resolveEffectiveAccountEmail({
      profileEmail: p.email,
      authEmail: firebaseUser.email,
      isImpersonating,
    });
    return {
      auth: {
        isAuthenticated: true,
        role: isAdminUser && viewMode === 'admin' ? 'admin' : 'investor',
        userName: p.userName,
        phone: p.phone,
        email: effectiveEmail,
      },
      uid: p.uid,
      userId: formatAccountIdentifier(p.phone, effectiveEmail) || p.uid,
      accountStatus: p.accountStatus,
      balance: p.balance,
      referralCode: p.referralCode,
      bankDetails: p.bankDetails,
      activePlans: investorBundle.activePlans,
      transactions: investorBundle.transactions,
      rechargeRequests: investorBundle.rechargeRequests,
      withdrawalRequests: investorBundle.withdrawalRequests,
      lastCheckInDate: p.lastCheckInDate,
      lastCheckInReward: p.lastCheckInReward,
      referralMembers: investorBundle.referralMembers,
      darkMode: p.darkMode,
      settings,
      plansCatalog,
    };
  }, [
    firebaseUser,
    investorBundle,
    isAdminUser,
    isImpersonating,
    viewMode,
    settings,
    plansCatalog,
  ]);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const enableDark =
      Boolean(firebaseUser) &&
      viewMode === 'investor' &&
      Boolean(investorBundle?.userProfile?.darkMode);
    document.documentElement.classList.toggle('dark', enableDark);
  }, [firebaseUser, viewMode, investorBundle?.userProfile?.darkMode]);

  // 1-Tap Google Sign-Up: automatically provision profile & ₹40 bonus without forcing a 2nd form
  useEffect(() => {
    if (
      !firebaseUser ||
      !adminChecked ||
      !investorBundle ||
      investorBundle.profileExists ||
      isImpersonating
    ) {
      return;
    }
    const hasEmail = (firebaseUser.email ?? '').includes('@');
    if (!hasEmail) return;
    if (autoOnboardingUidRef.current === firebaseUser.uid) return;
    autoOnboardingUidRef.current = firebaseUser.uid;
    setAutoOnboardingState('running');

    const autoName = deriveDisplayNameFromAuth({
      explicitName: firebaseUser.displayName,
      email: firebaseUser.email,
    });

    void completeInvestorOnboarding(firebaseUser, {
      name: autoName,
      phone: '',
      inviteCode: pendingInvite ?? '',
      inviteFromUrl: inviteFromUrl || Boolean(pendingInvite),
    })
      .then((res) => {
        if (res.ok) {
          clearPendingInvite();
          setPendingInvite(null);
          setInviteFromUrl(false);
          setAutoOnboardingState('idle');
        } else {
          setAutoOnboardingState('failed');
        }
      })
      .catch(() => {
        setAutoOnboardingState('failed');
      });
  }, [
    firebaseUser,
    adminChecked,
    investorBundle,
    isImpersonating,
    pendingInvite,
    inviteFromUrl,
  ]);

  const navigate = useCallback((nextRoute: AppRoute) => {
    setRouteHistory((prev) => {
      const current = prev[prev.length - 1] ?? 'home';
      if (current === nextRoute) return prev;
      setNavDirection(getSwipeRouteDirection(current, nextRoute));
      return [...prev.slice(-12), nextRoute];
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const goBack = useCallback(() => {
    setRouteHistory((prev) => {
      if (prev.length <= 1) return ['home'];
      const current = prev[prev.length - 1];
      const target = prev[prev.length - 2];
      setNavDirection(getSwipeRouteDirection(current, target));
      return prev.slice(0, -1);
    });
  }, []);

  const handlePasswordSignIn = async (
    identifier: string,
    password: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    const parsed = parseAuthIdentifier(identifier);
    if (!parsed) {
      return {
        ok: false,
        message: 'Enter a valid email address or 10-digit mobile number.',
      };
    }
    if (!password) {
      return { ok: false, message: 'Enter your password.' };
    }
    try {
      await signInWithEmailAndPassword(auth, parsed.authEmail, password);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: formatFirebaseAuthError(error) };
    }
  };

  const handlePasswordRegister = async (
    name: string,
    identifier: string,
    password: string,
    inviteCode?: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    const parsed = parseAuthIdentifier(identifier);
    if (!parsed) {
      return {
        ok: false,
        message: 'Enter a valid email address or 10-digit mobile number.',
      };
    }
    const cleanName = deriveDisplayNameFromAuth({
      explicitName: name,
      phone: parsed.phone,
      email: parsed.authEmail,
    });
    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      return { ok: false, message: pwdCheck.error };
    }
    const rawInvite = inviteCode ?? pendingInvite ?? '';
    const cleanInvite = rawInvite
      ? rawInvite.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      : '';
    if (
      cleanInvite &&
      !/^[A-Z0-9]{6,16}$/.test(cleanInvite) &&
      !inviteFromUrl
    ) {
      return {
        ok: false,
        message: 'Referral code must be 6–16 letters/digits.',
      };
    }

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        parsed.authEmail,
        password,
      );
      await updateProfile(cred.user, { displayName: cleanName }).catch(() => {
        // Non-fatal if displayName update fails
      });
      const res = await completeInvestorOnboarding(cred.user, {
        name: cleanName,
        phone: parsed.phone,
        inviteCode: cleanInvite,
        inviteFromUrl: inviteFromUrl || Boolean(pendingInvite),
      });
      if (res.ok) {
        clearPendingInvite();
        setPendingInvite(null);
        setInviteFromUrl(false);
      }
      return res;
    } catch (error) {
      return { ok: false, message: formatFirebaseAuthError(error) };
    }
  };

  const handleGoogleSignIn = async (): Promise<{
    ok: boolean;
    message?: string;
  }> => {
    try {
      await signInWithPopup(auth, googleProvider);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: formatFirebaseAuthError(error) };
    }
  };

  const handleCompleteOnboarding = async (
    name: string,
    phone: string,
    inviteCode?: string,
  ): Promise<{ ok: boolean; message: string }> => {
    if (!firebaseUser) {
      return { ok: false, message: 'Please sign in first.' };
    }
    const res = await completeInvestorOnboarding(firebaseUser, {
      name,
      phone,
      inviteCode: inviteCode ?? pendingInvite ?? '',
      inviteFromUrl: inviteFromUrl || Boolean(pendingInvite),
    });
    if (res.ok) {
      clearPendingInvite();
      setPendingInvite(null);
      setInviteFromUrl(false);
    }
    return res;
  };

  const handleLogout = async () => {
    setPurchasePlan(null);
    setPlatformInfoOpen(false);
    setSupportModalMode(null);
    setAllTxOpen(false);
    setImpersonatedUserUid(null);
    await signOut(auth);
  };

  const handleSwitchViewMode = useCallback(
    (nextMode: 'investor' | 'admin') => {
      if (!isAdminUser) return;
      if (nextMode === 'admin') {
        setImpersonatedUserUid(null);
      }
      setViewMode(nextMode);
      setRouteHistory(['home']);
    },
    [isAdminUser],
  );

  const handleImpersonateUser = useCallback(
    (user: UserAccount) => {
      if (!isAdminUser) return;
      setSelectedAdminUserUid(user.uid);
      setImpersonatedUserUid(user.uid);
      setViewMode('investor');
      setRouteHistory(['home']);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [isAdminUser],
  );

  const handleExitImpersonation = useCallback(() => {
    setImpersonatedUserUid(null);
    setViewMode('admin');
    setRouteHistory(['home']);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Auth loading gate
  if (!authResolved || (firebaseUser && !adminChecked)) {
    return (
      <div className="min-h-screen bg-[#F6F7FA] dark:bg-[#090D16] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <span className="w-12 h-12 rounded-2xl bg-[#0F172A] text-[#E08E45] flex items-center justify-center">
          <CarFront className="w-6 h-6 animate-pulse" />
        </span>
        <p className="text-sm font-bold text-[#0F172A] dark:text-white">
          Mahindra BE6
        </p>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Verifying secure session...
        </p>
      </div>
    );
  }

  // Unauthenticated gate — always starts logged out
  if (!firebaseUser) {
    return (
      <MotionConfig reducedMotion="user">
        <AuthView
          phase="signin"
          initialInviteCode={pendingInvite}
          signupBonusAmount={settings.signupBonusAmount}
          plansCatalog={plansCatalog}
          onPasswordSignIn={handlePasswordSignIn}
          onPasswordRegister={handlePasswordRegister}
          onGoogleSignIn={handleGoogleSignIn}
          onCompleteOnboarding={handleCompleteOnboarding}
          onSignOut={handleLogout}
        />
      </MotionConfig>
    );
  }

  // Admin Console view
  if (isAdminUser && viewMode === 'admin') {
    return (
      <AppShell
        route="admin"
        role="admin"
        isAdminUser
        viewMode="admin"
        balance={appState.balance}
        onNavigate={() => {}}
        onBack={() => {}}
        onOpenSupport={() => {}}
        onSwitchViewMode={handleSwitchViewMode}
        onLogout={() => void handleLogout()}
      >
        <AdminView
          database={adminDatabase}
          selectedUserUid={selectedAdminUserUid}
          currentAdminUid={firebaseUser.uid}
          onSelectUserUid={setSelectedAdminUserUid}
          onImpersonateUser={handleImpersonateUser}
          onAdminAction={(type, payload) =>
            runAdminFirestoreAction(adminDatabase, type, payload)
          }
          onLogout={() => void handleLogout()}
        />
      </AppShell>
    );
  }

  // Waiting for investor profile snapshot
  if (!investorBundle) {
    return (
      <div className="min-h-screen bg-[#F6F7FA] dark:bg-[#090D16] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <span className="w-12 h-12 rounded-2xl bg-[#0F172A] text-[#E08E45] flex items-center justify-center">
          <CarFront className="w-6 h-6 animate-pulse" />
        </span>
        <p className="text-sm font-bold text-[#0F172A] dark:text-white">
          Loading Fleet Profile...
        </p>
      </div>
    );
  }

  // Authenticated via Google, completing 1-tap setup or fallback onboarding
  if (!investorBundle.profileExists) {
    const canAutoOnboard =
      autoOnboardingState !== 'failed' &&
      (firebaseUser.email ?? '').includes('@');
    if (canAutoOnboard) {
      return (
        <div className="min-h-screen bg-[#F6F7FA] dark:bg-[#090D16] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <span className="w-12 h-12 rounded-2xl bg-[#0F172A] text-[#E08E45] flex items-center justify-center">
            <CarFront className="w-6 h-6 animate-pulse" />
          </span>
          <p className="text-sm font-bold text-[#0F172A] dark:text-white">
            Activating ₹{settings.signupBonusAmount} Welcome Bonus...
          </p>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Setting up your Mahindra BE6 account automatically.
          </p>
        </div>
      );
    }

    return (
      <MotionConfig reducedMotion="user">
        <AuthView
          phase="onboarding"
          signedInEmail={firebaseUser.email ?? ''}
          signedInName={firebaseUser.displayName ?? ''}
          initialInviteCode={pendingInvite}
          signupBonusAmount={settings.signupBonusAmount}
          plansCatalog={plansCatalog}
          onPasswordSignIn={handlePasswordSignIn}
          onPasswordRegister={handlePasswordRegister}
          onGoogleSignIn={handleGoogleSignIn}
          onCompleteOnboarding={handleCompleteOnboarding}
          onSignOut={handleLogout}
        />
      </MotionConfig>
    );
  }

  // Suspended investor notice
  if (appState.accountStatus === 'suspended') {
    return (
      <div className="min-h-screen bg-[#F6F7FA] dark:bg-[#090D16] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08] p-6 shadow-sm space-y-4 text-center">
          <span className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </span>
          <h1 className="text-lg font-extrabold text-[#0F172A] dark:text-white">
            Account Suspended
          </h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            {appState.auth.userName}’s Mahindra BE6 fleet account (
            {formatAccountIdentifier(appState.auth.phone, appState.auth.email)})
            is currently suspended by the Fleet Administrator.
          </p>
          {isAdminUser && isImpersonating ? (
            <button
              type="button"
              onClick={handleExitImpersonation}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Back to Admin Console</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const anyModalOpen =
    platformInfoOpen ||
    purchasePlan !== null ||
    supportModalMode !== null ||
    allTxOpen;

  const activeBroadcast = settings.activeBroadcast ?? null;
  const visibleBroadcast = shouldDisplayBroadcastToast({
    broadcast: activeBroadcast,
    role: 'investor',
    dismissedIds: dismissedBroadcastIds,
  })
    ? activeBroadcast
    : null;

  return (
    <MotionConfig reducedMotion="user">
      <BroadcastToast
        broadcast={visibleBroadcast}
        onDismiss={handleDismissBroadcast}
      />
      <AppShell
        route={route}
        role="investor"
        isAdminUser={isAdminUser}
        viewMode="investor"
        impersonatedInvestor={
          isImpersonating
            ? {
                userName: appState.auth.userName,
                identifier: appState.userId,
              }
            : null
        }
        onExitImpersonation={
          isImpersonating ? handleExitImpersonation : undefined
        }
        swipeDisabled={anyModalOpen}
        balance={appState.balance}
        onNavigate={navigate}
        onBack={goBack}
        onOpenSupport={() => setSupportModalMode('support')}
        onSwitchViewMode={isAdminUser ? handleSwitchViewMode : undefined}
        onLogout={() => void handleLogout()}
      >
        {settings.maintenanceMode && (
          <div
            role="status"
            className="mb-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs font-semibold text-amber-900 dark:text-amber-200"
          >
            Scheduled fleet maintenance is currently underway. Some payouts may
            take slightly longer than usual.
          </div>
        )}

        <AnimatePresence mode="wait" custom={navDirection}>
          <motion.div
            key={route}
            custom={navDirection}
            initial={
              navDirection !== 0
                ? { opacity: 0, x: navDirection * 32 }
                : { opacity: 0, y: 8 }
            }
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={
              navDirection !== 0
                ? { opacity: 0, x: -navDirection * 24 }
                : { opacity: 0, y: -6 }
            }
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {route === 'home' && (
              <HomeView
                state={appState}
                liveTransactions={appState.transactions}
                onNavigate={navigate}
                onSelectPlan={setPurchasePlan}
                onOpenPlatformInfo={() => setPlatformInfoOpen(true)}
                onOpenAllTransactions={() => setAllTxOpen(true)}
              />
            )}

            {route === 'plans' && (
              <PlansView
                plans={appState.plansCatalog}
                onSelectPlan={setPurchasePlan}
              />
            )}

            {route === 'checkin' && (
              <CheckInView
                state={appState}
                onClaimCheckIn={(code) =>
                  claimDailyCheckInInFirestore(appState, code)
                }
                onOpenChannel={() => setSupportModalMode('channel')}
              />
            )}

            {route === 'recharge' && (
              <RechargeView
                state={appState}
                onSubmitUtr={(amount, method, utr) =>
                  submitRechargeInFirestore(appState, amount, method, utr)
                }
              />
            )}

            {route === 'withdraw' && (
              <WithdrawView
                state={appState}
                onSubmitWithdrawalClaim={(amount, method, utr) =>
                  submitWithdrawalInFirestore(appState, amount, method, utr)
                }
                onEditBank={() => navigate('bank')}
              />
            )}

            {route === 'team' && <ReferEarnView state={appState} />}

            {route === 'profile' && (
              <ProfileView
                state={appState}
                onNavigate={navigate}
                onClaimYield={(planId) =>
                  claimDailyYieldInFirestore(appState, planId)
                }
                onOpenAllTransactions={() => setAllTxOpen(true)}
                onLogout={() => void handleLogout()}
              />
            )}

            {route === 'settings' && (
              <SettingsView
                state={appState}
                isImpersonating={isImpersonating}
                onBack={goBack}
                onNavigate={navigate}
                onToggleDarkMode={() =>
                  void toggleDarkModeInFirestore(
                    appState.uid,
                    !appState.darkMode,
                  )
                }
                onOpenSupportModal={() => setSupportModalMode('support')}
                onOpenChannelModal={() => setSupportModalMode('channel')}
                onLogout={() => void handleLogout()}
              />
            )}

            {route === 'bank' && (
              <BankDetailsView
                state={appState}
                onSaveBank={(details: BankDetails) =>
                  saveBankDetailsInFirestore(appState.uid, details)
                }
              />
            )}
          </motion.div>
        </AnimatePresence>

      <PlatformInfoModal
        open={platformInfoOpen}
        onClose={() => setPlatformInfoOpen(false)}
        onJoinChannel={() => {
          setPlatformInfoOpen(false);
          setSupportModalMode('channel');
        }}
      />

      <PurchaseConfirmModal
        plan={purchasePlan}
        balance={appState.balance}
        onClose={() => setPurchasePlan(null)}
        onConfirm={(plan) => purchasePlanInFirestore(appState, plan)}
        onGoToRecharge={() => navigate('recharge')}
      />

      <SupportModal
        open={supportModalMode !== null}
        mode={supportModalMode ?? 'support'}
        checkInCode={settings.dailyCheckInCode}
        onClose={() => setSupportModalMode(null)}
      />

      <AllTransactionsModal
        open={allTxOpen}
        transactions={appState.transactions}
        onClose={() => setAllTxOpen(false)}
      />
      </AppShell>
    </MotionConfig>
  );
}
