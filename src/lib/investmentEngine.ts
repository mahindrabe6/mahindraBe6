import type { BroadcastMessage } from './broadcastMessage';

export type PlanCategory = 'normal' | 'vip';

export type PaymentMethod = 'UPI_ID' | 'QR_CODE' | 'DIRECT_IMPS';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type UserRole = 'investor' | 'admin';

export type AccountStatus = 'active' | 'suspended';

export type AppRoute =
  | 'home'
  | 'plans'
  | 'checkin'
  | 'recharge'
  | 'withdraw'
  | 'team'
  | 'profile'
  | 'settings'
  | 'bank'
  | 'admin';

export interface InvestmentPlan {
  id: string;
  category: PlanCategory;
  name: string;
  modelName: string;
  subtitle: string;
  dailyIncome: number;
  totalIncome: number;
  durationDays: number;
  investmentAmount: number;
  imageUrl: string;
  featured?: boolean;
}

export interface ActivePlan {
  id: string;
  planId: string;
  name: string;
  modelName: string;
  dailyIncome: number;
  totalIncome: number;
  durationDays: number;
  investmentAmount: number;
  purchasedAt: string;
  daysClaimed: number;
  lastClaimDate: string | null;
  imageUrl: string;
}

export type TransactionKind =
  | 'withdrawal'
  | 'purchase'
  | 'recharge'
  | 'checkin'
  | 'yield'
  | 'bonus'
  | 'admin';

export interface Transaction {
  id: string;
  userId?: string;
  userName?: string;
  userLabel: string;
  description: string;
  kind: TransactionKind;
  amount: number;
  isCredit: boolean;
  timestamp: string;
  isOwn?: boolean;
}

export interface RechargeRequest {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  amount: number;
  method: PaymentMethod;
  utrNumber: string;
  status: RequestStatus;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  withdrawalAmount: number;
  claimFeeAmount: number;
  method: PaymentMethod;
  utrNumber: string;
  bankDetails: BankDetails;
  status: RequestStatus;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface BankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface ReferralMember {
  id: string;
  userId?: string;
  userName?: string;
  maskedPhone: string;
  level: 1 | 2 | 3;
  rechargeAmount: number;
  commissionEarned: number;
  joinedAt: string;
}

export interface AuthSession {
  isAuthenticated: boolean;
  role: UserRole;
  userName: string;
  phone: string;
  email: string;
}

export type QrMode = 'generated' | 'uploaded';

export interface PlatformSettings {
  merchantUpiId: string;
  merchantName: string;
  dailyCheckInCode: string;
  checkInRewardAmount: number;
  signupBonusAmount: number;
  maxWithdrawalAmount: number;
  maintenanceMode: boolean;
  qrMode?: QrMode;
  customQrDataUrl?: string | null;
  activeBroadcast?: BroadcastMessage | null;
}

export interface UserAccount {
  uid: string;
  userId: string;
  userName: string;
  email: string;
  phone: string;
  accountStatus: AccountStatus;
  balance: number;
  referralCode: string;
  referredByCode: string | null;
  referredByUid: string | null;
  bankDetails: BankDetails | null;
  activePlans: ActivePlan[];
  transactions: Transaction[];
  lastCheckInDate: string | null;
  lastCheckInReward: number | null;
  referralMembers: ReferralMember[];
  darkMode: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface PlatformDatabase {
  users: UserAccount[];
  adminUids?: string[];
  rechargeRequests: RechargeRequest[];
  withdrawalRequests: WithdrawalRequest[];
  settings: PlatformSettings;
  plans: InvestmentPlan[];
}

export interface AppState {
  auth: AuthSession;
  uid: string;
  userId: string;
  accountStatus: AccountStatus;
  balance: number;
  referralCode: string;
  bankDetails: BankDetails | null;
  activePlans: ActivePlan[];
  transactions: Transaction[];
  rechargeRequests: RechargeRequest[];
  withdrawalRequests: WithdrawalRequest[];
  lastCheckInDate: string | null;
  lastCheckInReward: number | null;
  referralMembers: ReferralMember[];
  darkMode: boolean;
  settings?: PlatformSettings;
  plansCatalog?: InvestmentPlan[];
}

export const ADMIN_EMAIL = 'techbcofficialaman@gmail.com';

export function isBootstrappedAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === ADMIN_EMAIL);
}

export const HERO_BANNER_IMAGE =
  '/src/assets/images/be6_luxury_hero_1795164411257.jpg';
const IMG_CHAMPAGNE = '/src/assets/images/be6_champagne_gold_1795164411278.jpg';
const IMG_OBSIDIAN = '/src/assets/images/be6_obsidian_stealth_1795164412224.jpg';
const IMG_TITANIUM = '/src/assets/images/be6_titanium_silver_1795164410809.jpg';
const IMG_CRIMSON = '/src/assets/images/be6_crimson_velvet_1795164411551.jpg';

export const MERCHANT_UPI_ID = 'mahindrabe6.pay@okicici';
export const MERCHANT_NAME = 'Mahindra BE6 Luxury Fleet Pvt Ltd';

// Strictly enforced plan bounds:
// 1. investmentAmount < 1500 (₹250 - ₹1,450)
// 2. dailyIncome <= 25% of investmentAmount
// 3. 7 <= durationDays <= 30
// 4. totalIncome <= 5000 and dailyIncome * durationDays === totalIncome
export const INVESTMENT_PLANS: InvestmentPlan[] = [
  {
    id: 'normal-popular',
    category: 'normal',
    name: 'BE6 Pack One',
    modelName: 'Mahindra BE6 Obsidian Edition',
    subtitle: '25% Daily Yield · 15 Days',
    dailyIncome: 100,
    totalIncome: 1500,
    durationDays: 15,
    investmentAmount: 400,
    imageUrl: IMG_OBSIDIAN,
    featured: true,
  },
  {
    id: 'normal-a',
    category: 'normal',
    name: 'BE6 Essential',
    modelName: 'Mahindra BE6 Champagne Gold',
    subtitle: '24% Daily Yield · 30 Days',
    dailyIncome: 60,
    totalIncome: 1800,
    durationDays: 30,
    investmentAmount: 250,
    imageUrl: IMG_CHAMPAGNE,
    featured: true,
  },
  {
    id: 'normal-b',
    category: 'normal',
    name: 'BE6 Titanium Luxe',
    modelName: 'Mahindra BE6 Liquid Silver',
    subtitle: '24% Daily Yield · 25 Days',
    dailyIncome: 120,
    totalIncome: 3000,
    durationDays: 25,
    investmentAmount: 500,
    imageUrl: IMG_TITANIUM,
  },
  {
    id: 'normal-c',
    category: 'normal',
    name: 'BE6 Stealth AWD',
    modelName: 'Mahindra BE6 Dual Motor',
    subtitle: '25% Daily Yield · 22 Days',
    dailyIncome: 175,
    totalIncome: 3850,
    durationDays: 22,
    investmentAmount: 700,
    imageUrl: IMG_OBSIDIAN,
  },
  {
    id: 'normal-d',
    category: 'normal',
    name: 'BE6 Velvet GT',
    modelName: 'Mahindra BE6 Crimson Coupe',
    subtitle: '25% Daily Yield · 20 Days',
    dailyIncome: 225,
    totalIncome: 4500,
    durationDays: 20,
    investmentAmount: 900,
    imageUrl: IMG_CRIMSON,
  },
  {
    id: 'normal-e',
    category: 'normal',
    name: 'BE6 Signature Plus',
    modelName: 'Mahindra BE6 Titanium GT',
    subtitle: 'Peak ₹5,000 Return · 20 Days',
    dailyIncome: 250,
    totalIncome: 5000,
    durationDays: 20,
    investmentAmount: 1100,
    imageUrl: IMG_TITANIUM,
  },
  {
    id: 'normal-f',
    category: 'normal',
    name: 'BE6 Atelier Bronze',
    modelName: 'Mahindra BE6 Champagne Flagship',
    subtitle: '25% Daily Yield · 14 Days',
    dailyIncome: 350,
    totalIncome: 4900,
    durationDays: 14,
    investmentAmount: 1400,
    imageUrl: IMG_CHAMPAGNE,
  },
  {
    id: 'vip-a',
    category: 'vip',
    name: 'VIP Obsidian',
    modelName: 'BE6 Carbon Sprint',
    subtitle: '25% Daily Yield · 10 Days',
    dailyIncome: 150,
    totalIncome: 1500,
    durationDays: 10,
    investmentAmount: 600,
    imageUrl: IMG_OBSIDIAN,
  },
  {
    id: 'vip-b',
    category: 'vip',
    name: 'VIP Velvet',
    modelName: 'BE6 Crimson Executive',
    subtitle: '25% Daily Yield · 14 Days',
    dailyIncome: 250,
    totalIncome: 3500,
    durationDays: 14,
    investmentAmount: 1000,
    imageUrl: IMG_CRIMSON,
  },
  {
    id: 'vip-c',
    category: 'vip',
    name: 'VIP Sovereign',
    modelName: 'BE6 Champagne Reserve',
    subtitle: '24.1% Daily Yield · 14 Days',
    dailyIncome: 350,
    totalIncome: 4900,
    durationDays: 14,
    investmentAmount: 1450,
    imageUrl: IMG_CHAMPAGNE,
  },
];

export const RECHARGE_PRESETS = [250, 400, 500, 700, 900, 1100, 1400, 1450];
export const FALLBACK_STARTER_DAILY_INCOME = 60;
export const MAX_WITHDRAWAL = 10000;
export const DAILY_CHECKIN_CODE = 'BE6DRIVE';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  merchantUpiId: MERCHANT_UPI_ID,
  merchantName: MERCHANT_NAME,
  dailyCheckInCode: DAILY_CHECKIN_CODE,
  checkInRewardAmount: 25,
  signupBonusAmount: 40,
  maxWithdrawalAmount: MAX_WITHDRAWAL,
  maintenanceMode: false,
  qrMode: 'generated',
  customQrDataUrl: null,
};

export const PLATFORM_INFO = [
  { label: 'Fleet Brand', value: 'Mahindra BE6' },
  { label: 'Plan Range', value: '₹250 – ₹1,450' },
  { label: 'Daily Return Cap', value: 'Max 25% / Day' },
  { label: 'Cycle Duration', value: '7 – 30 Days' },
  { label: 'Max Earning', value: 'Up to ₹5,000' },
  { label: 'Min Withdrawal', value: '4 Days Income' },
  { label: 'IMPS Payouts', value: '15–30 mins · ₹0 Fee' },
  { label: 'Settlement Banks', value: 'All Indian IMPS Banks' },
] as const;

// Clean, zero-PII unauthenticated state (no pre-seeded accounts or balances)
export const INITIAL_STATE: AppState = {
  auth: {
    isAuthenticated: false,
    role: 'investor',
    userName: '',
    phone: '',
    email: '',
  },
  uid: '',
  userId: '',
  accountStatus: 'active',
  balance: 0,
  referralCode: '',
  bankDetails: null,
  activePlans: [],
  transactions: [],
  rechargeRequests: [],
  withdrawalRequests: [],
  lastCheckInDate: null,
  lastCheckInReward: null,
  referralMembers: [],
  darkMode: false,
  settings: DEFAULT_PLATFORM_SETTINGS,
  plansCatalog: INVESTMENT_PLANS,
};

// Invite link helpers
export function extractInviteCodeFromSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get('invite') ?? params.get('ref');
    if (!raw) return null;
    const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 6 || clean.length > 16) return null;
    return clean;
  } catch {
    return null;
  }
}

export function buildInviteLink(origin: string, referralCode: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanCode = referralCode.trim().toUpperCase();
  if (!cleanCode) return cleanOrigin;
  return `${cleanOrigin}/?invite=${encodeURIComponent(cleanCode)}`;
}

export const PHONE_AUTH_DOMAIN = 'phone.mahindrabe6.app';

export function phoneToSyntheticEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return `${digits}@${PHONE_AUTH_DOMAIN}`;
}

export function isSyntheticPhoneEmail(email?: string | null): boolean {
  return Boolean(
    email && email.trim().toLowerCase().endsWith(`@${PHONE_AUTH_DOMAIN}`),
  );
}

export function extractPhoneFromSyntheticEmail(email?: string | null): string {
  if (!isSyntheticPhoneEmail(email)) return '';
  return (email ?? '').trim().split('@')[0].replace(/\D/g, '').slice(0, 10);
}

export function formatAccountIdentifier(
  phone?: string | null,
  email?: string | null,
): string {
  const cleanPhone = (phone ?? '').replace(/\D/g, '');
  if (/^\d{10}$/.test(cleanPhone)) {
    return cleanPhone;
  }
  if (isSyntheticPhoneEmail(email)) {
    return extractPhoneFromSyntheticEmail(email);
  }
  return (email ?? '').trim();
}

export interface ParsedAuthIdentifier {
  kind: 'phone' | 'email';
  authEmail: string;
  phone: string;
  displayIdentifier: string;
}

export function parseAuthIdentifier(raw: string): ParsedAuthIdentifier | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    if (
      email.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    ) {
      return null;
    }
    return {
      kind: 'email',
      authEmail: email,
      phone: '',
      displayIdentifier: email,
    };
  }

  let digits = trimmed.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (!/^\d{10}$/.test(digits)) {
    return null;
  }

  return {
    kind: 'phone',
    authEmail: phoneToSyntheticEmail(digits),
    phone: digits,
    displayIdentifier: digits,
  };
}

export function extractCleanEmail(email?: string | null): string {
  const trimmed = (email ?? '').trim();
  if (!trimmed || isSyntheticPhoneEmail(trimmed)) return '';
  return trimmed;
}

export function deriveDisplayNameFromAuth(params: {
  explicitName?: string | null;
  phone?: string | null;
  email?: string | null;
}): string {
  const cleanExplicit = (params.explicitName ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (cleanExplicit.length >= 2) {
    return cleanExplicit.slice(0, 80);
  }
  const digits = (
    params.phone || extractPhoneFromSyntheticEmail(params.email)
  ).replace(/\D/g, '');
  if (digits.length >= 4) {
    return `BE6 Member ${digits.slice(-4)}`;
  }
  const cleanEmail = extractCleanEmail(params.email);
  if (cleanEmail) {
    const local = cleanEmail
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    if (local.length >= 2) {
      return local.slice(0, 80);
    }
  }
  return 'BE6 Member';
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be 128 characters or fewer.' };
  }
  return { valid: true };
}

export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  requireCurrent: boolean,
): { valid: boolean; error?: string } {
  if (requireCurrent && !currentPassword) {
    return { valid: false, error: 'Enter your current password.' };
  }
  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return strength;
  }
  if (requireCurrent && currentPassword === newPassword) {
    return {
      valid: false,
      error: 'New password must be different from your current password.',
    };
  }
  if (newPassword !== confirmPassword) {
    return { valid: false, error: 'New password and confirmation do not match.' };
  }
  return { valid: true };
}

export function generateReferralCode(phone: string, uid: string): string {
  const cleanUid = uid.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const digits = phone.replace(/\D/g, '');
  const seedA =
    digits.length >= 4
      ? digits.slice(-4)
      : cleanUid.slice(-4).padStart(4, '0');
  const seedB = cleanUid.slice(0, 4).padEnd(4, 'X');
  return `BE6${seedA}${seedB}`;
}

export function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 6) return clean;
  return `${clean.slice(0, 2)}****${clean.slice(-4)}`;
}

export function maskIdentifier(phone: string, email?: string): string {
  const masked = maskPhone(phone);
  if (masked.length >= 4) return masked.slice(0, 20);
  const cleanEmail = (email ?? '').trim();
  if (cleanEmail.includes('@') && !isSyntheticPhoneEmail(cleanEmail)) {
    const [local, domain] = cleanEmail.split('@');
    const prefix = (local || 'be').slice(0, 2);
    return `${prefix}***@${domain}`.slice(0, 20);
  }
  return 'BE6Member';
}

export function getActiveOngoingPlans(plans: ActivePlan[]): ActivePlan[] {
  return plans.filter((p) => p.daysClaimed < p.durationDays);
}

export function getRemainingDurationDays(plan: ActivePlan): number {
  return Math.max(0, plan.durationDays - plan.daysClaimed);
}

export function getPlanStatus(plan: ActivePlan): 'active' | 'completed' {
  return plan.daysClaimed >= plan.durationDays ? 'completed' : 'active';
}

export interface PendingYieldSummary {
  ongoingCount: number;
  unclaimedCount: number;
  dailyYieldTotal: number;
  claimableTodayTotal: number;
  accruedAmount: number;
  yieldPerHour: number;
  yieldPerSecond: number;
  allClaimedToday: boolean;
}

const MS_PER_DAY = 86_400_000;

export function computePendingYieldSummary(
  plans: ActivePlan[],
  todayDateStr: string,
  nowMs = Date.now(),
): PendingYieldSummary {
  const ongoing = getActiveOngoingPlans(plans);
  const dailyYieldTotal = ongoing.reduce((sum, p) => sum + p.dailyIncome, 0);
  const unclaimed = ongoing.filter((p) => p.lastClaimDate !== todayDateStr);
  const claimableTodayTotal = unclaimed.reduce(
    (sum, p) => sum + p.dailyIncome,
    0,
  );

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayDateStr);
  const dayStart = match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        0,
        0,
        0,
        0,
      ).getTime()
    : new Date(nowMs).setHours(0, 0, 0, 0);

  let rawAccrued = 0;
  for (const plan of unclaimed) {
    const purchasedMs = new Date(plan.purchasedAt).getTime();
    const effectiveStart =
      Number.isFinite(purchasedMs) && purchasedMs > dayStart
        ? purchasedMs
        : dayStart;
    const elapsedMs = Math.max(0, Math.min(MS_PER_DAY, nowMs - effectiveStart));
    const fraction = elapsedMs / MS_PER_DAY;
    rawAccrued += plan.dailyIncome * fraction;
  }

  const accruedAmount = Math.min(
    claimableTodayTotal,
    Math.round(rawAccrued * 10000) / 10000,
  );

  return {
    ongoingCount: ongoing.length,
    unclaimedCount: unclaimed.length,
    dailyYieldTotal,
    claimableTodayTotal,
    accruedAmount,
    yieldPerHour: claimableTodayTotal / 24,
    yieldPerSecond: claimableTodayTotal / 86_400,
    allClaimedToday: ongoing.length > 0 && unclaimed.length === 0,
  };
}

export function formatRelativeTime(
  isoTimestamp: string,
  nowMs = Date.now(),
): string {
  const diffSec = Math.max(
    0,
    Math.floor((nowMs - new Date(isoTimestamp).getTime()) / 1000),
  );
  if (diffSec < 4) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  return new Date(isoTimestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMinWithdrawalAmount(activePlans: ActivePlan[]): number {
  const ongoing = getActiveOngoingPlans(activePlans);
  const source = ongoing.length > 0 ? ongoing : activePlans;
  const totalDailyIncome = source.reduce((sum, p) => sum + p.dailyIncome, 0);
  if (totalDailyIncome <= 0) {
    return FALLBACK_STARTER_DAILY_INCOME * 4;
  }
  return totalDailyIncome * 4;
}

export interface WithdrawalVerificationInfo {
  activePrincipal: number;
  freeThreshold: number;
  alreadyClaimed: number;
  remainingFreeAllowance: number;
  hasVerifiedPrincipal: boolean;
  requiresVerificationPayment: boolean;
  requiredClaimFee: number;
}

export function getActivePrincipalAmount(activePlans: ActivePlan[]): number {
  const ongoing = getActiveOngoingPlans(activePlans);
  const source = ongoing.length > 0 ? ongoing : activePlans;
  const totalInvestment = source.reduce(
    (sum, p) => sum + p.investmentAmount,
    0,
  );
  return totalInvestment > 0 ? totalInvestment : 250;
}

export function getWithdrawalVerificationInfo(
  withdrawalAmount: number,
  activePlans: ActivePlan[],
  withdrawalRequests: WithdrawalRequest[] = [],
  userId?: string,
): WithdrawalVerificationInfo {
  const activePrincipal = getActivePrincipalAmount(activePlans);
  const freeThreshold = Math.round(activePrincipal * 3 * 100) / 100;
  const userRequests = withdrawalRequests.filter(
    (w) => (!userId || w.userId === userId) && w.status !== 'rejected',
  );
  const hasVerifiedPrincipal = userRequests.some(
    (w) => w.status === 'approved' && w.claimFeeAmount > 0,
  );
  const alreadyClaimed =
    Math.round(
      userRequests.reduce((sum, w) => sum + w.withdrawalAmount, 0) * 100,
    ) / 100;
  const remainingFreeAllowance = hasVerifiedPrincipal
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Math.round((freeThreshold - alreadyClaimed) * 100) / 100);

  const safeAmount =
    Number.isFinite(withdrawalAmount) && withdrawalAmount > 0
      ? withdrawalAmount
      : 0;
  const requiresVerificationPayment =
    !hasVerifiedPrincipal && safeAmount > remainingFreeAllowance;

  return {
    activePrincipal,
    freeThreshold,
    alreadyClaimed,
    remainingFreeAllowance,
    hasVerifiedPrincipal,
    requiresVerificationPayment,
    requiredClaimFee: requiresVerificationPayment ? activePrincipal : 0,
  };
}

export function getRequiredWithdrawalClaimFee(
  activePlans: ActivePlan[],
  withdrawalAmount?: number,
  withdrawalRequests: WithdrawalRequest[] = [],
  userId?: string,
): number {
  if (withdrawalAmount === undefined) {
    return getActivePrincipalAmount(activePlans);
  }
  return getWithdrawalVerificationInfo(
    withdrawalAmount,
    activePlans,
    withdrawalRequests,
    userId,
  ).requiredClaimFee;
}

export function formatINR(amount: number, showDecimals = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(safe);
}

export function maskAccountNumber(accountNumber: string): string {
  const clean = accountNumber.trim();
  if (clean.length <= 8) {
    return clean;
  }
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  return `${start}••••••${end}`;
}

export function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function getTodayDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function validateBankDetails(details: BankDetails): {
  valid: boolean;
  errors: Partial<Record<keyof BankDetails, string>>;
} {
  const errors: Partial<Record<keyof BankDetails, string>> = {};
  if (details.accountHolderName.trim().length < 2) {
    errors.accountHolderName = 'Enter full account holder name.';
  }
  const acctDigits = details.accountNumber.replace(/\s+/g, '');
  if (!/^\d{9,18}$/.test(acctDigits)) {
    errors.accountNumber = 'Account number must be 9 to 18 digits.';
  }
  const ifsc = details.ifscCode.trim().toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    errors.ifscCode = 'Enter a valid 11-character IFSC code (e.g. SBIN0004821).';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateUtrSubmission(
  amount: number,
  utrNumber: string,
): { valid: boolean; error?: string } {
  if (!Number.isFinite(amount) || amount < 100) {
    return { valid: false, error: 'Minimum UPI payment amount is ₹100.' };
  }
  if (amount > 50000) {
    return { valid: false, error: 'Maximum single UPI payment is ₹50,000.' };
  }
  const cleanUtr = utrNumber.trim().toUpperCase();
  if (!/^[A-Z0-9]{10,22}$/.test(cleanUtr)) {
    return {
      valid: false,
      error: 'Enter a valid 10–22 character UTR / UPI reference number.',
    };
  }
  return { valid: true };
}

export function validateWithdrawal(
  amount: number,
  balance: number,
  activePlans: ActivePlan[],
  bank: BankDetails | null,
  accountStatus: AccountStatus = 'active',
  maxWithdrawal = MAX_WITHDRAWAL,
  withdrawalRequests: WithdrawalRequest[] = [],
  userId?: string,
): {
  valid: boolean;
  minRequired: number;
  claimFee: number;
  requiresPayment: boolean;
  verification: WithdrawalVerificationInfo;
  error?: string;
} {
  const minRequired = getMinWithdrawalAmount(activePlans);
  const verification = getWithdrawalVerificationInfo(
    amount,
    activePlans,
    withdrawalRequests,
    userId,
  );
  const claimFee = verification.requiredClaimFee;
  const requiresPayment = verification.requiresVerificationPayment;

  if (accountStatus === 'suspended') {
    return {
      valid: false,
      minRequired,
      claimFee,
      requiresPayment,
      verification,
      error: 'Your account is currently suspended by Admin.',
    };
  }
  if (!bank) {
    return {
      valid: false,
      minRequired,
      claimFee,
      requiresPayment,
      verification,
      error: 'Please add your bank account details before withdrawing.',
    };
  }
  if (activePlans.length === 0) {
    return {
      valid: false,
      minRequired,
      claimFee,
      requiresPayment,
      verification,
      error: `Activate at least one Mahindra BE6 plan first (min withdrawal: 4 days income ${formatINR(minRequired)}).`,
    };
  }
  if (balance < minRequired) {
    return {
      valid: false,
      minRequired,
      claimFee,
      requiresPayment,
      verification,
      error: `Withdrawable balance must reach 4 days income (${formatINR(minRequired)}) before withdrawing.`,
    };
  }
  if (!Number.isFinite(amount) || amount < minRequired) {
    return {
      valid: false,
      minRequired,
      claimFee,
      requiresPayment,
      verification,
      error: `Minimum withdrawal is 4 days income (${formatINR(minRequired)}).`,
    };
  }
  if (amount > maxWithdrawal) {
    return {
      valid: false,
      minRequired,
      claimFee,
      requiresPayment,
      verification,
      error: `Maximum withdrawal per request is ${formatINR(maxWithdrawal)}.`,
    };
  }
  if (amount > balance) {
    return {
      valid: false,
      minRequired,
      claimFee,
      requiresPayment,
      verification,
      error: 'Insufficient withdrawable balance.',
    };
  }
  return { valid: true, minRequired, claimFee, requiresPayment, verification };
}

export function applyPurchasePlan(
  state: AppState,
  plan: InvestmentPlan,
  nowIso: string,
): { nextState: AppState; error?: string } {
  if (state.accountStatus === 'suspended') {
    return { nextState: state, error: 'Account suspended. Contact Admin.' };
  }
  if (state.balance < plan.investmentAmount) {
    return {
      nextState: state,
      error: `Insufficient balance. Need ${formatINR(plan.investmentAmount)} to activate ${plan.name}.`,
    };
  }
  const activePlan: ActivePlan = {
    id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    planId: plan.id,
    name: plan.name,
    modelName: plan.modelName,
    dailyIncome: plan.dailyIncome,
    totalIncome: plan.totalIncome,
    durationDays: plan.durationDays,
    investmentAmount: plan.investmentAmount,
    purchasedAt: nowIso,
    daysClaimed: 0,
    lastClaimDate: null,
    imageUrl: plan.imageUrl,
  };
  const tx: Transaction = {
    id: `tx-buy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: state.userId,
    userName: state.auth.userName,
    userLabel: state.auth.userName,
    description: `Purchased ${plan.name}`,
    kind: 'purchase',
    amount: plan.investmentAmount,
    isCredit: false,
    timestamp: nowIso,
    isOwn: true,
  };
  return {
    nextState: {
      ...state,
      balance: Math.round((state.balance - plan.investmentAmount) * 100) / 100,
      activePlans: [activePlan, ...state.activePlans],
      transactions: [tx, ...state.transactions],
    },
  };
}

export function applyDailyCheckIn(
  state: AppState,
  code: string,
  todayDateStr: string,
  nowIso: string,
): { nextState: AppState; reward?: number; error?: string } {
  const expectedCode =
    state.settings?.dailyCheckInCode ?? DAILY_CHECKIN_CODE;
  const rewardAmount = state.settings?.checkInRewardAmount ?? 25;

  if (state.lastCheckInDate === todayDateStr) {
    return {
      nextState: state,
      error: 'Daily bonus already claimed today. Come back after 12:00 AM.',
    };
  }
  const normalized = code.trim().toUpperCase();
  const isOneTapDaily = normalized === '' || normalized === 'DAILY';
  if (!isOneTapDaily && normalized !== expectedCode.toUpperCase()) {
    return {
      nextState: state,
      error: `Invalid bonus code. Leave blank for 1-tap daily bonus or enter ${expectedCode}.`,
    };
  }
  const tx: Transaction = {
    id: `tx-chk-${Date.now()}`,
    userId: state.userId,
    userName: state.auth.userName,
    userLabel: state.auth.userName,
    description: 'Daily Check-In Reward',
    kind: 'checkin',
    amount: rewardAmount,
    isCredit: true,
    timestamp: nowIso,
    isOwn: true,
  };
  return {
    reward: rewardAmount,
    nextState: {
      ...state,
      balance: Math.round((state.balance + rewardAmount) * 100) / 100,
      lastCheckInDate: todayDateStr,
      lastCheckInReward: rewardAmount,
      transactions: [tx, ...state.transactions],
    },
  };
}

export function applyClaimDailyYield(
  state: AppState,
  activePlanId: string,
  todayDateStr: string,
  nowIso: string,
): { nextState: AppState; earned?: number; error?: string } {
  const target = state.activePlans.find((p) => p.id === activePlanId);
  if (!target) {
    return { nextState: state, error: 'Active plan not found.' };
  }
  if (target.daysClaimed >= target.durationDays) {
    return { nextState: state, error: 'This plan has completed its duration.' };
  }
  if (target.lastClaimDate === todayDateStr) {
    return {
      nextState: state,
      error: 'Today’s yield has already been claimed for this BE6 vehicle.',
    };
  }
  const earned = target.dailyIncome;
  const updatedPlans = state.activePlans.map((p) =>
    p.id === activePlanId
      ? { ...p, daysClaimed: p.daysClaimed + 1, lastClaimDate: todayDateStr }
      : p,
  );
  const tx: Transaction = {
    id: `tx-yld-${Date.now()}`,
    userId: state.userId,
    userName: state.auth.userName,
    userLabel: state.auth.userName,
    description: `Daily Yield (${target.name})`,
    kind: 'yield',
    amount: earned,
    isCredit: true,
    timestamp: nowIso,
    isOwn: true,
  };
  return {
    earned,
    nextState: {
      ...state,
      balance: Math.round((state.balance + earned) * 100) / 100,
      activePlans: updatedPlans,
      transactions: [tx, ...state.transactions],
    },
  };
}

export function computeTeamSummary(
  members: ReferralMember[],
  levelFilter?: 1 | 2 | 3,
) {
  const filtered = levelFilter
    ? members.filter((m) => m.level === levelFilter)
    : members;
  const totalMembers = filtered.length;
  const totalRecharge = filtered.reduce((sum, m) => sum + m.rechargeAmount, 0);
  const totalCommission = filtered.reduce(
    (sum, m) => sum + m.commissionEarned,
    0,
  );
  const commissionRate = levelFilter === 1 || !levelFilter ? 40 : 0;
  return {
    totalMembers,
    totalRecharge,
    totalCommission,
    commissionRate,
  };
}

export function isValidUpiId(upiId: string): boolean {
  const clean = upiId.trim();
  if (clean.length < 3 || clean.length > 100) return false;
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(clean);
}

export function buildUpiPaymentUri(
  upiId: string,
  merchantName: string,
  amount?: number,
): string {
  const pa = upiId.trim() || MERCHANT_UPI_ID;
  const pn = merchantName.trim() || MERCHANT_NAME;
  const params: string[] = [
    `pa=${encodeURIComponent(pa)}`,
    `pn=${encodeURIComponent(pn)}`,
  ];
  if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
    const cleanAmount = Math.round(amount * 100) / 100;
    params.push(`am=${cleanAmount}`);
  }
  params.push('cu=INR');
  return `upi://pay?${params.join('&')}`;
}

export const MAX_CUSTOM_QR_DATA_URL_LENGTH = 260000;
const CUSTOM_QR_DATA_URL_RE =
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export function validateCustomQrDataUrl(dataUrl: unknown): {
  valid: boolean;
  value: string | null;
  error?: string;
} {
  if (dataUrl === null || dataUrl === undefined || dataUrl === '') {
    return { valid: true, value: null };
  }
  if (typeof dataUrl !== 'string') {
    return { valid: false, value: null, error: 'Invalid QR image format.' };
  }
  const trimmed = dataUrl.trim();
  if (trimmed.length > MAX_CUSTOM_QR_DATA_URL_LENGTH) {
    return {
      valid: false,
      value: null,
      error: 'Uploaded QR image is too large. Choose a clearer/smaller QR image.',
    };
  }
  if (!CUSTOM_QR_DATA_URL_RE.test(trimmed)) {
    return {
      valid: false,
      value: null,
      error: 'Only PNG, JPG, or WebP QR images are supported.',
    };
  }
  return { valid: true, value: trimmed };
}
