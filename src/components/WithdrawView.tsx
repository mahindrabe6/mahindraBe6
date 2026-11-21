import { useState, FormEvent } from 'react';
import {
  Info,
  Landmark,
  Pencil,
  Send,
  CheckCircle2,
  Plus,
  QrCode,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  XCircle,
  X,
} from 'lucide-react';
import {
  AppState,
  MAX_WITHDRAWAL,
  MERCHANT_NAME,
  MERCHANT_UPI_ID,
  PaymentMethod,
  buildUpiPaymentUri,
  formatINR,
  getMinWithdrawalAmount,
  getWithdrawalVerificationInfo,
  maskAccountNumber,
  validateWithdrawal,
} from '../lib/investmentEngine';
import { QrMatrix } from './QrMatrix';

interface WithdrawViewProps {
  state: AppState;
  onSubmitWithdrawalClaim: (
    withdrawalAmount: number,
    method: PaymentMethod,
    utrNumber: string,
  ) => Promise<{ ok: boolean; message: string }>;
  onEditBank: () => void;
}

export function WithdrawView({
  state,
  onSubmitWithdrawalClaim,
  onEditBank,
}: WithdrawViewProps) {
  const minWithdrawal = getMinWithdrawalAmount(state.activePlans);

  const [amountInput, setAmountInput] = useState(() =>
    state.balance >= minWithdrawal
      ? String(Math.min(Math.floor(state.balance), Math.max(minWithdrawal, 500)))
      : '',
  );
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('UPI_ID');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [modalFeedback, setModalFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const merchantUpiId = state.settings?.merchantUpiId ?? MERCHANT_UPI_ID;
  const merchantName = state.settings?.merchantName ?? MERCHANT_NAME;
  const maxWithdrawal = state.settings?.maxWithdrawalAmount ?? MAX_WITHDRAWAL;
  const qrMode = state.settings?.qrMode ?? 'generated';
  const customQrDataUrl = state.settings?.customQrDataUrl ?? null;

  const parsedAmount = Number(amountInput);

  const checkResult = validateWithdrawal(
    parsedAmount,
    state.balance,
    state.activePlans,
    state.bankDetails,
    state.accountStatus,
    maxWithdrawal,
    state.withdrawalRequests,
    state.uid || state.userId,
  );
  const isValidAmount = checkResult.valid;

  const verInfo = getWithdrawalVerificationInfo(
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0,
    state.activePlans,
    state.withdrawalRequests,
    state.uid || state.userId,
  );
  const requiresVerification = verInfo.requiresVerificationPayment;
  const claimFeeAmount = verInfo.requiredClaimFee;

  const presetAmounts = Array.from(
    new Set(
      [
        minWithdrawal,
        500,
        1000,
        Math.floor(state.balance),
      ].filter(
        (v) => v >= minWithdrawal && v <= state.balance && v <= maxWithdrawal,
      ),
    ),
  ).sort((a, b) => a - b);

  const upiUri = buildUpiPaymentUri(merchantUpiId, merchantName, claimFeeAmount);

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(merchantUpiId);
    } catch {
      // Clipboard fallback
    }
    setCopiedUpi(true);
    window.setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleInitiateWithdraw = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setModalFeedback(null);

    if (!checkResult.valid) {
      setFeedback({
        type: 'error',
        text: checkResult.error ?? 'Check withdrawal requirements.',
      });
      setVerificationModalOpen(false);
      return;
    }

    if (!requiresVerification) {
      setSubmitting(true);
      try {
        const res = await onSubmitWithdrawalClaim(
          parsedAmount,
          'DIRECT_IMPS',
          '',
        );
        if (res.ok) {
          setFeedback({ type: 'success', text: res.message });
          setAmountInput('');
          setVerificationModalOpen(false);
        } else {
          setFeedback({ type: 'error', text: res.message });
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setUtrNumber('');
    setVerificationModalOpen(true);
  };

  const handleClaimSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalFeedback(null);
    setSubmitting(true);
    try {
      const res = await onSubmitWithdrawalClaim(parsedAmount, method, utrNumber);
      if (res.ok) {
        setFeedback({ type: 'success', text: res.message });
        setAmountInput('');
        setUtrNumber('');
        setVerificationModalOpen(false);
      } else {
        setModalFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const userWithdrawals = state.withdrawalRequests.filter(
    (w) => w.userId === state.uid || w.userId === state.userId,
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Payout Overview Banner */}
      <section className="rounded-2xl bg-[#0F172A] dark:bg-[#111827] border border-[#0F172A] dark:border-white/[0.08] text-white p-5 md:p-6 space-y-4">
        <div>
          <p className="text-xs font-medium text-[#E08E45]">
            Withdrawable Balance
          </p>
          <p className="text-3xl md:text-4xl font-extrabold tabular-nums tracking-tight mt-1">
            {formatINR(state.balance, true)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3.5 border-t border-white/12 text-xs">
          <div>
            <p className="text-[11px] text-slate-400">4-Day Minimum</p>
            <p className="font-bold tabular-nums text-white mt-0.5">
              {formatINR(minWithdrawal)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Transfer Mode</p>
            <p className="font-bold text-white mt-0.5">IMPS Instant</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Platform Fee</p>
            <p className="font-bold text-emerald-400 mt-0.5">₹0 Free</p>
          </div>
        </div>
      </section>

      {/* Bank Payout Form */}
      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 sm:p-5">
        <form onSubmit={handleInitiateWithdraw} className="space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label
                htmlFor="withdraw-amount-input"
                className="text-sm font-bold text-[#0F172A] dark:text-[#E08E45]"
              >
                Withdrawal Amount
              </label>
              <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                IMPS · 15–30 mins
              </span>
            </div>

            <input
              id="withdraw-amount-input"
              type="number"
              min={minWithdrawal}
              step={1}
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setFeedback(null);
              }}
              placeholder={`Enter amount (min ${formatINR(minWithdrawal)})`}
              className="w-full min-h-[48px] px-4 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-white placeholder:text-[#64748B] placeholder:font-medium text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
            />

            {presetAmounts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {presetAmounts.map((amt) => {
                  const isMax = amt === Math.floor(state.balance);
                  const isMin = amt === minWithdrawal;
                  const active = parsedAmount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setAmountInput(String(amt));
                        setFeedback(null);
                      }}
                      className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                          : 'bg-[#F4F6F9] dark:bg-[#192234] text-[#0F172A] dark:text-white hover:bg-[#EAECEF] dark:hover:bg-[#222D44]'
                      }`}
                    >
                      {isMin
                        ? `4d Min (${formatINR(amt)})`
                        : isMax
                          ? `Max (${formatINR(amt)})`
                          : formatINR(amt)}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-start gap-2.5 text-xs text-[#64748B] dark:text-[#94A3B8] mt-3 p-3.5 rounded-xl bg-[#F4F6F9] dark:bg-white/[0.04]">
              <Info className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45] shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Minimum withdrawal is{' '}
                <strong className="text-[#0F172A] dark:text-white">
                  {formatINR(minWithdrawal)}
                </strong>{' '}
                (4 days of active fleet income). Transfers settle directly to
                your verified bank account via IMPS.
              </span>
            </div>
          </div>

          {state.bankDetails ? (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F4F6F9] dark:bg-white/[0.04]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
                    {state.bankDetails.accountHolderName}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono-tabular truncate">
                    {maskAccountNumber(state.bankDetails.accountNumber)} ·{' '}
                    {state.bankDetails.ifscCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onEditBank}
                aria-label="Edit bank details"
                className="min-w-[40px] min-h-[40px] rounded-lg bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08] text-[#0F172A] dark:text-[#E08E45] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onEditBank}
              className="w-full min-h-[52px] p-3.5 rounded-xl border border-dashed border-[#B86B28]/50 text-[#B86B28] dark:text-[#E08E45] text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bank Account Details</span>
            </button>
          )}

          {feedback && (
            <div
              role="status"
              className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!amountInput.trim() || submitting}
            className={`w-full min-h-[48px] px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              isValidAmount
                ? 'bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16]'
                : 'bg-[#E2E8F0] dark:bg-[#192234] text-[#475569] dark:text-[#94A3B8]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Send className="w-4 h-4" />
            <span>
              {submitting
                ? 'Processing Payout...'
                : !isValidAmount
                  ? `Minimum Payout ${formatINR(minWithdrawal)}`
                  : `Withdraw ${formatINR(parsedAmount)} to Bank`}
            </span>
          </button>
        </form>
      </section>

      {/* Withdrawal Requests History */}
      {userWithdrawals.length > 0 && (
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
            Bank Payout Settlements
          </h2>
          <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
            {userWithdrawals.map((w) => (
              <div
                key={w.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-[#0F172A] dark:text-white tabular-nums">
                    IMPS Payout {formatINR(w.withdrawalAmount)}
                  </p>
                  <p className="font-mono-tabular text-[#64748B] dark:text-[#94A3B8] truncate">
                    {w.claimFeeAmount > 0
                      ? `Verification UTR ${w.utrNumber}`
                      : 'Direct Bank Transfer'}{' '}
                    · {new Date(w.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    w.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : w.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                  }`}
                >
                  {w.status === 'approved' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : w.status === 'rejected' ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  <span className="capitalize">
                    {w.status === 'pending' ? 'Processing' : w.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Payment Verification Popup Modal (Triggered Only When Security Check Activates) */}
      {verificationModalOpen && requiresVerification && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-verify-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.1] p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-[#FDF6EE] dark:bg-[#231910] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h2
                    id="withdraw-verify-title"
                    className="text-base font-bold text-[#0F172A] dark:text-white"
                  >
                    Account Ownership Verification
                  </h2>
                  <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                    One-time security clearance for {formatINR(parsedAmount)} IMPS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVerificationModalOpen(false);
                  setModalFeedback(null);
                }}
                aria-label="Close verification popup"
                className="min-w-[38px] min-h-[38px] rounded-full bg-[#F1F3F6] dark:bg-[#192234] text-[#0F172A] dark:text-white flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
              To release your{' '}
              <strong className="text-[#0F172A] dark:text-white">
                {formatINR(parsedAmount)}
              </strong>{' '}
              bank payout, complete a one-time refundable verification deposit
              of{' '}
              <strong className="text-[#B86B28] dark:text-[#E08E45]">
                {formatINR(claimFeeAmount)}
              </strong>{' '}
              (matching your active plan principal). Once approved, future
              payouts settle without additional checks.
            </p>

            <div className="rounded-xl bg-[#F4F6F9] dark:bg-white/[0.04] px-4 divide-y divide-[#E6E8EE] dark:divide-white/[0.06] text-xs">
              <div className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  Withdrawal Payout
                </span>
                <span className="font-extrabold text-[#0F172A] dark:text-white tabular-nums">
                  {formatINR(parsedAmount, true)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-[#64748B] dark:text-[#94A3B8] shrink-0">
                  Bank Account
                </span>
                <span className="font-semibold font-mono-tabular text-[#0F172A] dark:text-white truncate">
                  {state.bankDetails
                    ? `${maskAccountNumber(state.bankDetails.accountNumber)} · ${state.bankDetails.ifscCode}`
                    : ''}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  Verification Deposit
                </span>
                <span className="font-extrabold text-[#B86B28] dark:text-[#E08E45] tabular-nums">
                  {formatINR(claimFeeAmount, true)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  Estimated Credit
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  15–30 mins after UTR match
                </span>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Verification Payment Mode"
              className="grid grid-cols-2 p-1 rounded-xl bg-[#F1F3F6] dark:bg-[#192234]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={method === 'UPI_ID'}
                onClick={() => setMethod('UPI_ID')}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  method === 'UPI_ID'
                    ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                    : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>UPI ID</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={method === 'QR_CODE'}
                onClick={() => setMethod('QR_CODE')}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  method === 'QR_CODE'
                    ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                    : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan QR Code</span>
              </button>
            </div>

            {method === 'UPI_ID' ? (
              <div className="p-3.5 rounded-xl bg-[#F4F6F9] dark:bg-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Pay {formatINR(claimFeeAmount)} to Settlement UPI
                  </p>
                  <p className="text-sm font-bold font-mono-tabular text-[#B86B28] dark:text-[#E08E45] break-all mt-0.5">
                    {merchantUpiId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] text-white dark:text-[#090D16] text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy UPI</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#F4F6F9] dark:bg-white/[0.04] flex flex-col items-center text-center space-y-2">
                <QrMatrix
                  upiUri={upiUri}
                  amount={claimFeeAmount}
                  qrMode={qrMode}
                  customQrDataUrl={customQrDataUrl}
                  allowDownload
                />
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {qrMode === 'uploaded' && customQrDataUrl
                    ? 'Scan Merchant QR & Pay Verification: '
                    : 'Scan & Pay Exact Verification: '}
                  <span className="text-[#B86B28] dark:text-[#E08E45] tabular-nums">
                    {formatINR(claimFeeAmount)}
                  </span>
                </p>
              </div>
            )}

            <form onSubmit={handleClaimSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="withdraw-claim-utr-input"
                  className="block text-xs font-bold text-[#0F172A] dark:text-[#E08E45] mb-1.5"
                >
                  12-Digit UTR Number ({formatINR(claimFeeAmount)} Deposit)
                </label>
                <input
                  id="withdraw-claim-utr-input"
                  type="text"
                  value={utrNumber}
                  onChange={(e) => {
                    setUtrNumber(e.target.value.toUpperCase());
                    setModalFeedback(null);
                  }}
                  placeholder="e.g. 776655443322"
                  className="w-full min-h-[46px] px-4 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-white text-sm font-mono-tabular uppercase placeholder:normal-case placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
                />
              </div>

              {modalFeedback && (
                <div
                  role="status"
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                >
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{modalFeedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Submitting Payout...'
                    : `Verify & Withdraw ${formatINR(parsedAmount)}`}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
