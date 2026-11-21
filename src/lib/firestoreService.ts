import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { User, sendPasswordResetEmail } from 'firebase/auth';
import { OperationType, auth, db, handleFirestoreError } from '../firebase';
import {
  AccountStatus,
  ActivePlan,
  AppState,
  BankDetails,
  DAILY_CHECKIN_CODE,
  DEFAULT_PLATFORM_SETTINGS,
  INVESTMENT_PLANS,
  InvestmentPlan,
  PaymentMethod,
  PlatformDatabase,
  PlatformSettings,
  RechargeRequest,
  ReferralMember,
  Transaction,
  UserAccount,
  WithdrawalRequest,
  extractCleanEmail,
  extractPhoneFromSyntheticEmail,
  formatAccountIdentifier,
  formatINR,
  generateReferralCode,
  getTodayDateString,
  isBootstrappedAdminEmail,
  isValidUpiId,
  maskIdentifier,
  phoneToSyntheticEmail,
  validateBankDetails,
  validateCustomQrDataUrl,
  validateUtrSubmission,
  validateWithdrawal,
} from './investmentEngine';
import {
  BroadcastTone,
  createBroadcastId,
  sanitizeBroadcastFromDoc,
  validateBroadcastInput,
} from './broadcastMessage';

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function makeDocId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function mapActivePlanDoc(id: string, data: Record<string, unknown>): ActivePlan {
  return {
    id,
    planId: String(data.planId ?? ''),
    name: String(data.name ?? ''),
    modelName: String(data.modelName ?? ''),
    dailyIncome: Number(data.dailyIncome ?? 0),
    totalIncome: Number(data.totalIncome ?? 0),
    durationDays: Number(data.durationDays ?? 7),
    investmentAmount: Number(data.investmentAmount ?? 0),
    purchasedAt: toIsoString(data.purchasedAt),
    daysClaimed: Number(data.daysClaimed ?? 0),
    lastClaimDate: data.lastClaimDate ? String(data.lastClaimDate) : null,
    imageUrl: String(data.imageUrl ?? ''),
  };
}

function mapTransactionDoc(
  id: string,
  data: Record<string, unknown>,
  currentUid?: string,
): Transaction {
  const uid = String(data.uid ?? '');
  const userName = String(data.userName ?? 'Investor');
  return {
    id,
    userId: uid,
    userName,
    userLabel: userName,
    description: String(data.description ?? ''),
    kind: (data.kind as Transaction['kind']) ?? 'bonus',
    amount: Number(data.amount ?? 0),
    isCredit: Boolean(data.isCredit),
    timestamp: toIsoString(data.timestamp),
    isOwn: currentUid ? uid === currentUid : true,
  };
}

function mapRechargeDoc(
  id: string,
  data: Record<string, unknown>,
): RechargeRequest {
  return {
    id,
    userId: String(data.uid ?? ''),
    userName: data.userName ? String(data.userName) : undefined,
    userPhone: data.userPhone ? String(data.userPhone) : undefined,
    amount: Number(data.amount ?? 0),
    method: (data.method as PaymentMethod) ?? 'UPI_ID',
    utrNumber: String(data.utrNumber ?? ''),
    status: (data.status as RechargeRequest['status']) ?? 'pending',
    createdAt: toIsoString(data.createdAt),
    reviewedAt: data.reviewedAt ? toIsoString(data.reviewedAt) : undefined,
    rejectionReason: data.rejectionReason
      ? String(data.rejectionReason)
      : undefined,
  };
}

function mapWithdrawalDoc(
  id: string,
  data: Record<string, unknown>,
): WithdrawalRequest {
  const bankRaw = (data.bankDetails as Record<string, unknown>) ?? {};
  return {
    id,
    userId: String(data.uid ?? ''),
    userName: data.userName ? String(data.userName) : undefined,
    userPhone: data.userPhone ? String(data.userPhone) : undefined,
    withdrawalAmount: Number(data.withdrawalAmount ?? 0),
    claimFeeAmount: Number(data.claimFeeAmount ?? 0),
    method: (data.method as PaymentMethod) ?? 'DIRECT_IMPS',
    utrNumber: String(data.utrNumber ?? ''),
    bankDetails: {
      accountHolderName: String(bankRaw.accountHolderName ?? ''),
      accountNumber: String(bankRaw.accountNumber ?? ''),
      ifscCode: String(bankRaw.ifscCode ?? ''),
    },
    status: (data.status as WithdrawalRequest['status']) ?? 'pending',
    createdAt: toIsoString(data.createdAt),
    reviewedAt: data.reviewedAt ? toIsoString(data.reviewedAt) : undefined,
    rejectionReason: data.rejectionReason
      ? String(data.rejectionReason)
      : undefined,
  };
}

function mapPlanDoc(data: Record<string, unknown>): InvestmentPlan {
  return {
    id: String(data.id ?? ''),
    category: data.category === 'vip' ? 'vip' : 'normal',
    name: String(data.name ?? ''),
    modelName: String(data.modelName ?? ''),
    subtitle: String(data.subtitle ?? ''),
    dailyIncome: Number(data.dailyIncome ?? 0),
    totalIncome: Number(data.totalIncome ?? 0),
    durationDays: Number(data.durationDays ?? 7),
    investmentAmount: Number(data.investmentAmount ?? 0),
    imageUrl: String(data.imageUrl ?? ''),
    featured: Boolean(data.featured),
  };
}

export async function checkIsAdmin(
  uid: string,
  email?: string | null,
): Promise<boolean> {
  if (isBootstrappedAdminEmail(email)) return true;
  const path = `admins/${uid}`;
  const ref = doc(db, 'admins', uid);
  try {
    let snap;
    try {
      snap = await getDocFromServer(ref);
    } catch {
      snap = await getDoc(ref);
    }
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function ensureBootstrappedAdminRecord(user: User): Promise<void> {
  if (!isBootstrappedAdminEmail(user.email)) return;
  try {
    const adminRef = doc(db, 'admins', user.uid);
    const snap = await getDoc(adminRef);
    if (!snap.exists()) {
      await setDoc(adminRef, {
        email: (user.email ?? '').trim().toLowerCase().slice(0, 120),
        createdAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-fatal; bootstrapped email claim remains authoritative
  }
}

export function subscribeIsAdmin(
  uid: string,
  email: string | null | undefined,
  onStatus: (isAdmin: boolean) => void,
): () => void {
  if (isBootstrappedAdminEmail(email)) {
    onStatus(true);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'admins', uid),
    (snap) => {
      onStatus(snap.exists());
    },
    () => {
      // Non-fatal fallback; keep existing status if snapshot transiently errors
    },
  );
}

export async function ensureAdminCatalogSeeded(): Promise<void> {
  const settingsRef = doc(db, 'settings', 'platform');
  try {
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        ...DEFAULT_PLATFORM_SETTINGS,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/platform');
  }

  try {
    const plansQuery = query(
      collection(db, 'plans'),
      where('category', 'in', ['normal', 'vip']),
    );
    const plansSnap = await getDocs(plansQuery);
    if (plansSnap.empty) {
      const batch = writeBatch(db);
      for (const p of INVESTMENT_PLANS) {
        batch.set(doc(db, 'plans', p.id), {
          ...p,
          featured: Boolean(p.featured),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'plans');
  }
}

export function subscribePublicCatalog(
  onSettings: (settings: PlatformSettings) => void,
  onPlans: (plans: InvestmentPlan[]) => void,
): () => void {
  const unsubSettings = onSnapshot(
    doc(db, 'settings', 'platform'),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const validatedQr = validateCustomQrDataUrl(d.customQrDataUrl);
        onSettings({
          merchantUpiId: String(d.merchantUpiId ?? DEFAULT_PLATFORM_SETTINGS.merchantUpiId),
          merchantName: String(d.merchantName ?? DEFAULT_PLATFORM_SETTINGS.merchantName),
          dailyCheckInCode: String(d.dailyCheckInCode ?? DEFAULT_PLATFORM_SETTINGS.dailyCheckInCode),
          checkInRewardAmount: Number(d.checkInRewardAmount ?? DEFAULT_PLATFORM_SETTINGS.checkInRewardAmount),
          signupBonusAmount: Number(d.signupBonusAmount ?? DEFAULT_PLATFORM_SETTINGS.signupBonusAmount),
          maxWithdrawalAmount: Number(d.maxWithdrawalAmount ?? DEFAULT_PLATFORM_SETTINGS.maxWithdrawalAmount),
          maintenanceMode: Boolean(d.maintenanceMode ?? false),
          qrMode: d.qrMode === 'uploaded' && validatedQr.value ? 'uploaded' : 'generated',
          customQrDataUrl: validatedQr.value,
          activeBroadcast: sanitizeBroadcastFromDoc(d.activeBroadcast),
        });
      } else {
        onSettings(DEFAULT_PLATFORM_SETTINGS);
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'settings/platform'),
  );

  const plansQuery = query(
    collection(db, 'plans'),
    where('category', 'in', ['normal', 'vip']),
  );
  const unsubPlans = onSnapshot(
    plansQuery,
    (snap) => {
      if (snap.empty) {
        onPlans(INVESTMENT_PLANS);
        return;
      }
      const orderMap = new Map(INVESTMENT_PLANS.map((p, idx) => [p.id, idx]));
      const loaded = snap.docs
        .map((d) => mapPlanDoc(d.data()))
        .sort(
          (a, b) =>
            (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999),
        );
      onPlans(loaded);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'plans'),
  );

  return () => {
    unsubSettings();
    unsubPlans();
  };
}

export async function getUserProfileExists(uid: string): Promise<boolean> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function recordUserLogin(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal if suspended or newly onboarding
  }
}

export async function completeInvestorOnboarding(
  firebaseUser: User,
  params: {
    name: string;
    phone: string;
    inviteCode?: string;
    inviteFromUrl?: boolean;
  },
): Promise<{ ok: boolean; message: string }> {
  const cleanName = params.name.trim().slice(0, 80);
  const cleanPhone = params.phone.replace(/\D/g, '').trim();
  const cleanInvite = params.inviteCode
    ? params.inviteCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    : '';

  if (cleanName.length < 2) {
    return { ok: false, message: 'Enter your full name (at least 2 characters).' };
  }
  if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
    return { ok: false, message: 'Enter a valid 10-digit mobile number.' };
  }
  if (!cleanPhone && !(firebaseUser.email ?? '').includes('@')) {
    return {
      ok: false,
      message: 'Provide either a valid email address or 10-digit mobile number.',
    };
  }

  let signupBonus = DEFAULT_PLATFORM_SETTINGS.signupBonusAmount;
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'platform'));
    if (settingsSnap.exists()) {
      signupBonus = Number(
        settingsSnap.data().signupBonusAmount ?? signupBonus,
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'settings/platform');
  }

  let referrerUid: string | null = null;
  let resolvedInviteCode: string | null = null;
  if (cleanInvite) {
    if (!/^[A-Z0-9]{6,16}$/.test(cleanInvite)) {
      if (!params.inviteFromUrl) {
        return { ok: false, message: 'Referral code must be 6–16 letters/digits.' };
      }
    } else {
      const refPath = `referralCodes/${cleanInvite}`;
      try {
        const refSnap = await getDoc(doc(db, 'referralCodes', cleanInvite));
        if (refSnap.exists()) {
          const ownerUid = String(refSnap.data().ownerUid ?? '');
          if (ownerUid && ownerUid !== firebaseUser.uid) {
            referrerUid = ownerUid;
            resolvedInviteCode = cleanInvite;
          }
        } else if (!params.inviteFromUrl) {
          return {
            ok: false,
            message: 'Referral code not found. Leave blank to continue without one.',
          };
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, refPath);
      }
    }
  }

  const referralCode = generateReferralCode(cleanPhone, firebaseUser.uid);
  const txId = makeDocId('tx-bonus');
  const batch = writeBatch(db);

  batch.set(doc(db, 'users', firebaseUser.uid), {
    uid: firebaseUser.uid,
    userName: cleanName,
    email: (firebaseUser.email ?? '').slice(0, 120),
    phone: cleanPhone,
    accountStatus: 'active',
    balance: signupBonus,
    referralCode,
    referredByCode: resolvedInviteCode,
    referredByUid: referrerUid,
    bankDetails: null,
    lastCheckInDate: null,
    lastCheckInReward: null,
    lastPlanActionId: null,
    darkMode: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  batch.set(doc(db, 'referralCodes', referralCode), {
    code: referralCode,
    ownerUid: firebaseUser.uid,
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'users', firebaseUser.uid, 'transactions', txId), {
    id: txId,
    uid: firebaseUser.uid,
    userName: cleanName,
    description: 'Welcome Sign-Up Bonus',
    kind: 'bonus',
    amount: signupBonus,
    isCredit: true,
    timestamp: serverTimestamp(),
  });

  if (referrerUid && resolvedInviteCode) {
    const refDocId = makeDocId('ref');
    batch.set(doc(db, 'referrals', refDocId), {
      id: refDocId,
      referrerUid,
      referredUid: firebaseUser.uid,
      inviteCode: resolvedInviteCode,
      referredName: cleanName,
      maskedPhone: maskIdentifier(cleanPhone, firebaseUser.email ?? ''),
      level: 1,
      rechargeAmount: 0,
      commissionEarned: 0,
      joinedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return {
      ok: true,
      message: `Account activated! ${formatINR(signupBonus)} welcome credit added.`,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
  }
}

export interface InvestorSnapshotBundle {
  profileExists: boolean;
  userProfile?: {
    uid: string;
    userName: string;
    email: string;
    phone: string;
    accountStatus: AccountStatus;
    balance: number;
    referralCode: string;
    bankDetails: BankDetails | null;
    lastCheckInDate: string | null;
    lastCheckInReward: number | null;
    darkMode: boolean;
  };
  activePlans: ActivePlan[];
  transactions: Transaction[];
  rechargeRequests: RechargeRequest[];
  withdrawalRequests: WithdrawalRequest[];
  referralMembers: ReferralMember[];
}

export function subscribeInvestorBundle(
  uid: string,
  onChange: (bundle: InvestorSnapshotBundle) => void,
): () => void {
  const bundle: InvestorSnapshotBundle = {
    profileExists: false,
    activePlans: [],
    transactions: [],
    rechargeRequests: [],
    withdrawalRequests: [],
    referralMembers: [],
  };

  let initializedProfile = false;
  const emit = () => {
    if (initializedProfile) {
      onChange({ ...bundle });
    }
  };

  const unsubUser = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      initializedProfile = true;
      if (!snap.exists()) {
        bundle.profileExists = false;
        bundle.userProfile = undefined;
      } else {
        const d = snap.data();
        const bankRaw = d.bankDetails as Record<string, unknown> | null;
        bundle.profileExists = true;
        bundle.userProfile = {
          uid,
          userName: String(d.userName ?? ''),
          email: String(d.email ?? ''),
          phone: String(d.phone ?? ''),
          accountStatus:
            d.accountStatus === 'suspended' ? 'suspended' : 'active',
          balance: Number(d.balance ?? 0),
          referralCode: String(d.referralCode ?? ''),
          bankDetails: bankRaw
            ? {
                accountHolderName: String(bankRaw.accountHolderName ?? ''),
                accountNumber: String(bankRaw.accountNumber ?? ''),
                ifscCode: String(bankRaw.ifscCode ?? ''),
              }
            : null,
          lastCheckInDate: d.lastCheckInDate ? String(d.lastCheckInDate) : null,
          lastCheckInReward:
            typeof d.lastCheckInReward === 'number'
              ? d.lastCheckInReward
              : null,
          darkMode: Boolean(d.darkMode ?? false),
        };
      }
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.GET, `users/${uid}`),
  );

  const unsubPlans = onSnapshot(
    collection(db, 'users', uid, 'activePlans'),
    (snap) => {
      bundle.activePlans = snap.docs
        .map((d) => mapActivePlanDoc(d.id, d.data()))
        .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
      emit();
    },
    (error) =>
      handleFirestoreError(
        error,
        OperationType.LIST,
        `users/${uid}/activePlans`,
      ),
  );

  const unsubTx = onSnapshot(
    collection(db, 'users', uid, 'transactions'),
    (snap) => {
      bundle.transactions = snap.docs
        .map((d) => mapTransactionDoc(d.id, d.data(), uid))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      emit();
    },
    (error) =>
      handleFirestoreError(
        error,
        OperationType.LIST,
        `users/${uid}/transactions`,
      ),
  );

  const unsubRecharges = onSnapshot(
    query(collection(db, 'rechargeRequests'), where('uid', '==', uid)),
    (snap) => {
      bundle.rechargeRequests = snap.docs
        .map((d) => mapRechargeDoc(d.id, d.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      emit();
    },
    (error) =>
      handleFirestoreError(error, OperationType.LIST, 'rechargeRequests'),
  );

  const unsubWithdrawals = onSnapshot(
    query(collection(db, 'withdrawalRequests'), where('uid', '==', uid)),
    (snap) => {
      bundle.withdrawalRequests = snap.docs
        .map((d) => mapWithdrawalDoc(d.id, d.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      emit();
    },
    (error) =>
      handleFirestoreError(error, OperationType.LIST, 'withdrawalRequests'),
  );

  const unsubReferrals = onSnapshot(
    query(collection(db, 'referrals'), where('referrerUid', '==', uid)),
    (snap) => {
      bundle.referralMembers = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: String(data.referredUid ?? ''),
            userName: String(data.referredName ?? ''),
            maskedPhone: String(data.maskedPhone ?? ''),
            level: (Number(data.level ?? 1) as 1 | 2 | 3) || 1,
            rechargeAmount: Number(data.rechargeAmount ?? 0),
            commissionEarned: Number(data.commissionEarned ?? 0),
            joinedAt: toIsoString(data.joinedAt),
          };
        })
        .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'referrals'),
  );

  return () => {
    unsubUser();
    unsubPlans();
    unsubTx();
    unsubRecharges();
    unsubWithdrawals();
    unsubReferrals();
  };
}

export async function toggleDarkModeInFirestore(
  uid: string,
  nextDarkMode: boolean,
): Promise<{ ok: boolean; message: string }> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      darkMode: nextDarkMode,
      updatedAt: serverTimestamp(),
    });
    return { ok: true, message: 'Theme updated.' };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveBankDetailsInFirestore(
  uid: string,
  details: BankDetails,
): Promise<{ ok: boolean; message: string }> {
  const clean: BankDetails = {
    accountHolderName: details.accountHolderName.trim().slice(0, 80),
    accountNumber: details.accountNumber.replace(/\s+/g, ''),
    ifscCode: details.ifscCode.trim().toUpperCase(),
  };
  const check = validateBankDetails(clean);
  if (!check.valid) {
    const firstErr = Object.values(check.errors)[0] || 'Invalid bank details.';
    return { ok: false, message: firstErr };
  }
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      bankDetails: clean,
      updatedAt: serverTimestamp(),
    });
    return { ok: true, message: 'Bank account details saved.' };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function purchasePlanInFirestore(
  state: AppState,
  plan: InvestmentPlan,
): Promise<{ ok: boolean; message: string }> {
  if (state.accountStatus === 'suspended') {
    return { ok: false, message: 'Account suspended. Contact Admin.' };
  }
  if (state.balance < plan.investmentAmount) {
    return {
      ok: false,
      message: `Insufficient balance. Need ${formatINR(plan.investmentAmount)} to activate ${plan.name}.`,
    };
  }

  const activePlanId = makeDocId('ap');
  const txId = makeDocId('tx-buy');
  const nextBalance =
    Math.round((state.balance - plan.investmentAmount) * 100) / 100;

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', state.uid), {
    balance: nextBalance,
    lastPlanActionId: activePlanId,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', state.uid, 'activePlans', activePlanId), {
    id: activePlanId,
    uid: state.uid,
    planId: plan.id,
    name: plan.name,
    modelName: plan.modelName,
    dailyIncome: plan.dailyIncome,
    totalIncome: plan.totalIncome,
    durationDays: plan.durationDays,
    investmentAmount: plan.investmentAmount,
    purchasedAt: serverTimestamp(),
    daysClaimed: 0,
    lastClaimDate: null,
    imageUrl: plan.imageUrl,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', state.uid, 'transactions', txId), {
    id: txId,
    uid: state.uid,
    userName: state.auth.userName,
    description: `Purchased ${plan.name}`,
    kind: 'purchase',
    amount: plan.investmentAmount,
    isCredit: false,
    timestamp: serverTimestamp(),
  });

  try {
    await batch.commit();
    return {
      ok: true,
      message: `${plan.name} activated! Daily income: ${formatINR(plan.dailyIncome)}.`,
    };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `users/${state.uid}/activePlans/${activePlanId}`,
    );
  }
}

export async function claimDailyCheckInInFirestore(
  state: AppState,
  code: string,
): Promise<{ ok: boolean; message: string }> {
  if (state.accountStatus === 'suspended') {
    return { ok: false, message: 'Account suspended. Contact Admin.' };
  }
  const todayStr = getTodayDateString();
  if (state.lastCheckInDate === todayStr) {
    return {
      ok: false,
      message: 'Daily bonus already claimed today. Come back after 12:00 AM.',
    };
  }
  const expectedCode =
    state.settings?.dailyCheckInCode ?? DAILY_CHECKIN_CODE;
  const rewardAmount = state.settings?.checkInRewardAmount ?? 25;
  const normalized = code.trim().toUpperCase();
  const isOneTapDaily = normalized === '' || normalized === 'DAILY';
  if (!isOneTapDaily && normalized !== expectedCode.toUpperCase()) {
    return {
      ok: false,
      message: `Invalid bonus code. Leave blank for 1-tap daily bonus or enter ${expectedCode}.`,
    };
  }

  const txId = makeDocId('tx-chk');
  const nextBalance = Math.round((state.balance + rewardAmount) * 100) / 100;
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', state.uid), {
    balance: nextBalance,
    lastCheckInDate: todayStr,
    lastCheckInReward: rewardAmount,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', state.uid, 'transactions', txId), {
    id: txId,
    uid: state.uid,
    userName: state.auth.userName,
    description: 'Daily Check-In Reward',
    kind: 'checkin',
    amount: rewardAmount,
    isCredit: true,
    timestamp: serverTimestamp(),
  });

  try {
    await batch.commit();
    return {
      ok: true,
      message: `Daily check-in claimed! +${formatINR(rewardAmount)} credited.`,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${state.uid}`);
  }
}

export async function claimDailyYieldInFirestore(
  state: AppState,
  activePlanId: string,
): Promise<{ ok: boolean; message: string }> {
  if (state.accountStatus === 'suspended') {
    return { ok: false, message: 'Account suspended. Contact Admin.' };
  }
  const target = state.activePlans.find((p) => p.id === activePlanId);
  if (!target) {
    return { ok: false, message: 'Active plan not found.' };
  }
  if (target.daysClaimed >= target.durationDays) {
    return { ok: false, message: 'This plan has completed its duration.' };
  }
  const todayStr = getTodayDateString();
  if (target.lastClaimDate === todayStr) {
    return {
      ok: false,
      message: 'Today’s yield has already been claimed for this BE6 vehicle.',
    };
  }

  const earned = target.dailyIncome;
  const nextBalance = Math.round((state.balance + earned) * 100) / 100;
  const txId = makeDocId('tx-yld');
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', state.uid), {
    balance: nextBalance,
    lastPlanActionId: activePlanId,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'users', state.uid, 'activePlans', activePlanId), {
    daysClaimed: target.daysClaimed + 1,
    lastClaimDate: todayStr,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', state.uid, 'transactions', txId), {
    id: txId,
    uid: state.uid,
    userName: state.auth.userName,
    description: `Daily Yield (${target.name})`,
    kind: 'yield',
    amount: earned,
    isCredit: true,
    timestamp: serverTimestamp(),
  });

  try {
    await batch.commit();
    return {
      ok: true,
      message: `Claimed ${formatINR(earned)} daily yield from ${target.name}.`,
    };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `users/${state.uid}/activePlans/${activePlanId}`,
    );
  }
}

export async function submitRechargeInFirestore(
  state: AppState,
  amount: number,
  method: PaymentMethod,
  utrNumber: string,
): Promise<{ ok: boolean; message: string }> {
  const check = validateUtrSubmission(amount, utrNumber);
  if (!check.valid) {
    return { ok: false, message: check.error ?? 'Invalid UTR details.' };
  }
  const cleanUtr = utrNumber.trim().toUpperCase();
  const duplicate =
    state.rechargeRequests.some((r) => r.utrNumber.toUpperCase() === cleanUtr) ||
    state.withdrawalRequests.some(
      (w) => w.utrNumber.toUpperCase() === cleanUtr,
    );
  if (duplicate) {
    return { ok: false, message: 'This UTR number has already been submitted.' };
  }

  const reqId = makeDocId('req');
  const rounded = Math.round(amount * 100) / 100;
  const path = `rechargeRequests/${reqId}`;
  try {
    await setDoc(doc(db, 'rechargeRequests', reqId), {
      id: reqId,
      uid: state.uid,
      userName: state.auth.userName,
      userPhone: formatAccountIdentifier(
        state.auth.phone,
        state.auth.email,
      ).slice(0, 120),
      amount: rounded,
      method,
      utrNumber: cleanUtr,
      status: 'pending',
      rejectionReason: null,
      createdAt: serverTimestamp(),
      reviewedAt: null,
    });
    return {
      ok: true,
      message: `UTR ${cleanUtr} submitted for ${formatINR(rounded)}. Pending Admin verification.`,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitWithdrawalInFirestore(
  state: AppState,
  withdrawalAmount: number,
  method: PaymentMethod,
  utrNumber: string,
): Promise<{ ok: boolean; message: string }> {
  const maxW = state.settings?.maxWithdrawalAmount ?? 10000;
  const check = validateWithdrawal(
    withdrawalAmount,
    state.balance,
    state.activePlans,
    state.bankDetails,
    state.accountStatus,
    maxW,
    state.withdrawalRequests,
    state.uid,
  );
  if (!check.valid) {
    return { ok: false, message: check.error ?? 'Invalid withdrawal request.' };
  }

  let effectiveMethod: PaymentMethod = 'DIRECT_IMPS';
  let effectiveUtr = 'DIRECT-IMPS';
  if (check.requiresPayment) {
    const utrCheck = validateUtrSubmission(check.claimFee, utrNumber);
    if (!utrCheck.valid) {
      return { ok: false, message: utrCheck.error ?? 'Invalid UTR number.' };
    }
    const cleanUtr = utrNumber.trim().toUpperCase();
    const duplicate =
      state.rechargeRequests.some((r) => r.utrNumber.toUpperCase() === cleanUtr) ||
      state.withdrawalRequests.some(
        (w) =>
          w.utrNumber !== 'DIRECT-IMPS' &&
          w.utrNumber.toUpperCase() === cleanUtr,
      );
    if (duplicate) {
      return { ok: false, message: 'This UTR number has already been submitted.' };
    }
    effectiveMethod = method === 'QR_CODE' ? 'QR_CODE' : 'UPI_ID';
    effectiveUtr = cleanUtr;
  }

  const reqId = makeDocId('wd');
  const roundedWithdraw = Math.round(withdrawalAmount * 100) / 100;
  const path = `withdrawalRequests/${reqId}`;
  try {
    await setDoc(doc(db, 'withdrawalRequests', reqId), {
      id: reqId,
      uid: state.uid,
      userName: state.auth.userName,
      userPhone: formatAccountIdentifier(
        state.auth.phone,
        state.auth.email,
      ).slice(0, 120),
      withdrawalAmount: roundedWithdraw,
      claimFeeAmount: check.claimFee,
      method: effectiveMethod,
      utrNumber: effectiveUtr,
      bankDetails: state.bankDetails!,
      status: 'pending',
      rejectionReason: null,
      createdAt: serverTimestamp(),
      reviewedAt: null,
    });
    return {
      ok: true,
      message: check.requiresPayment
        ? `Withdrawal of ${formatINR(roundedWithdraw)} submitted with UTR ${effectiveUtr}.`
        : `Direct IMPS withdrawal of ${formatINR(roundedWithdraw)} submitted (₹0 fee).`,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// =========================================================================
// ADMIN REAL-TIME SUBSCRIPTION & ACTIONS
// =========================================================================

export function subscribeAdminDatabase(
  selectedUserUid: string | null,
  onDatabase: (dbData: PlatformDatabase) => void,
): () => void {
  let usersList: UserAccount[] = [];
  let adminUids: string[] = [];
  let rechargesList: RechargeRequest[] = [];
  let withdrawalsList: WithdrawalRequest[] = [];
  let settings: PlatformSettings = DEFAULT_PLATFORM_SETTINGS;
  let plans: InvestmentPlan[] = INVESTMENT_PLANS;
  let selectedPlans: ActivePlan[] = [];
  let selectedTxs: Transaction[] = [];
  let selectedRefs: ReferralMember[] = [];

  const emit = () => {
    const mergedUsers = usersList.map((u) =>
      u.uid === selectedUserUid
        ? {
            ...u,
            activePlans: selectedPlans,
            transactions: selectedTxs,
            referralMembers: selectedRefs,
          }
        : u,
    );
    onDatabase({
      users: mergedUsers,
      adminUids,
      rechargeRequests: rechargesList,
      withdrawalRequests: withdrawalsList,
      settings,
      plans,
    });
  };

  const unsubAdmins = onSnapshot(
    collection(db, 'admins'),
    (snap) => {
      adminUids = snap.docs.map((d) => d.id);
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'admins'),
  );

  const unsubUsers = onSnapshot(
    collection(db, 'users'),
    (snap) => {
      usersList = snap.docs
        .map((d) => {
          const data = d.data();
          const bankRaw = data.bankDetails as Record<string, unknown> | null;
          const rawEmail = String(data.email ?? '');
          const rawPhone = String(data.phone ?? '');
          const resolvedPhone =
            rawPhone || extractPhoneFromSyntheticEmail(rawEmail);
          const resolvedEmail = extractCleanEmail(rawEmail);
          return {
            uid: d.id,
            userId:
              formatAccountIdentifier(resolvedPhone, rawEmail) || d.id,
            userName: String(data.userName ?? 'Investor'),
            email: resolvedEmail,
            phone: resolvedPhone,
            accountStatus: (data.accountStatus === 'suspended'
              ? 'suspended'
              : 'active') as AccountStatus,
            balance: Number(data.balance ?? 0),
            referralCode: String(data.referralCode ?? ''),
            referredByCode: data.referredByCode
              ? String(data.referredByCode)
              : null,
            referredByUid: data.referredByUid
              ? String(data.referredByUid)
              : null,
            bankDetails: bankRaw
              ? {
                  accountHolderName: String(bankRaw.accountHolderName ?? ''),
                  accountNumber: String(bankRaw.accountNumber ?? ''),
                  ifscCode: String(bankRaw.ifscCode ?? ''),
                }
              : null,
            activePlans: [],
            transactions: [],
            lastCheckInDate: data.lastCheckInDate
              ? String(data.lastCheckInDate)
              : null,
            lastCheckInReward:
              typeof data.lastCheckInReward === 'number'
                ? data.lastCheckInReward
                : null,
            referralMembers: [],
            darkMode: Boolean(data.darkMode ?? false),
            createdAt: toIsoString(data.createdAt),
            lastLoginAt: data.lastLoginAt ? toIsoString(data.lastLoginAt) : null,
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'users'),
  );

  const unsubRecharges = onSnapshot(
    collection(db, 'rechargeRequests'),
    (snap) => {
      rechargesList = snap.docs
        .map((d) => mapRechargeDoc(d.id, d.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      emit();
    },
    (error) =>
      handleFirestoreError(error, OperationType.LIST, 'rechargeRequests'),
  );

  const unsubWithdrawals = onSnapshot(
    collection(db, 'withdrawalRequests'),
    (snap) => {
      withdrawalsList = snap.docs
        .map((d) => mapWithdrawalDoc(d.id, d.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      emit();
    },
    (error) =>
      handleFirestoreError(error, OperationType.LIST, 'withdrawalRequests'),
  );

  const unsubCatalog = subscribePublicCatalog(
    (s) => {
      settings = s;
      emit();
    },
    (p) => {
      plans = p;
      emit();
    },
  );

  let unsubSelPlans = () => {};
  let unsubSelTxs = () => {};
  let unsubSelRefs = () => {};

  if (selectedUserUid) {
    unsubSelPlans = onSnapshot(
      collection(db, 'users', selectedUserUid, 'activePlans'),
      (snap) => {
        selectedPlans = snap.docs
          .map((d) => mapActivePlanDoc(d.id, d.data()))
          .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
        emit();
      },
      (error) =>
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${selectedUserUid}/activePlans`,
        ),
    );
    unsubSelTxs = onSnapshot(
      collection(db, 'users', selectedUserUid, 'transactions'),
      (snap) => {
        selectedTxs = snap.docs
          .map((d) => mapTransactionDoc(d.id, d.data(), selectedUserUid))
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        emit();
      },
      (error) =>
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${selectedUserUid}/transactions`,
        ),
    );
    unsubSelRefs = onSnapshot(
      query(
        collection(db, 'referrals'),
        where('referrerUid', '==', selectedUserUid),
      ),
      (snap) => {
        selectedRefs = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: String(data.referredUid ?? ''),
            userName: String(data.referredName ?? ''),
            maskedPhone: String(data.maskedPhone ?? ''),
            level: (Number(data.level ?? 1) as 1 | 2 | 3) || 1,
            rechargeAmount: Number(data.rechargeAmount ?? 0),
            commissionEarned: Number(data.commissionEarned ?? 0),
            joinedAt: toIsoString(data.joinedAt),
          };
        });
        emit();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'referrals'),
    );
  }

  return () => {
    unsubAdmins();
    unsubUsers();
    unsubRecharges();
    unsubWithdrawals();
    unsubCatalog();
    unsubSelPlans();
    unsubSelTxs();
    unsubSelRefs();
  };
}

export async function runAdminFirestoreAction(
  dbData: PlatformDatabase,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<{ ok: boolean; message: string }> {
  try {
    if (type === 'review_recharge') {
      const requestId = String(payload.requestId ?? '');
      const decision =
        payload.decision === 'approved' ? 'approved' : 'rejected';
      const rejectionReason = payload.rejectionReason
        ? String(payload.rejectionReason).slice(0, 200)
        : null;
      const target = dbData.rechargeRequests.find((r) => r.id === requestId);
      if (!target) return { ok: false, message: 'Recharge request not found.' };
      if (target.status !== 'pending') {
        return { ok: false, message: `Request already ${target.status}.` };
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'rechargeRequests', requestId), {
        status: decision,
        rejectionReason: decision === 'rejected' ? rejectionReason : null,
        reviewedAt: serverTimestamp(),
      });

      if (decision === 'approved') {
        const userSnap = await getDoc(doc(db, 'users', target.userId));
        if (userSnap.exists()) {
          const uData = userSnap.data();
          const currentBal = Number(uData.balance ?? 0);
          const nextBal = Math.round((currentBal + target.amount) * 100) / 100;
          const txId = makeDocId('tx-rec');
          batch.update(doc(db, 'users', target.userId), {
            balance: nextBal,
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'users', target.userId, 'transactions', txId), {
            id: txId,
            uid: target.userId,
            userName: String(uData.userName ?? target.userName ?? 'Investor'),
            description: `UTR ${target.utrNumber} Verified`,
            kind: 'recharge',
            amount: target.amount,
            isCredit: true,
            timestamp: serverTimestamp(),
          });

          // Credit Level 1 referral commission (40%) if user was invited
          const referrerUid = uData.referredByUid
            ? String(uData.referredByUid)
            : null;
          if (referrerUid) {
            const refSnap = await getDoc(doc(db, 'users', referrerUid));
            if (refSnap.exists()) {
              const refBal = Number(refSnap.data().balance ?? 0);
              const commission = Math.round(target.amount * 0.4 * 100) / 100;
              const commTxId = makeDocId('tx-ref');
              batch.update(doc(db, 'users', referrerUid), {
                balance: Math.round((refBal + commission) * 100) / 100,
                updatedAt: serverTimestamp(),
              });
              batch.set(doc(db, 'users', referrerUid, 'transactions', commTxId), {
                id: commTxId,
                uid: referrerUid,
                userName: String(refSnap.data().userName ?? 'Investor'),
                description: `Level 1 Referral Bonus (${String(uData.userName ?? '')})`,
                kind: 'bonus',
                amount: commission,
                isCredit: true,
                timestamp: serverTimestamp(),
              });

              const relQuery = query(
                collection(db, 'referrals'),
                where('referrerUid', '==', referrerUid),
              );
              const relSnap = await getDocs(relQuery);
              for (const relDoc of relSnap.docs) {
                if (relDoc.data().referredUid === target.userId) {
                  batch.update(doc(db, 'referrals', relDoc.id), {
                    rechargeAmount:
                      Number(relDoc.data().rechargeAmount ?? 0) + target.amount,
                    commissionEarned:
                      Number(relDoc.data().commissionEarned ?? 0) + commission,
                  });
                }
              }
            }
          }
        }
      }

      await batch.commit();
      return { ok: true, message: `Recharge ${decision}.` };
    }

    if (type === 'review_withdrawal') {
      const requestId = String(payload.requestId ?? '');
      const decision =
        payload.decision === 'approved' ? 'approved' : 'rejected';
      const rejectionReason = payload.rejectionReason
        ? String(payload.rejectionReason).slice(0, 200)
        : null;
      const target = dbData.withdrawalRequests.find((w) => w.id === requestId);
      if (!target) {
        return { ok: false, message: 'Withdrawal request not found.' };
      }
      if (target.status !== 'pending') {
        return { ok: false, message: `Withdrawal already ${target.status}.` };
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'withdrawalRequests', requestId), {
        status: decision,
        rejectionReason: decision === 'rejected' ? rejectionReason : null,
        reviewedAt: serverTimestamp(),
      });

      if (decision === 'approved') {
        const userSnap = await getDoc(doc(db, 'users', target.userId));
        if (!userSnap.exists()) {
          return { ok: false, message: 'Investor record missing.' };
        }
        const uData = userSnap.data();
        const curBal = Number(uData.balance ?? 0);
        if (curBal < target.withdrawalAmount) {
          return {
            ok: false,
            message: 'Insufficient user balance for approval.',
          };
        }
        const nextBal =
          Math.round((curBal - target.withdrawalAmount) * 100) / 100;
        const txId = makeDocId('tx-wd');
        batch.update(doc(db, 'users', target.userId), {
          balance: nextBal,
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'users', target.userId, 'transactions', txId), {
          id: txId,
          uid: target.userId,
          userName: String(uData.userName ?? target.userName ?? 'Investor'),
          description:
            target.claimFeeAmount > 0
              ? `IMPS Withdrawal (${formatINR(target.withdrawalAmount)})`
              : `Direct IMPS Withdrawal (${formatINR(target.withdrawalAmount)})`,
          kind: 'withdrawal',
          amount: target.withdrawalAmount,
          isCredit: false,
          timestamp: serverTimestamp(),
        });
      }

      await batch.commit();
      return { ok: true, message: `Withdrawal ${decision}.` };
    }

    if (type === 'adjust_balance') {
      const uid = String(payload.uid ?? '');
      const amount = Number(payload.amount);
      const mode = payload.mode as 'credit' | 'debit' | 'set';
      const note = String(payload.note ?? 'Admin Balance Adjustment').slice(
        0,
        140,
      );
      if (!Number.isFinite(amount) || amount < 0) {
        return { ok: false, message: 'Enter a valid non-negative amount.' };
      }
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) return { ok: false, message: 'User not found.' };
      const uData = userSnap.data();
      const current = Number(uData.balance ?? 0);
      let next = current;
      if (mode === 'credit') next = current + amount;
      else if (mode === 'debit') {
        if (amount > current) {
          return { ok: false, message: 'Debit exceeds user balance.' };
        }
        next = current - amount;
      } else {
        next = amount;
      }
      next = Math.round(next * 100) / 100;
      const diff = Math.round((next - current) * 100) / 100;
      const txId = makeDocId('tx-adm');
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', uid), {
        balance: next,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', uid, 'transactions', txId), {
        id: txId,
        uid,
        userName: String(uData.userName ?? 'Investor'),
        description: note || 'Admin Balance Adjustment',
        kind: 'admin',
        amount: Math.abs(diff),
        isCredit: diff >= 0,
        timestamp: serverTimestamp(),
      });
      await batch.commit();
      return { ok: true, message: `Updated balance to ${formatINR(next, true)}.` };
    }

    if (type === 'update_user') {
      const uid = String(payload.uid ?? '');
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) return { ok: false, message: 'User not found.' };
      const uData = userSnap.data();
      const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (typeof payload.userName === 'string' && payload.userName.trim().length >= 2) {
        updates.userName = payload.userName.trim().slice(0, 80);
      }
      if (typeof payload.phone === 'string') {
        const cleanPhone = payload.phone.replace(/\D/g, '').trim();
        if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
          return {
            ok: false,
            message: 'Mobile number must be blank or 10 digits.',
          };
        }
        updates.phone = cleanPhone;
        if (!uData.email && cleanPhone) {
          updates.email = phoneToSyntheticEmail(cleanPhone);
        }
      }
      if (typeof payload.email === 'string') {
        const cleanEmail = payload.email.trim().toLowerCase();
        if (cleanEmail) {
          if (cleanEmail.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
            return { ok: false, message: 'Enter a valid email address.' };
          }
          updates.email = cleanEmail;
        }
      }
      if (
        payload.accountStatus === 'active' ||
        payload.accountStatus === 'suspended'
      ) {
        updates.accountStatus = payload.accountStatus;
      }
      if (payload.bankDetails !== undefined) {
        if (payload.bankDetails === null) {
          updates.bankDetails = null;
        } else {
          const b = payload.bankDetails as BankDetails;
          const cleanBank: BankDetails = {
            accountHolderName: b.accountHolderName.trim().slice(0, 80),
            accountNumber: b.accountNumber.replace(/\s+/g, ''),
            ifscCode: b.ifscCode.trim().toUpperCase(),
          };
          const check = validateBankDetails(cleanBank);
          if (!check.valid) {
            return {
              ok: false,
              message:
                Object.values(check.errors)[0] || 'Invalid bank details.',
            };
          }
          updates.bankDetails = cleanBank;
        }
      }
      await updateDoc(doc(db, 'users', uid), updates);
      return { ok: true, message: 'Investor profile updated.' };
    }

    if (type === 'grant_admin') {
      const uid = String(payload.uid ?? '').trim();
      const targetUser = dbData.users.find((u) => u.uid === uid);
      if (!targetUser) return { ok: false, message: 'User not found.' };
      const recordEmail = (
        extractCleanEmail(targetUser.email) ||
        (targetUser.phone ? phoneToSyntheticEmail(targetUser.phone) : `${uid}@admin.mahindrabe6.app`)
      ).slice(0, 120);
      await setDoc(doc(db, 'admins', uid), {
        email: recordEmail,
        createdAt: serverTimestamp(),
      });
      return {
        ok: true,
        message: `Admin access granted to ${targetUser.userName}. They can now log in via the standard login page.`,
      };
    }

    if (type === 'revoke_admin') {
      const uid = String(payload.uid ?? '').trim();
      if (auth.currentUser?.uid === uid) {
        return {
          ok: false,
          message: 'You cannot revoke your own active Admin session.',
        };
      }
      await deleteDoc(doc(db, 'admins', uid));
      return { ok: true, message: 'Admin privileges revoked for user.' };
    }

    if (type === 'send_password_reset') {
      const targetEmail = extractCleanEmail(String(payload.email ?? ''));
      if (!targetEmail) {
        return {
          ok: false,
          message:
            'This account uses mobile-only login without a real email address. Ask the user to update their password in Settings.',
        };
      }
      await sendPasswordResetEmail(auth, targetEmail);
      return {
        ok: true,
        message: `Password reset email sent to ${targetEmail}.`,
      };
    }

    if (type === 'delete_user') {
      const uid = String(payload.uid ?? '');
      await deleteDoc(doc(db, 'users', uid));
      return { ok: true, message: 'Investor profile removed.' };
    }

    if (type === 'grant_plan') {
      const uid = String(payload.uid ?? '');
      const planId = String(payload.planId ?? '');
      const plan = dbData.plans.find((p) => p.id === planId);
      if (!plan) return { ok: false, message: 'Plan not found.' };
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) return { ok: false, message: 'User not found.' };

      const apId = makeDocId('ap-adm');
      const txId = makeDocId('tx-adm-plan');
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid, 'activePlans', apId), {
        id: apId,
        uid,
        planId: plan.id,
        name: plan.name,
        modelName: plan.modelName,
        dailyIncome: plan.dailyIncome,
        totalIncome: plan.totalIncome,
        durationDays: plan.durationDays,
        investmentAmount: plan.investmentAmount,
        purchasedAt: serverTimestamp(),
        daysClaimed: 0,
        lastClaimDate: null,
        imageUrl: plan.imageUrl,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', uid, 'transactions', txId), {
        id: txId,
        uid,
        userName: String(userSnap.data().userName ?? 'Investor'),
        description: `Admin Granted ${plan.name}`,
        kind: 'admin',
        amount: plan.investmentAmount,
        isCredit: true,
        timestamp: serverTimestamp(),
      });
      await batch.commit();
      return { ok: true, message: `Granted ${plan.name}.` };
    }

    if (type === 'update_active_plan') {
      const uid = String(payload.uid ?? '');
      const activePlanId = String(payload.activePlanId ?? '');
      const apRef = doc(db, 'users', uid, 'activePlans', activePlanId);
      const apSnap = await getDoc(apRef);
      if (!apSnap.exists()) return { ok: false, message: 'Active plan not found.' };
      const ap = apSnap.data();
      const durationDays = Number(payload.durationDays);
      const daysClaimed = Number(payload.daysClaimed);
      const nextDur =
        Number.isFinite(durationDays) && durationDays >= 7 && durationDays <= 30
          ? durationDays
          : Number(ap.durationDays);
      const nextDays = Number.isFinite(daysClaimed)
        ? Math.max(0, Math.min(nextDur, daysClaimed))
        : Number(ap.daysClaimed);
      await updateDoc(apRef, {
        durationDays: nextDur,
        daysClaimed: nextDays,
        totalIncome: Number(ap.dailyIncome) * nextDur,
        updatedAt: serverTimestamp(),
      });
      return { ok: true, message: 'Plan duration/progress updated.' };
    }

    if (type === 'remove_plan') {
      const uid = String(payload.uid ?? '');
      const activePlanId = String(payload.activePlanId ?? '');
      await deleteDoc(doc(db, 'users', uid, 'activePlans', activePlanId));
      return { ok: true, message: 'Active plan removed.' };
    }

    if (type === 'force_daily_yield') {
      const uid = String(payload.uid ?? '');
      const activePlanId = String(payload.activePlanId ?? '');
      const userSnap = await getDoc(doc(db, 'users', uid));
      const apRef = doc(db, 'users', uid, 'activePlans', activePlanId);
      const apSnap = await getDoc(apRef);
      if (!userSnap.exists() || !apSnap.exists()) {
        return { ok: false, message: 'User or active plan not found.' };
      }
      const uData = userSnap.data();
      const ap = apSnap.data();
      if (Number(ap.daysClaimed) >= Number(ap.durationDays)) {
        return { ok: false, message: 'Plan already completed.' };
      }
      const dailyIncome = Number(ap.dailyIncome);
      const nextBal = Math.round((Number(uData.balance ?? 0) + dailyIncome) * 100) / 100;
      const txId = makeDocId('tx-adm-yld');
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', uid), {
        balance: nextBal,
        updatedAt: serverTimestamp(),
      });
      batch.update(apRef, {
        daysClaimed: Number(ap.daysClaimed) + 1,
        lastClaimDate: getTodayDateString(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', uid, 'transactions', txId), {
        id: txId,
        uid,
        userName: String(uData.userName ?? 'Investor'),
        description: `Admin Yield Credit (${String(ap.name ?? '')})`,
        kind: 'yield',
        amount: dailyIncome,
        isCredit: true,
        timestamp: serverTimestamp(),
      });
      await batch.commit();
      return { ok: true, message: `Credited ${formatINR(dailyIncome)} yield.` };
    }

    if (type === 'update_settings') {
      const incoming = (payload.settings ?? {}) as Partial<PlatformSettings>;
      const merchantUpiId = String(
        incoming.merchantUpiId ?? dbData.settings.merchantUpiId,
      ).trim();
      if (!isValidUpiId(merchantUpiId)) {
        return {
          ok: false,
          message: 'Enter a valid UPI ID (e.g. yourname@okicici or number@ybl).',
        };
      }
      const merchantName = String(
        incoming.merchantName ?? dbData.settings.merchantName,
      ).trim();
      if (merchantName.length < 2 || merchantName.length > 120) {
        return {
          ok: false,
          message: 'Merchant Payee Name must be 2–120 characters.',
        };
      }
      const qrCheck = validateCustomQrDataUrl(
        incoming.customQrDataUrl !== undefined
          ? incoming.customQrDataUrl
          : dbData.settings.customQrDataUrl,
      );
      if (!qrCheck.valid) {
        return { ok: false, message: qrCheck.error ?? 'Invalid custom QR image.' };
      }
      const requestedQrMode =
        incoming.qrMode === 'uploaded' ? 'uploaded' : 'generated';
      if (requestedQrMode === 'uploaded' && !qrCheck.value) {
        return {
          ok: false,
          message:
            'Upload a custom QR code image first, or select Auto-Generate from UPI ID.',
        };
      }

      const next: PlatformSettings = {
        merchantUpiId,
        merchantName,
        dailyCheckInCode: String(
          incoming.dailyCheckInCode ?? dbData.settings.dailyCheckInCode,
        )
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, ''),
        checkInRewardAmount: Number(
          incoming.checkInRewardAmount ?? dbData.settings.checkInRewardAmount,
        ),
        signupBonusAmount: Number(
          incoming.signupBonusAmount ?? dbData.settings.signupBonusAmount,
        ),
        maxWithdrawalAmount: Number(
          incoming.maxWithdrawalAmount ?? dbData.settings.maxWithdrawalAmount,
        ),
        maintenanceMode: Boolean(
          incoming.maintenanceMode ?? dbData.settings.maintenanceMode,
        ),
        qrMode: requestedQrMode,
        customQrDataUrl: qrCheck.value,
        activeBroadcast: dbData.settings.activeBroadcast ?? null,
      };
      await setDoc(doc(db, 'settings', 'platform'), {
        ...next,
        updatedAt: serverTimestamp(),
      });
      return { ok: true, message: 'Platform & QR payment settings saved.' };
    }

    if (type === 'send_broadcast') {
      const check = validateBroadcastInput({
        title: String(payload.title ?? ''),
        message: String(payload.message ?? ''),
        tone: (payload.tone as BroadcastTone) ?? 'promo',
      });
      if (!check.valid || !check.clean) {
        return {
          ok: false,
          message: check.error ?? 'Invalid broadcast message.',
        };
      }
      const nextBroadcast = {
        id: createBroadcastId(),
        title: check.clean.title,
        message: check.clean.message,
        tone: check.clean.tone,
        active: true,
        sentAt: new Date().toISOString().slice(0, 40),
      };
      await setDoc(doc(db, 'settings', 'platform'), {
        merchantUpiId: dbData.settings.merchantUpiId,
        merchantName: dbData.settings.merchantName,
        dailyCheckInCode: dbData.settings.dailyCheckInCode,
        checkInRewardAmount: dbData.settings.checkInRewardAmount,
        signupBonusAmount: dbData.settings.signupBonusAmount,
        maxWithdrawalAmount: dbData.settings.maxWithdrawalAmount,
        maintenanceMode: dbData.settings.maintenanceMode,
        qrMode: dbData.settings.qrMode ?? 'generated',
        customQrDataUrl: dbData.settings.customQrDataUrl ?? null,
        activeBroadcast: nextBroadcast,
        updatedAt: serverTimestamp(),
      });
      return {
        ok: true,
        message: `Broadcast "${check.clean.title}" sent to all logged-in investors.`,
      };
    }

    if (type === 'clear_broadcast') {
      await setDoc(doc(db, 'settings', 'platform'), {
        merchantUpiId: dbData.settings.merchantUpiId,
        merchantName: dbData.settings.merchantName,
        dailyCheckInCode: dbData.settings.dailyCheckInCode,
        checkInRewardAmount: dbData.settings.checkInRewardAmount,
        signupBonusAmount: dbData.settings.signupBonusAmount,
        maxWithdrawalAmount: dbData.settings.maxWithdrawalAmount,
        maintenanceMode: dbData.settings.maintenanceMode,
        qrMode: dbData.settings.qrMode ?? 'generated',
        customQrDataUrl: dbData.settings.customQrDataUrl ?? null,
        activeBroadcast: null,
        updatedAt: serverTimestamp(),
      });
      return {
        ok: true,
        message: 'Active broadcast alert cleared.',
      };
    }

    if (type === 'update_plan_config') {
      const planId = String(payload.planId ?? '');
      const investmentAmount = Number(payload.investmentAmount);
      const dailyIncome = Number(payload.dailyIncome);
      const durationDays = Number(payload.durationDays);
      if (
        !Number.isFinite(investmentAmount) ||
        investmentAmount >= 1500 ||
        investmentAmount < 100
      ) {
        return { ok: false, message: 'Investment must be ₹100 – ₹1,499.' };
      }
      if (
        !Number.isFinite(dailyIncome) ||
        dailyIncome <= 0 ||
        dailyIncome > investmentAmount * 0.25
      ) {
        return {
          ok: false,
          message: 'Daily income cannot exceed 25% of investment.',
        };
      }
      if (!Number.isFinite(durationDays) || durationDays < 7 || durationDays > 30) {
        return { ok: false, message: 'Duration must be between 7 and 30 days.' };
      }
      const totalIncome = dailyIncome * durationDays;
      if (totalIncome > 5000) {
        return { ok: false, message: 'Total return cannot exceed ₹5,000.' };
      }
      const existingPlan = dbData.plans.find((p) => p.id === planId);
      if (!existingPlan) return { ok: false, message: 'Plan not found.' };
      await setDoc(doc(db, 'plans', planId), {
        ...existingPlan,
        featured: Boolean(existingPlan.featured),
        investmentAmount,
        dailyIncome,
        durationDays,
        totalIncome,
        updatedAt: serverTimestamp(),
      });
      return { ok: true, message: 'Plan configuration saved.' };
    }

    return { ok: false, message: 'Unknown admin action.' };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `admin/${type}`);
  }
}
