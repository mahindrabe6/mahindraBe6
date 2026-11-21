import { useState, FormEvent } from 'react';
import {
  Landmark,
  User,
  CreditCard,
  Hash,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { AppState, BankDetails } from '../lib/investmentEngine';

interface BankDetailsViewProps {
  state: AppState;
  onSaveBank: (details: BankDetails) => Promise<{ ok: boolean; message: string }>;
}

export function BankDetailsView({ state, onSaveBank }: BankDetailsViewProps) {
  const [holderName, setHolderName] = useState(
    state.bankDetails?.accountHolderName ?? '',
  );
  const [accountNumber, setAccountNumber] = useState(
    state.bankDetails?.accountNumber ?? '',
  );
  const [ifscCode, setIfscCode] = useState(state.bankDetails?.ifscCode ?? '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await onSaveBank({
        accountHolderName: holderName,
        accountNumber,
        ifscCode,
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: res.message });
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <section className="rounded-2xl bg-[#0F172A] dark:bg-[#111827] border border-[#0F172A] dark:border-white/[0.08] text-white p-4 flex items-center gap-3.5">
        <span className="w-11 h-11 rounded-xl bg-[#E08E45] text-[#090D16] flex items-center justify-center shrink-0">
          <Landmark className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-white">
            Secure Banking Information
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Your bank details are encrypted and used exclusively for IMPS
            withdrawals.
          </p>
        </div>
      </section>

      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="bank-holder-input"
              className="flex items-center gap-1.5 text-xs font-bold text-[#B86B28] dark:text-[#E08E45] mb-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Account Holder Name</span>
            </label>
            <input
              id="bank-holder-input"
              type="text"
              value={holderName}
              onChange={(e) => {
                setHolderName(e.target.value);
                setFeedback(null);
              }}
              placeholder="Enter full name as per bank"
              className="w-full min-h-[46px] px-4 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F6F7FA] dark:bg-[#090D16] text-[#0F172A] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
            />
          </div>

          <div>
            <label
              htmlFor="bank-account-input"
              className="flex items-center gap-1.5 text-xs font-bold text-[#B86B28] dark:text-[#E08E45] mb-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Account Number</span>
            </label>
            <input
              id="bank-account-input"
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                setFeedback(null);
              }}
              placeholder="Enter account number"
              className="w-full min-h-[46px] px-4 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F6F7FA] dark:bg-[#090D16] text-[#0F172A] dark:text-white text-sm font-mono-tabular focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
            />
          </div>

          <div>
            <label
              htmlFor="bank-ifsc-input"
              className="flex items-center gap-1.5 text-xs font-bold text-[#B86B28] dark:text-[#E08E45] mb-1.5"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>IFSC Code</span>
            </label>
            <input
              id="bank-ifsc-input"
              type="text"
              value={ifscCode}
              onChange={(e) => {
                setIfscCode(e.target.value.toUpperCase());
                setFeedback(null);
              }}
              placeholder="e.g. SBIN0004821"
              className="w-full min-h-[46px] px-4 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-white text-sm font-mono-tabular uppercase placeholder:normal-case placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
            />
          </div>

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
            disabled={saving}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Bank Details'}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
