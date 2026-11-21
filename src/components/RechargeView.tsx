import { useState, FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Wallet,
  IndianRupee,
  QrCode,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
} from 'lucide-react';
import {
  AppState,
  MERCHANT_NAME,
  MERCHANT_UPI_ID,
  PaymentMethod,
  RECHARGE_PRESETS,
  buildUpiPaymentUri,
  formatINR,
} from '../lib/investmentEngine';
import { QrMatrix } from './QrMatrix';
import { fireCelebrationConfetti } from './SuccessCelebration';

interface RechargeViewProps {
  state: AppState;
  onSubmitUtr: (
    amount: number,
    method: PaymentMethod,
    utrNumber: string,
  ) => Promise<{ ok: boolean; message: string }>;
}

export function RechargeView({ state, onSubmitUtr }: RechargeViewProps) {
  const [amountInput, setAmountInput] = useState('400');
  const [method, setMethod] = useState<PaymentMethod>('UPI_ID');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [celebration, setCelebration] = useState<{
    amount: number;
    utr: string;
    message: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const merchantUpiId = state.settings?.merchantUpiId ?? MERCHANT_UPI_ID;
  const merchantName = state.settings?.merchantName ?? MERCHANT_NAME;
  const qrMode = state.settings?.qrMode ?? 'generated';
  const customQrDataUrl = state.settings?.customQrDataUrl ?? null;

  const parsedAmount = Number(amountInput);
  const effectiveAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 400;
  const upiUri = buildUpiPaymentUri(merchantUpiId, merchantName, effectiveAmount);

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(merchantUpiId);
    } catch {
      // Clipboard fallback
    }
    setCopiedUpi(true);
    window.setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const submittedUtr = utrNumber.trim().toUpperCase();
    try {
      const res = await onSubmitUtr(parsedAmount, method, submittedUtr);
      if (res.ok) {
        setFeedback({ type: 'success', text: res.message });
        setCelebration({
          amount: parsedAmount,
          utr: submittedUtr,
          message: res.message,
        });
        setUtrNumber('');
        fireCelebrationConfetti();
      } else {
        setCelebration(null);
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const userRequests = state.rechargeRequests.filter(
    (r) => r.userId === state.uid || r.userId === state.userId,
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Current Balance Banner */}
      <section className="rounded-2xl bg-[#0F172A] dark:bg-[#111827] border border-[#0F172A] dark:border-white/[0.08] text-white p-5 md:p-6">
        <p className="flex items-center gap-2 text-xs font-medium text-[#E08E45]">
          <Wallet className="w-4 h-4" />
          <span>Current Balance</span>
        </p>
        <p className="text-3xl md:text-4xl font-extrabold tabular-nums tracking-tight mt-1.5">
          {formatINR(state.balance, true)}
        </p>
        <p className="text-xs text-slate-300 mt-1">
          Pay via UPI ID or QR Code · Wallet credited once Fleet Admin verifies
          your UTR
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Enter Amount + Preset Grid */}
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#F1F3F6] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </span>
            <label
              htmlFor="recharge-amount-input"
              className="text-base font-bold text-[#0F172A] dark:text-white"
            >
              1. Enter Recharge Amount
            </label>
          </div>

          <input
            id="recharge-amount-input"
            type="number"
            min={100}
            step={1}
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value);
              setFeedback(null);
              setCelebration(null);
            }}
            placeholder="Enter recharge amount"
            className="w-full min-h-[48px] px-4 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F6F7FA] dark:bg-[#090D16] text-[#0F172A] dark:text-white text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
          />

          <div className="grid grid-cols-4 gap-2">
            {RECHARGE_PRESETS.map((preset) => {
              const selected = parsedAmount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAmountInput(String(preset));
                    setFeedback(null);
                    setCelebration(null);
                  }}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-xs sm:text-sm font-bold tabular-nums transition-colors whitespace-nowrap cursor-pointer ${
                    selected
                      ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                      : 'bg-[#F6F7FA] dark:bg-[#192234] text-[#0F172A] dark:text-white border border-[#E6E8EE] dark:border-white/[0.08]'
                  }`}
                >
                  ₹{preset}
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: UPI ID or QR Code Payment Details */}
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 sm:p-5 space-y-4">
          <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
            2. Pay via UPI ID or QR Code
          </h2>

          <div
            role="tablist"
            aria-label="UPI Payment Mode"
            className="grid grid-cols-2 p-1 rounded-xl bg-[#F1F3F6] dark:bg-[#192234]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={method === 'UPI_ID'}
              onClick={() => setMethod('UPI_ID')}
              className={`min-h-[42px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
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
              className={`min-h-[42px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
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
            <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-white/[0.04] space-y-3">
              <div className="flex items-center justify-between gap-4 text-xs text-[#64748B] dark:text-[#94A3B8]">
                <span className="shrink-0">Payee Name</span>
                <span className="font-semibold text-[#0F172A] dark:text-white text-right truncate">
                  {merchantName}
                </span>
              </div>
              <div className="pt-2.5 border-t border-[#E6E8EE] dark:divide-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Official Merchant UPI ID
                  </p>
                  <p className="text-sm font-bold font-mono-tabular text-[#B86B28] dark:text-[#E08E45] break-all mt-0.5">
                    {merchantUpiId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] text-white dark:text-[#090D16] text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-[#090D16]" />
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
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-white/[0.04] flex flex-col items-center text-center space-y-2.5">
              <QrMatrix
                upiUri={upiUri}
                amount={effectiveAmount}
                qrMode={qrMode}
                customQrDataUrl={customQrDataUrl}
                allowDownload
              />
              <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                {qrMode === 'uploaded' && customQrDataUrl
                  ? 'Scan Verified Merchant QR · Pay '
                  : 'Scan with GPay, PhonePe, or Paytm · Amount: '}
                <span className="text-[#B86B28] dark:text-[#E08E45] tabular-nums">
                  {formatINR(effectiveAmount)}
                </span>
              </p>
              <p className="text-[11px] font-mono-tabular text-[#64748B] dark:text-[#94A3B8] break-all">
                UPI: {merchantUpiId}
              </p>
            </div>
          )}

          {/* Step 3: UTR Reference Number */}
          <div className="pt-1 space-y-2">
            <label
              htmlFor="utr-number-input"
              className="block text-sm font-bold text-[#0F172A] dark:text-[#E08E45]"
            >
              3. Enter 12-Digit UTR / Reference Number
            </label>
            <input
              id="utr-number-input"
              type="text"
              value={utrNumber}
              onChange={(e) => {
                setUtrNumber(e.target.value.toUpperCase());
                setFeedback(null);
                setCelebration(null);
              }}
              placeholder="e.g. 432518904312"
              className="w-full min-h-[48px] px-4 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-white text-sm font-mono-tabular uppercase placeholder:normal-case placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
            />
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              After paying via UPI, enter the 12-digit UTR number from your
              payment app. Your balance updates after verification.
            </p>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {celebration ? (
            <motion.div
              key="recharge-celebration"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              role="status"
              className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/50 p-4 flex items-center gap-3.5"
            >
              <motion.div
                initial={{ scale: 0.4, rotate: -16 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs"
              >
                <CheckCircle2 className="w-6 h-6" />
              </motion.div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E08E45] shrink-0" />
                  <span>Recharge Request Submitted!</span>
                </p>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                  {formatINR(celebration.amount)} ·{' '}
                  <span className="font-mono-tabular">UTR {celebration.utr}</span>
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  {celebration.message}
                </p>
              </div>
            </motion.div>
          ) : (
            feedback && (
              <motion.div
                key="recharge-feedback"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="status"
                className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{feedback.text}</span>
              </motion.div>
            )
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[50px] px-5 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{submitting ? 'Submitting UTR...' : 'Submit UTR for Verification'}</span>
        </button>
      </form>

      {/* Submitted Recharge Requests */}
      {userRequests.length > 0 && (
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
            Your UPI Recharge Requests
          </h2>

          <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
            {userRequests.map((req) => (
              <div
                key={req.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-bold text-[#0F172A] dark:text-white tabular-nums">
                    {formatINR(req.amount)} ·{' '}
                    <span className="font-mono-tabular">UTR {req.utrNumber}</span>
                  </p>
                  <p className="text-[#64748B] dark:text-[#94A3B8]">
                    {req.method === 'QR_CODE' ? 'QR Code' : 'UPI ID'} ·{' '}
                    {new Date(req.createdAt).toLocaleString()}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    req.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : req.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                  }`}
                >
                  {req.status === 'approved' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : req.status === 'rejected' ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  <span className="capitalize">
                    {req.status === 'pending' ? 'Pending Review' : req.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
