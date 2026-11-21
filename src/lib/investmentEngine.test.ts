import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_EMAIL,
  INITIAL_STATE,
  INVESTMENT_PLANS,
  DAILY_CHECKIN_CODE,
  applyClaimDailyYield,
  applyDailyCheckIn,
  applyPurchasePlan,
  buildInviteLink,
  buildUpiPaymentUri,
  computePendingYieldSummary,
  computeTeamSummary,
  deriveDisplayNameFromAuth,
  extractCleanEmail,
  extractInviteCodeFromSearch,
  formatAccountIdentifier,
  generateReferralCode,
  isBootstrappedAdminEmail,
  isSyntheticPhoneEmail,
  isValidUpiId,
  maskIdentifier,
  maskPhone,
  parseAuthIdentifier,
  phoneToSyntheticEmail,
  validateBankDetails,
  validateCustomQrDataUrl,
  validatePasswordChange,
  validatePasswordStrength,
  validateUtrSubmission,
  validateWithdrawal,
} from './investmentEngine';

test('INITIAL_STATE starts unauthenticated with zero seeded PII or demo balances', () => {
  assert.equal(INITIAL_STATE.auth.isAuthenticated, false);
  assert.equal(INITIAL_STATE.auth.userName, '');
  assert.equal(INITIAL_STATE.auth.phone, '');
  assert.equal(INITIAL_STATE.auth.email, '');
  assert.equal(INITIAL_STATE.userId, '');
  assert.equal(INITIAL_STATE.uid, '');
  assert.equal(INITIAL_STATE.balance, 0);
  assert.equal(INITIAL_STATE.bankDetails, null);
  assert.equal(INITIAL_STATE.activePlans.length, 0);
  assert.equal(INITIAL_STATE.transactions.length, 0);
});

test('invite link builder uses current origin and parser extracts valid codes safely', () => {
  const link = buildInviteLink('https://my-app.example.com/', 'be64821abcd');
  assert.equal(link, 'https://my-app.example.com/?invite=BE64821ABCD');

  assert.equal(extractInviteCodeFromSearch('?invite=be6k49r0'), 'BE6K49R0');
  assert.equal(extractInviteCodeFromSearch('?ref=BE69911AB'), 'BE69911AB');
  assert.equal(extractInviteCodeFromSearch('?invite=bad!@#'), null);
  assert.equal(extractInviteCodeFromSearch('?invite=abc'), null);
  assert.equal(extractInviteCodeFromSearch(''), null);
});

test('referral code generator and identifier masking follow schema bounds for both phone and email', () => {
  const phoneCode = generateReferralCode('9876543210', 'uid_abc123');
  assert.match(phoneCode, /^[A-Z0-9]{6,16}$/);
  const emailCode = generateReferralCode('', 'uid_xyz789');
  assert.match(emailCode, /^[A-Z0-9]{6,16}$/);

  assert.equal(maskPhone('9876543210'), '98****3210');
  assert.equal(maskIdentifier('9876543210'), '98****3210');
  const maskedEmail = maskIdentifier('', 'rahul.sharma@gmail.com');
  assert.ok(maskedEmail.length >= 4 && maskedEmail.length <= 20);
});

test('parseAuthIdentifier and password validator handle phone and email without OTP', () => {
  const phoneParsed = parseAuthIdentifier('+91 98765-43210');
  assert.deepEqual(phoneParsed, {
    kind: 'phone',
    authEmail: phoneToSyntheticEmail('9876543210'),
    phone: '9876543210',
    displayIdentifier: '9876543210',
  });
  assert.equal(isSyntheticPhoneEmail(phoneParsed?.authEmail), true);
  assert.equal(
    formatAccountIdentifier('', phoneParsed?.authEmail),
    '9876543210',
  );

  const emailParsed = parseAuthIdentifier('  Investor@Example.COM ');
  assert.deepEqual(emailParsed, {
    kind: 'email',
    authEmail: 'investor@example.com',
    phone: '',
    displayIdentifier: 'investor@example.com',
  });
  assert.equal(isSyntheticPhoneEmail(emailParsed?.authEmail), false);
  assert.equal(
    formatAccountIdentifier('', emailParsed?.authEmail),
    'investor@example.com',
  );

  assert.equal(parseAuthIdentifier('12345'), null);
  assert.equal(parseAuthIdentifier('bad-email'), null);

  assert.equal(validatePasswordStrength('12345').valid, false);
  assert.equal(validatePasswordStrength('123456').valid, true);
  assert.equal(extractCleanEmail('9876543210@phone.mahindrabe6.app'), '');
  assert.equal(extractCleanEmail('owner@example.com'), 'owner@example.com');

  assert.equal(
    validatePasswordChange('', 'newpass123', 'newpass123', true).valid,
    false,
  );
  assert.equal(
    validatePasswordChange('oldpass', 'newpass123', 'mismatch', true).valid,
    false,
  );
  assert.equal(
    validatePasswordChange('samepass', 'samepass', 'samepass', true).valid,
    false,
  );
  assert.equal(
    validatePasswordChange('oldpass', 'newpass123', 'newpass123', true).valid,
    true,
  );
  assert.equal(
    validatePasswordChange('', 'newpass123', 'newpass123', false).valid,
    true,
  );
});

test('admin email check matches bootstrapped owner case-insensitively', () => {
  assert.equal(isBootstrappedAdminEmail(ADMIN_EMAIL), true);
  assert.equal(isBootstrappedAdminEmail('TechBCOfficialAman@gmail.com'), true);
  assert.equal(isBootstrappedAdminEmail('other@example.com'), false);
  assert.equal(isBootstrappedAdminEmail(null), false);
});

test('plan purchase, daily check-in, and daily yield claim enforce rules', () => {
  const starterState = {
    ...INITIAL_STATE,
    auth: {
      isAuthenticated: true,
      role: 'investor' as const,
      userName: 'Test Investor',
      phone: '9988776655',
      email: 'investor@example.com',
    },
    uid: 'uid-test-1',
    userId: '9988776655',
    balance: 500,
  };

  const plan = INVESTMENT_PLANS[0]; // ₹400 investment, ₹100/day
  const purchase = applyPurchasePlan(starterState, plan, '2026-11-20T10:00:00.000Z');
  assert.equal(purchase.error, undefined);
  assert.equal(purchase.nextState.balance, 100);
  assert.equal(purchase.nextState.activePlans.length, 1);

  const checkIn = applyDailyCheckIn(
    purchase.nextState,
    DAILY_CHECKIN_CODE,
    '2026-11-20',
    '2026-11-20T10:05:00.000Z',
  );
  assert.equal(checkIn.error, undefined);
  assert.equal(checkIn.nextState.balance, 125);

  const dupCheckIn = applyDailyCheckIn(
    checkIn.nextState,
    '',
    '2026-11-20',
    '2026-11-20T10:06:00.000Z',
  );
  assert.ok(dupCheckIn.error);

  const planId = checkIn.nextState.activePlans[0].id;
  const yieldClaim = applyClaimDailyYield(
    checkIn.nextState,
    planId,
    '2026-11-20',
    '2026-11-20T10:10:00.000Z',
  );
  assert.equal(yieldClaim.error, undefined);
  assert.equal(yieldClaim.nextState.balance, 225);
  assert.equal(yieldClaim.nextState.activePlans[0].daysClaimed, 1);
});

test('bank, UTR, and withdrawal validations enforce limits and 3x verification rule', () => {
  const bankCheck = validateBankDetails({
    accountHolderName: 'Test Investor',
    accountNumber: '123456789012',
    ifscCode: 'SBIN0004821',
  });
  assert.equal(bankCheck.valid, true);

  assert.equal(validateUtrSubmission(400, '432198765410').valid, true);
  assert.equal(validateUtrSubmission(50, '432198765410').valid, false);
  assert.equal(validateUtrSubmission(400, 'BAD').valid, false);

  const activePlan = {
    id: 'ap-1',
    planId: 'normal-popular',
    name: 'BE6 Pack One',
    modelName: 'Mahindra BE6 Obsidian Edition',
    dailyIncome: 100,
    totalIncome: 1500,
    durationDays: 15,
    investmentAmount: 400,
    purchasedAt: '2026-11-18T10:00:00.000Z',
    daysClaimed: 4,
    lastClaimDate: '2026-11-19',
    imageUrl: '/src/assets/images/be6_obsidian_stealth_1795164412224.jpg',
  };

  const bank = {
    accountHolderName: 'Test Investor',
    accountNumber: '123456789012',
    ifscCode: 'SBIN0004821',
  };

  // Below 4x daily income (₹400) fails
  const lowWd = validateWithdrawal(300, 1500, [activePlan], bank);
  assert.equal(lowWd.valid, false);

  // Within 3x principal (<= ₹1,200) requires ₹0 fee
  const freeWd = validateWithdrawal(1000, 1500, [activePlan], bank);
  assert.equal(freeWd.valid, true);
  assert.equal(freeWd.requiresPayment, false);
  assert.equal(freeWd.claimFee, 0);

  // Above 3x principal (> ₹1,200) requires 1x principal verification fee (₹400)
  const highWd = validateWithdrawal(1300, 1500, [activePlan], bank);
  assert.equal(highWd.valid, true);
  assert.equal(highWd.requiresPayment, true);
  assert.equal(highWd.claimFee, 400);
});

test('team summary computes level 1 commission and member totals', () => {
  const summary = computeTeamSummary([
    {
      id: 'r1',
      userName: 'Member One',
      maskedPhone: '98****1122',
      level: 1,
      rechargeAmount: 500,
      commissionEarned: 200,
      joinedAt: '2026-11-20T09:00:00.000Z',
    },
  ]);
  assert.equal(summary.totalMembers, 1);
  assert.equal(summary.totalRecharge, 500);
  assert.equal(summary.totalCommission, 200);
  assert.equal(summary.commissionRate, 40);
});

test('computePendingYieldSummary tracks real-time accrual rate and claim status', () => {
  const activePlan = {
    id: 'ap-live-1',
    planId: 'normal-popular',
    name: 'BE6 Pack One',
    modelName: 'Mahindra BE6 Obsidian Edition',
    dailyIncome: 240,
    totalIncome: 3600,
    durationDays: 15,
    investmentAmount: 1000,
    purchasedAt: new Date(2026, 10, 19, 8, 0, 0, 0).toISOString(),
    daysClaimed: 1,
    lastClaimDate: '2026-11-19',
    imageUrl: '/src/assets/images/be6_obsidian_stealth_1795164412224.jpg',
  };

  // At 12:00 noon (halfway through the day), 50% of ₹240 = ₹120 accrued
  const noonMs = new Date(2026, 10, 20, 12, 0, 0, 0).getTime();
  const midDay = computePendingYieldSummary([activePlan], '2026-11-20', noonMs);
  assert.equal(midDay.ongoingCount, 1);
  assert.equal(midDay.unclaimedCount, 1);
  assert.equal(midDay.claimableTodayTotal, 240);
  assert.equal(midDay.accruedAmount, 120);
  assert.equal(midDay.yieldPerHour, 10);
  assert.equal(midDay.allClaimedToday, false);

  // 1 hour later (13:00), accrued amount advances cleanly by yieldPerHour (+₹10)
  const onePmMs = new Date(2026, 10, 20, 13, 0, 0, 0).getTime();
  const later = computePendingYieldSummary([activePlan], '2026-11-20', onePmMs);
  assert.equal(later.accruedAmount, 130);

  // Once claimed today, pending yield resets and allClaimedToday becomes true
  const claimedToday = computePendingYieldSummary(
    [{ ...activePlan, lastClaimDate: '2026-11-20', daysClaimed: 2 }],
    '2026-11-20',
    onePmMs,
  );
  assert.equal(claimedToday.accruedAmount, 0);
  assert.equal(claimedToday.claimableTodayTotal, 0);
  assert.equal(claimedToday.allClaimedToday, true);
});

test('UPI ID validator, URI builder, and custom QR image validator enforce safe formats', () => {
  assert.equal(isValidUpiId('mahindrabe6.pay@okicici'), true);
  assert.equal(isValidUpiId('9876543210@ybl'), true);
  assert.equal(isValidUpiId('invalid upi@ok'), false);
  assert.equal(isValidUpiId('noatsign'), false);

  assert.equal(
    buildUpiPaymentUri('merchant@okaxis', 'Mahindra BE6 Fleet', 400),
    'upi://pay?pa=merchant%40okaxis&pn=Mahindra%20BE6%20Fleet&am=400&cu=INR',
  );
  assert.equal(
    buildUpiPaymentUri('merchant@okaxis', 'Mahindra BE6 Fleet'),
    'upi://pay?pa=merchant%40okaxis&pn=Mahindra%20BE6%20Fleet&cu=INR',
  );

  assert.deepEqual(validateCustomQrDataUrl(null), { valid: true, value: null });
  assert.equal(
    validateCustomQrDataUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==').valid,
    true,
  );
  assert.equal(
    validateCustomQrDataUrl('data:image/svg+xml;base64,PHN2Zz4=').valid,
    false,
  );
  assert.equal(
    validateCustomQrDataUrl('https://evil.example.com/qr.png').valid,
    false,
  );
});

test('deriveDisplayNameFromAuth produces valid 2-80 char names for frictionless signup', () => {
  assert.equal(
    deriveDisplayNameFromAuth({ explicitName: '  Aman   Verma  ', phone: '9876543210' }),
    'Aman Verma',
  );
  assert.equal(
    deriveDisplayNameFromAuth({ explicitName: '', phone: '9876543210' }),
    'BE6 Member 3210',
  );
  assert.equal(
    deriveDisplayNameFromAuth({ explicitName: '', email: 'priya.sharma@gmail.com' }),
    'Priya Sharma',
  );
  assert.equal(
    deriveDisplayNameFromAuth({
      explicitName: 'A',
      email: phoneToSyntheticEmail('9876543210'),
    }),
    'BE6 Member 3210',
  );
  assert.equal(
    deriveDisplayNameFromAuth({ explicitName: 'A', email: '' }),
    'BE6 Member',
  );
});

