import { useEffect, useMemo, useState, FormEvent } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  QrCode,
  Smartphone,
  UserCog,
  Wallet,
  LogIn,
  CarFront,
  Plus,
  Trash2,
  Ban,
  Check,
  BanknoteArrowUp,
  Search,
  Users,
  Sliders,
  Coins,
  ReceiptText,
  KeyRound,
  Mail,
  Shield,
  Upload,
  Image as ImageIcon,
  Megaphone,
  AlertTriangle,
  BellRing,
  Send,
} from 'lucide-react';
import { BroadcastTone } from '../lib/broadcastMessage';
import {
  AccountStatus,
  PlatformDatabase,
  PlatformSettings,
  UserAccount,
  buildUpiPaymentUri,
  formatINR,
  getPlanStatus,
  getRemainingDurationDays,
  isBootstrappedAdminEmail,
  isValidUpiId,
} from '../lib/investmentEngine';
import { compressQrImageFile } from '../lib/qrUtils';
import { PasswordSecurityCard } from './PasswordSecurityCard';
import { QrMatrix } from './QrMatrix';

interface AdminViewProps {
  database: PlatformDatabase;
  selectedUserUid: string | null;
  currentAdminUid?: string | null;
  onSelectUserUid: (uid: string) => void;
  onImpersonateUser?: (user: UserAccount) => void;
  onAdminAction: (
    type: string,
    payload?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; message: string }>;
  onLogout: () => void;
}

type AdminSection =
  | 'users'
  | 'recharges'
  | 'withdrawals'
  | 'ledger'
  | 'platform'
  | 'broadcast'
  | 'security';

export function AdminView({
  database,
  selectedUserUid,
  currentAdminUid,
  onSelectUserUid,
  onImpersonateUser,
  onAdminAction,
  onLogout,
}: AdminViewProps) {
  const [section, setSection] = useState<AdminSection>('users');
  const [reqFilter, setReqFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const selectedUser: UserAccount | undefined = useMemo(
    () =>
      database.users.find((u) => u.uid === selectedUserUid) ??
      database.users[0],
    [database.users, selectedUserUid],
  );

  // Selected user editable fields
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [holderName, setHolderName] = useState('');
  const [acctNumber, setAcctNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [userActivityTab, setUserActivityTab] = useState<
    'transactions' | 'recharges' | 'withdrawals'
  >('transactions');

  // Balance Adjuster State
  const [adjAmount, setAdjAmount] = useState('500');
  const [adjMode, setAdjMode] = useState<'credit' | 'debit' | 'set'>('credit');
  const [adjNote, setAdjNote] = useState('Admin Balance Adjustment');

  // Grant Plan State
  const [grantPlanId, setGrantPlanId] = useState(
    database.plans[0]?.id ?? 'normal-popular',
  );
  const [planEdits, setPlanEdits] = useState<
    Record<string, { daysClaimed: string; durationDays: string }>
  >({});

  // Ledger Scope
  const [ledgerScope, setLedgerScope] = useState<'all' | 'selected'>('all');

  // Platform Settings Editor State
  const [settingsForm, setSettingsForm] = useState<PlatformSettings>(
    database.settings,
  );
  const [previewQrAmount, setPreviewQrAmount] = useState<number>(400);
  const [qrUploadError, setQrUploadError] = useState<string | null>(null);
  const [qrUploading, setQrUploading] = useState(false);
  const [catalogEdits, setCatalogEdits] = useState<
    Record<
      string,
      { investmentAmount: string; dailyIncome: string; durationDays: string }
    >
  >({});

  // Broadcast Message Composer State
  const [broadcastTone, setBroadcastTone] = useState<BroadcastTone>('promo');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  useEffect(() => {
    if (!selectedUser) return;
    setUserName(selectedUser.userName);
    setUserEmail(selectedUser.email);
    setUserPhone(selectedUser.phone);
    setHolderName(selectedUser.bankDetails?.accountHolderName ?? '');
    setAcctNumber(selectedUser.bankDetails?.accountNumber ?? '');
    setIfsc(selectedUser.bankDetails?.ifscCode ?? '');
    const edits: Record<string, { daysClaimed: string; durationDays: string }> =
      {};
    for (const ap of selectedUser.activePlans) {
      edits[ap.id] = {
        daysClaimed: String(ap.daysClaimed),
        durationDays: String(ap.durationDays),
      };
    }
    setPlanEdits(edits);
  }, [selectedUser]);

  useEffect(() => {
    setSettingsForm(database.settings);
    const cEdits: Record<
      string,
      { investmentAmount: string; dailyIncome: string; durationDays: string }
    > = {};
    for (const p of database.plans) {
      cEdits[p.id] = {
        investmentAmount: String(p.investmentAmount),
        dailyIncome: String(p.dailyIncome),
        durationDays: String(p.durationDays),
      };
    }
    setCatalogEdits(cEdits);
  }, [database.settings, database.plans]);

  const notify = (res: { ok: boolean; message: string }) => {
    setFeedback({ ok: res.ok, text: res.message });
    window.setTimeout(() => setFeedback(null), 4000);
  };

  const runAction = async (type: string, payload?: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await onAdminAction(type, payload);
      notify(res);
      return res;
    } finally {
      setBusy(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return database.users;
    return database.users.filter(
      (u) =>
        u.userName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q) ||
        u.referralCode.toLowerCase().includes(q) ||
        (u.bankDetails?.accountNumber ?? '').toLowerCase().includes(q),
    );
  }, [database.users, searchQuery]);

  const adminUidSet = useMemo(
    () => new Set(database.adminUids ?? []),
    [database.adminUids],
  );

  const selectedUserRecharges = useMemo(
    () =>
      selectedUser
        ? database.rechargeRequests.filter((r) => r.userId === selectedUser.uid)
        : [],
    [database.rechargeRequests, selectedUser],
  );

  const selectedUserWithdrawals = useMemo(
    () =>
      selectedUser
        ? database.withdrawalRequests.filter(
            (w) => w.userId === selectedUser.uid,
          )
        : [],
    [database.withdrawalRequests, selectedUser],
  );

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of database.users) {
      map.set(u.uid, u.userName);
      map.set(u.userId, u.userName);
    }
    return map;
  }, [database.users]);

  const totalPlatformBalance = useMemo(
    () => database.users.reduce((sum, u) => sum + u.balance, 0),
    [database.users],
  );
  const pendingRecharges = database.rechargeRequests.filter(
    (r) => r.status === 'pending',
  ).length;
  const pendingWithdrawals = database.withdrawalRequests.filter(
    (w) => w.status === 'pending',
  ).length;

  const visibleRecharges =
    reqFilter === 'all'
      ? database.rechargeRequests
      : database.rechargeRequests.filter((r) => r.status === reqFilter);

  const visibleWithdrawals =
    reqFilter === 'all'
      ? database.withdrawalRequests
      : database.withdrawalRequests.filter((w) => w.status === reqFilter);

  const combinedLedger = useMemo(() => {
    if (ledgerScope === 'selected' && selectedUser) {
      return selectedUser.transactions.map((t) => ({
        ...t,
        fullUserName: selectedUser.userName,
        fullUserId: selectedUser.userId,
      }));
    }
    const all = database.users.flatMap((u) =>
      u.transactions.map((t) => ({
        ...t,
        fullUserName: u.userName,
        fullUserId: u.userId,
      })),
    );
    return all.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [database.users, ledgerScope, selectedUser]);

  const handleSaveUserDetails = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    await runAction('update_user', {
      uid: selectedUser.uid,
      userName,
      phone: userPhone,
      email: userEmail,
      bankDetails:
        holderName.trim() || acctNumber.trim() || ifsc.trim()
          ? {
              accountHolderName: holderName,
              accountNumber: acctNumber,
              ifscCode: ifsc,
            }
          : null,
    });
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    const nextStatus: AccountStatus =
      selectedUser.accountStatus === 'active' ? 'suspended' : 'active';
    await runAction('update_user', {
      uid: selectedUser.uid,
      accountStatus: nextStatus,
    });
  };

  const handleApplyBalance = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    await runAction('adjust_balance', {
      uid: selectedUser.uid,
      amount: Number(adjAmount),
      mode: adjMode,
      note: adjNote,
    });
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setQrUploadError(null);
    await runAction('update_settings', { settings: settingsForm });
  };

  const handleQrFileSelected = async (file: File | null | undefined) => {
    if (!file) return;
    setQrUploadError(null);
    setQrUploading(true);
    try {
      const res = await compressQrImageFile(file);
      if (!res.ok || !res.dataUrl) {
        setQrUploadError(res.error ?? 'Could not read QR image file.');
        return;
      }
      setSettingsForm((s) => ({
        ...s,
        qrMode: 'uploaded',
        customQrDataUrl: res.dataUrl,
      }));
    } finally {
      setQrUploading(false);
    }
  };

  const handleSendBroadcast = async (e: FormEvent) => {
    e.preventDefault();
    const res = await runAction('send_broadcast', {
      title: broadcastTitle,
      message: broadcastMessage,
      tone: broadcastTone,
    });
    if (res.ok) {
      setBroadcastTitle('');
      setBroadcastMessage('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Admin Control Banner */}
      <section className="rounded-2xl bg-[#0F172A] dark:bg-[#111827] border border-[#0F172A] dark:border-white/[0.08] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="w-11 h-11 rounded-xl bg-[#E08E45] text-[#090D16] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">
              Mahindra BE6 Fleet Admin Console
            </h1>
            <p className="text-xs text-slate-300">
              Complete unmasked investor directory, wallet &amp; plan control,
              UTR verification, withdrawal release, and platform settings.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSection('security')}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-[#E08E45] hover:text-[#090D16] text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </section>

      {/* Platform KPI Strip */}
      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E6E8EE] dark:divide-white/[0.08]">
        <div className="p-4">
          <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
            Registered Users
          </p>
          <p className="text-xl font-extrabold text-[#0F172A] dark:text-white tabular-nums mt-0.5">
            {database.users.length}
          </p>
        </div>
        <div className="p-4">
          <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
            Total User Wallets
          </p>
          <p className="text-xl font-extrabold text-[#B86B28] dark:text-[#E08E45] tabular-nums mt-0.5">
            {formatINR(totalPlatformBalance)}
          </p>
        </div>
        <div className="p-4">
          <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
            Pending UTR Recharges
          </p>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
            {pendingRecharges}
          </p>
        </div>
        <div className="p-4">
          <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
            Pending Withdraw Claims
          </p>
          <p className="text-xl font-extrabold text-[#0F172A] dark:text-white tabular-nums mt-0.5">
            {pendingWithdrawals}
          </p>
        </div>
      </section>

      {feedback && (
        <div
          role="status"
          className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.ok
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Admin Management Sections"
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08]"
      >
        {(
          [
            { id: 'users', label: `Users (${database.users.length})`, icon: Users },
            { id: 'recharges', label: `UTRs (${pendingRecharges})`, icon: QrCode },
            {
              id: 'withdrawals',
              label: `Claims (${pendingWithdrawals})`,
              icon: BanknoteArrowUp,
            },
            { id: 'ledger', label: 'Ledger', icon: ReceiptText },
            { id: 'platform', label: 'Platform', icon: Sliders },
            { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
            { id: 'security', label: 'Security', icon: KeyRound },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(tab.id)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: ALL USERS DIRECTORY & COMPLETE UNMASKED DETAILS / CONTROL */}
      {section === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Directory Panel */}
          <aside className="lg:col-span-4 bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
                All Investors ({database.users.length})
              </h2>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search investors"
                placeholder="Search name, full phone, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[42px] pl-9 pr-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F6F7FA] dark:bg-[#090D16] text-xs"
              />
            </div>

            <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06] max-h-[440px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                  No registered investors yet.
                </p>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUser?.uid === u.uid;
                  const userHasAdmin =
                    adminUidSet.has(u.uid) || isBootstrappedAdminEmail(u.email);
                  return (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => onSelectUserUid(u.uid)}
                      className={`w-full py-3 px-2.5 text-left rounded-xl transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[#0F172A] text-white dark:bg-[#E08E45] dark:text-[#090D16]'
                          : 'hover:bg-[#F6F7FA] dark:hover:bg-[#192234]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold truncate">
                            {u.userName}
                          </p>
                          {userHasAdmin && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                isSelected
                                  ? 'bg-white/20 text-white dark:bg-[#090D16]/20 dark:text-[#090D16]'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                              }`}
                            >
                              Admin
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] font-mono-tabular truncate ${
                            isSelected
                              ? 'text-slate-300 dark:text-[#090D16]/80'
                              : 'text-[#64748B] dark:text-[#94A3B8]'
                          }`}
                        >
                          {u.phone || u.email || u.userId} · {u.activePlans.length}{' '}
                          plans
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-extrabold tabular-nums">
                          {formatINR(u.balance)}
                        </p>
                        <p
                          className={`text-[10px] font-bold uppercase ${
                            u.accountStatus === 'active'
                              ? isSelected
                                ? 'text-emerald-300 dark:text-[#090D16]'
                                : 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-500'
                          }`}
                        >
                          {u.accountStatus}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Unmasked Detail & Control Panel */}
          {selectedUser && (
            <div className="lg:col-span-8 space-y-4">
              {/* Complete Unmasked Account Telemetry & Edit Form */}
              <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
                    <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                      {selectedUser.userName} · Complete Unmasked Details
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {onImpersonateUser && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onImpersonateUser(selectedUser)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>
                          {selectedUser.uid === currentAdminUid
                            ? 'Open My Investor View'
                            : 'Login to Account'}
                        </span>
                      </button>
                    )}

                    {!isBootstrappedAdminEmail(selectedUser.email) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            adminUidSet.has(selectedUser.uid)
                              ? 'revoke_admin'
                              : 'grant_admin',
                            { uid: selectedUser.uid },
                          )
                        }
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                          adminUidSet.has(selectedUser.uid)
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-[#F1F3F6] text-[#0F172A] dark:bg-[#192234] dark:text-white'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>
                          {adminUidSet.has(selectedUser.uid)
                            ? 'Revoke Admin'
                            : 'Make Admin'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleToggleStatus}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                        selectedUser.accountStatus === 'active'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {selectedUser.accountStatus === 'active' ? (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>

                    {database.users.length > 1 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction('delete_user', {
                            uid: selectedUser.uid,
                          })
                        }
                        aria-label={`Delete user ${selectedUser.userName}`}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Unmasked Readout Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F6F7FA] dark:bg-[#192234] text-xs">
                  <div>
                    <p className="text-[#64748B] dark:text-[#94A3B8]">
                      Email Address
                    </p>
                    <p className="font-bold text-[#0F172A] dark:text-white break-all">
                      {selectedUser.email || 'Mobile-only account'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] dark:text-[#94A3B8]">
                      Mobile Number
                    </p>
                    <p className="font-bold font-mono-tabular text-[#0F172A] dark:text-white">
                      {selectedUser.phone || 'Not linked'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] dark:text-[#94A3B8]">
                      Auth Password
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="font-semibold text-[#0F172A] dark:text-white">
                        Encrypted (Firebase Auth)
                      </span>
                      {selectedUser.email && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            runAction('send_password_reset', {
                              email: selectedUser.email,
                            })
                          }
                          className="px-2 py-1 rounded-md bg-white dark:bg-[#090D16] border border-[#E6E8EE] dark:border-white/[0.1] text-[11px] font-bold text-[#B86B28] dark:text-[#E08E45] hover:opacity-80 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Send Reset Link</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[#64748B] dark:text-[#94A3B8]">
                      Wallet Balance
                    </p>
                    <p className="font-extrabold tabular-nums text-[#B86B28] dark:text-[#E08E45]">
                      {formatINR(selectedUser.balance, true)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] dark:text-[#94A3B8]">
                      Referral Code
                    </p>
                    <p className="font-bold font-mono-tabular text-[#0F172A] dark:text-white">
                      {selectedUser.referralCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] dark:text-[#94A3B8]">
                      Referred By
                    </p>
                    <p className="font-semibold font-mono-tabular text-[#0F172A] dark:text-white">
                      {selectedUser.referredByCode ?? 'Direct Signup'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] dark:text-[#94A3B8]">
                      Last Check-In
                    </p>
                    <p className="font-semibold text-[#0F172A] dark:text-white">
                      {selectedUser.lastCheckInDate ?? 'Not claimed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] dark:text-[#94A3B8]">
                      Registered / Last Login
                    </p>
                    <p className="font-semibold text-[#0F172A] dark:text-white">
                      {new Date(selectedUser.createdAt).toLocaleDateString()} ·{' '}
                      {selectedUser.lastLoginAt
                        ? new Date(selectedUser.lastLoginAt).toLocaleTimeString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] dark:text-[#94A3B8]">
                      Full Bank A/C &amp; IFSC
                    </p>
                    <p className="font-bold font-mono-tabular text-[#0F172A] dark:text-white break-all">
                      {selectedUser.bankDetails
                        ? `${selectedUser.bankDetails.accountNumber} · ${selectedUser.bankDetails.ifscCode}`
                        : 'Not linked'}
                    </p>
                  </div>
                  <div className="sm:col-span-2 md:col-span-3 pt-1 border-t border-[#E6E8EE] dark:border-white/[0.08]">
                    <p className="text-[#64748B] dark:text-[#94A3B8]">
                      User UID
                    </p>
                    <p className="font-mono-tabular text-[11px] text-[#0F172A] dark:text-white break-all">
                      {selectedUser.uid}
                    </p>
                  </div>
                </div>

                {/* Edit User Profile & Bank Details */}
                <form onSubmit={handleSaveUserDetails} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor="adm-username"
                        className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1"
                      >
                        Full Investor Name
                      </label>
                      <input
                        id="adm-username"
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="adm-userphone"
                        className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1"
                      >
                        Mobile Number
                      </label>
                      <input
                        id="adm-userphone"
                        type="tel"
                        maxLength={10}
                        value={userPhone}
                        onChange={(e) =>
                          setUserPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                        }
                        placeholder="10-digit mobile"
                        className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-xs font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="adm-useremail"
                        className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1"
                      >
                        Email Address
                      </label>
                      <input
                        id="adm-useremail"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor="adm-bank-holder"
                        className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1"
                      >
                        Bank Holder Name
                      </label>
                      <input
                        id="adm-bank-holder"
                        type="text"
                        value={holderName}
                        onChange={(e) => setHolderName(e.target.value)}
                        className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-xs"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="adm-bank-acct"
                        className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1"
                      >
                        Full Bank Account Number
                      </label>
                      <input
                        id="adm-bank-acct"
                        type="text"
                        value={acctNumber}
                        onChange={(e) => setAcctNumber(e.target.value)}
                        className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-xs font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="adm-bank-ifsc"
                        className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1"
                      >
                        IFSC Code
                      </label>
                      <input
                        id="adm-bank-ifsc"
                        type="text"
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-xs font-mono-tabular uppercase"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full min-h-[44px] rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-xs font-bold cursor-pointer"
                  >
                    Save Profile &amp; Bank Details
                  </button>
                </form>
              </section>

              {/* Wallet Control + Fleet Plans Control */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Direct Wallet Control
                    </h3>
                  </div>

                  <form onSubmit={handleApplyBalance} className="space-y-3">
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#F1F3F6] dark:bg-[#192234]">
                      {(['credit', 'debit', 'set'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setAdjMode(m)}
                          className={`min-h-[36px] rounded-lg text-xs font-bold capitalize cursor-pointer ${
                            adjMode === m
                              ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                              : 'text-[#64748B] dark:text-[#94A3B8]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      min={0}
                      step={1}
                      aria-label="Adjustment Amount"
                      value={adjAmount}
                      onChange={(e) => setAdjAmount(e.target.value)}
                      className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-sm font-bold tabular-nums"
                    />
                    <input
                      type="text"
                      aria-label="Adjustment Reason"
                      value={adjNote}
                      onChange={(e) => setAdjNote(e.target.value)}
                      placeholder="Audit note"
                      className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-xs"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full min-h-[42px] rounded-xl bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] text-xs font-bold cursor-pointer"
                    >
                      Apply Wallet Update
                    </button>
                  </form>
                </section>

                {/* Referral Members (Unmasked) */}
                <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Unmasked Referral Members (
                      {selectedUser.referralMembers.length})
                    </h3>
                  </div>

                  {selectedUser.referralMembers.length === 0 ? (
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] py-4 text-center">
                      No invited team members for this investor.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06] max-h-52 overflow-y-auto">
                      {selectedUser.referralMembers.map((m) => (
                        <div
                          key={m.id}
                          className="py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-[#0F172A] dark:text-white truncate">
                              {m.userName ??
                                userNameById.get(m.userId ?? m.maskedPhone) ??
                                'Investor'}
                            </p>
                            <p className="font-mono-tabular text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                              {m.userId ?? m.maskedPhone} · L{m.level} ·
                              Recharge {formatINR(m.rechargeAmount)}
                            </p>
                          </div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                            +{formatINR(m.commissionEarned)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Fleet Plans & Duration Control */}
              <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CarFront className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Fleet Plans &amp; Duration Control (
                      {selectedUser.activePlans.length})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Select BE6 Plan to Grant"
                      value={grantPlanId}
                      onChange={(e) => setGrantPlanId(e.target.value)}
                      className="min-h-[38px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-xs font-semibold"
                    >
                      {database.plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatINR(p.investmentAmount)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction('grant_plan', {
                          uid: selectedUser.uid,
                          planId: grantPlanId,
                        })
                      }
                      className="min-h-[38px] px-3.5 rounded-xl bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Grant Plan</span>
                    </button>
                  </div>
                </div>

                {selectedUser.activePlans.length === 0 ? (
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] py-4 text-center">
                    No plans assigned to this investor.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
                    {selectedUser.activePlans.map((ap) => {
                      const remaining = getRemainingDurationDays(ap);
                      const status = getPlanStatus(ap);
                      const edit = planEdits[ap.id] ?? {
                        daysClaimed: String(ap.daysClaimed),
                        durationDays: String(ap.durationDays),
                      };
                      return (
                        <div
                          key={ap.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-[#0F172A] dark:text-white">
                              {ap.name} ({ap.modelName}) ·{' '}
                              {formatINR(ap.investmentAmount)}
                            </p>
                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                              {formatINR(ap.dailyIncome)}/day ·{' '}
                              <span
                                className={
                                  status === 'active'
                                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                    : 'font-semibold'
                                }
                              >
                                {remaining} of {ap.durationDays} days remaining
                              </span>
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <label className="flex items-center gap-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                              <span>Claimed</span>
                              <input
                                type="number"
                                min={0}
                                max={30}
                                value={edit.daysClaimed}
                                onChange={(e) =>
                                  setPlanEdits((prev) => ({
                                    ...prev,
                                    [ap.id]: {
                                      ...edit,
                                      daysClaimed: e.target.value,
                                    },
                                  }))
                                }
                                className="w-14 min-h-[34px] px-2 rounded-lg border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F6F7FA] dark:bg-[#090D16] text-xs font-bold tabular-nums"
                              />
                            </label>
                            <label className="flex items-center gap-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                              <span>Days</span>
                              <input
                                type="number"
                                min={7}
                                max={30}
                                value={edit.durationDays}
                                onChange={(e) =>
                                  setPlanEdits((prev) => ({
                                    ...prev,
                                    [ap.id]: {
                                      ...edit,
                                      durationDays: e.target.value,
                                    },
                                  }))
                                }
                                className="w-14 min-h-[34px] px-2 rounded-lg border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F6F7FA] dark:bg-[#090D16] text-xs font-bold tabular-nums"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                runAction('update_active_plan', {
                                  uid: selectedUser.uid,
                                  activePlanId: ap.id,
                                  daysClaimed: Number(edit.daysClaimed),
                                  durationDays: Number(edit.durationDays),
                                })
                              }
                              className="min-h-[34px] px-2.5 rounded-lg bg-[#F1F3F6] dark:bg-[#192234] text-[#0F172A] dark:text-white font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            {status === 'active' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  runAction('force_daily_yield', {
                                    uid: selectedUser.uid,
                                    activePlanId: ap.id,
                                  })
                                }
                                className="min-h-[34px] px-2.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Coins className="w-3 h-3" />
                                <span>+1d Yield</span>
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                runAction('remove_plan', {
                                  uid: selectedUser.uid,
                                  activePlanId: ap.id,
                                })
                              }
                              aria-label={`Remove ${ap.name}`}
                              className="min-w-[34px] min-h-[34px] rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Complete Per-User Activity Inspector (Transactions, Recharges, Withdrawals) */}
              <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ReceiptText className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      {selectedUser.userName} · Activity &amp; Requests
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F1F3F6] dark:bg-[#192234] text-xs">
                    <button
                      type="button"
                      onClick={() => setUserActivityTab('transactions')}
                      className={`min-h-[32px] px-2.5 rounded-lg font-bold cursor-pointer ${
                        userActivityTab === 'transactions'
                          ? 'bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white'
                          : 'text-[#64748B] dark:text-[#94A3B8]'
                      }`}
                    >
                      Ledger ({selectedUser.transactions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserActivityTab('recharges')}
                      className={`min-h-[32px] px-2.5 rounded-lg font-bold cursor-pointer ${
                        userActivityTab === 'recharges'
                          ? 'bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white'
                          : 'text-[#64748B] dark:text-[#94A3B8]'
                      }`}
                    >
                      Recharges ({selectedUserRecharges.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserActivityTab('withdrawals')}
                      className={`min-h-[32px] px-2.5 rounded-lg font-bold cursor-pointer ${
                        userActivityTab === 'withdrawals'
                          ? 'bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white'
                          : 'text-[#64748B] dark:text-[#94A3B8]'
                      }`}
                    >
                      Withdrawals ({selectedUserWithdrawals.length})
                    </button>
                  </div>
                </div>

                {userActivityTab === 'transactions' && (
                  <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06] max-h-60 overflow-y-auto">
                    {selectedUser.transactions.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                        No wallet transactions recorded for this investor.
                      </p>
                    ) : (
                      selectedUser.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-[#0F172A] dark:text-white truncate">
                              {tx.description}
                            </p>
                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                              {new Date(tx.timestamp).toLocaleString()} ·{' '}
                              <span className="uppercase">{tx.kind}</span>
                            </p>
                          </div>
                          <span
                            className={`font-bold tabular-nums shrink-0 ${
                              tx.isCredit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-[#B86B28] dark:text-[#E08E45]'
                            }`}
                          >
                            {tx.isCredit ? '+' : '-'}
                            {formatINR(tx.amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {userActivityTab === 'recharges' && (
                  <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06] max-h-60 overflow-y-auto">
                    {selectedUserRecharges.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                        No recharge requests submitted by this investor.
                      </p>
                    ) : (
                      selectedUserRecharges.map((r) => (
                        <div
                          key={r.id}
                          className="py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-[#0F172A] dark:text-white tabular-nums">
                              {formatINR(r.amount)} · UTR{' '}
                              <span className="font-mono-tabular">{r.utrNumber}</span>
                            </p>
                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                              {new Date(r.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[#F6F7FA] dark:bg-[#192234] font-bold capitalize">
                            {r.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {userActivityTab === 'withdrawals' && (
                  <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06] max-h-60 overflow-y-auto">
                    {selectedUserWithdrawals.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                        No withdrawal requests submitted by this investor.
                      </p>
                    ) : (
                      selectedUserWithdrawals.map((w) => (
                        <div
                          key={w.id}
                          className="py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-[#0F172A] dark:text-white tabular-nums">
                              {formatINR(w.withdrawalAmount)} ·{' '}
                              <span className="font-mono-tabular">
                                {w.bankDetails.accountNumber} ({w.bankDetails.ifscCode})
                              </span>
                            </p>
                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                              UTR {w.utrNumber} · {new Date(w.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[#F6F7FA] dark:bg-[#192234] font-bold capitalize">
                            {w.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: UTR RECHARGE VERIFICATION (UNMASKED) */}
      {section === 'recharges' && (
        <div className="space-y-3">
          <div
            role="tablist"
            aria-label="Filter UTR requests"
            className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08] max-w-md"
          >
            {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={reqFilter === tab}
                onClick={() => setReqFilter(tab)}
                className={`flex-1 min-h-[38px] px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                  reqFilter === tab
                    ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                    : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
            {visibleRecharges.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
                No {reqFilter === 'all' ? '' : reqFilter} UTR recharge requests.
              </div>
            ) : (
              visibleRecharges.map((req) => {
                const fullName =
                  req.userName ?? userNameById.get(req.userId) ?? 'Investor';
                return (
                  <div
                    key={req.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-xl bg-[#F6F7FA] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center shrink-0">
                        {req.method === 'QR_CODE' ? (
                          <QrCode className="w-5 h-5" />
                        ) : (
                          <Smartphone className="w-5 h-5" />
                        )}
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-extrabold text-[#0F172A] dark:text-white tabular-nums">
                          {formatINR(req.amount)}{' '}
                          <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                            · {fullName} ({req.userPhone ?? req.userId}) ·{' '}
                            {req.method === 'QR_CODE' ? 'QR Code' : 'UPI ID'}
                          </span>
                        </p>
                        <p className="text-xs font-mono-tabular font-semibold text-[#B86B28] dark:text-[#E08E45]">
                          UTR: {req.utrNumber}
                        </p>
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          Submitted {new Date(req.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              runAction('review_recharge', {
                                requestId: req.id,
                                decision: 'approved',
                              })
                            }
                            className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify &amp; Approve</span>
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              runAction('review_recharge', {
                                requestId: req.id,
                                decision: 'rejected',
                              })
                            }
                            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <span
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                            req.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                          }`}
                        >
                          {req.status === 'approved' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span className="capitalize">{req.status}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>
      )}

      {/* SECTION 3: WITHDRAWAL CLAIMS (UNMASKED) */}
      {section === 'withdrawals' && (
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
          {visibleWithdrawals.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
              No withdrawal claims submitted yet.
            </div>
          ) : (
            visibleWithdrawals.map((wd) => {
              const fullName =
                wd.userName ?? userNameById.get(wd.userId) ?? 'Investor';
              return (
                <div
                  key={wd.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-[#F6F7FA] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center shrink-0">
                      <BanknoteArrowUp className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-extrabold text-[#0F172A] dark:text-white tabular-nums">
                        Withdraw {formatINR(wd.withdrawalAmount)} ·{' '}
                        {wd.claimFeeAmount > 0
                          ? `Principal Match ${formatINR(wd.claimFeeAmount)}`
                          : 'Direct IMPS (₹0 Match)'}
                      </p>
                      <p className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                        {fullName} ({wd.userId}) ·{' '}
                        {wd.claimFeeAmount > 0 ? (
                          <>
                            UTR:{' '}
                            <span className="font-mono-tabular text-[#B86B28] dark:text-[#E08E45]">
                              {wd.utrNumber}
                            </span>
                          </>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            Within 3× Principal Limit
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-mono-tabular text-[#0F172A] dark:text-[#E2E8F0]">
                        Bank: {wd.bankDetails.accountHolderName} ·{' '}
                        {wd.bankDetails.accountNumber} ·{' '}
                        {wd.bankDetails.ifscCode}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        Requested {new Date(wd.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {wd.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            runAction('review_withdrawal', {
                              requestId: wd.id,
                              decision: 'approved',
                            })
                          }
                          className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Release Payout</span>
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            runAction('review_withdrawal', {
                              requestId: wd.id,
                              decision: 'rejected',
                            })
                          }
                          className="min-h-[42px] px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject &amp; Refund</span>
                        </button>
                      </>
                    ) : (
                      <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                          wd.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        <span className="capitalize">{wd.status}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}

      {/* SECTION 4: GLOBAL & PER-USER UNMASKED LEDGER */}
      {section === 'ledger' && (
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
              Unmasked Transaction Ledger ({combinedLedger.length})
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F1F3F6] dark:bg-[#192234]">
              <button
                type="button"
                onClick={() => setLedgerScope('all')}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-bold cursor-pointer ${
                  ledgerScope === 'all'
                    ? 'bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white'
                    : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                All Users
              </button>
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => setLedgerScope('selected')}
                  className={`min-h-[34px] px-3 rounded-lg text-xs font-bold cursor-pointer ${
                    ledgerScope === 'selected'
                      ? 'bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  {selectedUser.userName}
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
            {combinedLedger.map((tx) => (
              <div
                key={`${tx.fullUserId}-${tx.id}`}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-[#0F172A] dark:text-white truncate">
                    {tx.description}
                  </p>
                  <p className="text-[#64748B] dark:text-[#94A3B8] font-mono-tabular">
                    {tx.fullUserName} ({tx.fullUserId}) ·{' '}
                    {new Date(tx.timestamp).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`font-bold tabular-nums shrink-0 ${
                    tx.isCredit
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[#B86B28] dark:text-[#E08E45]'
                  }`}
                >
                  {tx.isCredit ? '+' : '-'}
                  {formatINR(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 5: PLATFORM SETTINGS & PLAN CATALOG EDITOR */}
      {section === 'platform' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <section className="lg:col-span-5 bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
              Global Platform &amp; Payment Settings
            </h2>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Merchant UPI ID (Auto-Generates QR)
                </label>
                <input
                  type="text"
                  value={settingsForm.merchantUpiId}
                  onChange={(e) =>
                    setSettingsForm((s) => ({
                      ...s,
                      merchantUpiId: e.target.value,
                    }))
                  }
                  placeholder="yourupi@okicici"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] font-mono-tabular text-base sm:text-xs"
                />
                {settingsForm.merchantUpiId &&
                  !isValidUpiId(settingsForm.merchantUpiId) && (
                    <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1">
                      Enter a valid UPI ID containing @ (e.g. name@okaxis).
                    </p>
                  )}
              </div>
              <div>
                <label className="block font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Merchant Payee Name
                </label>
                <input
                  type="text"
                  value={settingsForm.merchantName}
                  onChange={(e) =>
                    setSettingsForm((s) => ({
                      ...s,
                      merchantName: e.target.value,
                    }))
                  }
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-base sm:text-xs"
                />
              </div>

              {/* Payment QR Mode & Live Preview / Uploader */}
              <div className="p-3.5 rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#090D16] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
                    <span>Investor Payment QR Code</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FDF6EE] dark:bg-[#231910] text-[#B86B28] dark:text-[#E08E45]">
                    {(settingsForm.qrMode ?? 'generated') === 'uploaded'
                      ? 'Uploaded QR'
                      : 'Auto UPI QR'}
                  </span>
                </div>

                <div
                  role="tablist"
                  aria-label="Payment QR Source"
                  className="grid grid-cols-2 p-1 rounded-xl bg-[#EAECEF] dark:bg-[#192234]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={(settingsForm.qrMode ?? 'generated') === 'generated'}
                    onClick={() => {
                      setQrUploadError(null);
                      setSettingsForm((s) => ({ ...s, qrMode: 'generated' }));
                    }}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      (settingsForm.qrMode ?? 'generated') === 'generated'
                        ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                        : 'text-[#64748B] dark:text-[#94A3B8]'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                    <span>Generate from UPI</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={(settingsForm.qrMode ?? 'generated') === 'uploaded'}
                    onClick={() => {
                      setQrUploadError(null);
                      setSettingsForm((s) => ({ ...s, qrMode: 'uploaded' }));
                    }}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      (settingsForm.qrMode ?? 'generated') === 'uploaded'
                        ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                        : 'text-[#64748B] dark:text-[#94A3B8]'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>Upload Custom QR</span>
                  </button>
                </div>

                {(settingsForm.qrMode ?? 'generated') === 'generated' ? (
                  <div className="flex flex-col items-center text-center space-y-2.5 pt-1">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {[0, 250, 400, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPreviewQrAmount(amt)}
                          className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold tabular-nums cursor-pointer transition-colors ${
                            previewQrAmount === amt
                              ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                              : 'bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08] text-[#64748B] dark:text-[#94A3B8]'
                          }`}
                        >
                          {amt === 0 ? 'Any ₹' : `₹${amt}`}
                        </button>
                      ))}
                    </div>
                    <QrMatrix
                      upiUri={buildUpiPaymentUri(
                        settingsForm.merchantUpiId,
                        settingsForm.merchantName,
                        previewQrAmount > 0 ? previewQrAmount : undefined,
                      )}
                      amount={previewQrAmount > 0 ? previewQrAmount : undefined}
                      qrMode="generated"
                      allowDownload
                      sizeClassName="w-36 h-36"
                    />
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      Live scannable UPI QR generated directly from{' '}
                      <span className="font-mono-tabular font-semibold text-[#0F172A] dark:text-white">
                        {settingsForm.merchantUpiId || 'your UPI ID'}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {settingsForm.customQrDataUrl ? (
                      <div className="flex flex-col items-center text-center space-y-2">
                        <QrMatrix
                          upiUri={buildUpiPaymentUri(
                            settingsForm.merchantUpiId,
                            settingsForm.merchantName,
                          )}
                          qrMode="uploaded"
                          customQrDataUrl={settingsForm.customQrDataUrl}
                          allowDownload
                          sizeClassName="w-36 h-36"
                        />
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <label className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{qrUploading ? 'Processing...' : 'Replace QR'}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="sr-only"
                              disabled={qrUploading}
                              onChange={(e) => {
                                handleQrFileSelected(e.target.files?.[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setSettingsForm((s) => ({
                                ...s,
                                customQrDataUrl: null,
                                qrMode: 'generated',
                              }))
                            }
                            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center text-center p-5 rounded-xl border-2 border-dashed border-[#CBD5E1] dark:border-white/[0.15] hover:border-[#B86B28] dark:hover:border-[#E08E45] bg-white dark:bg-[#111827] cursor-pointer transition-colors">
                        <span className="w-10 h-10 rounded-xl bg-[#FDF6EE] dark:bg-[#231910] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center mb-2">
                          <ImageIcon className="w-5 h-5" />
                        </span>
                        <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                          {qrUploading
                            ? 'Compressing QR image...'
                            : 'Tap to Upload PhonePe / GPay / Paytm QR'}
                        </span>
                        <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                          PNG, JPG, or WebP · Auto-compressed for fast loading
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          disabled={qrUploading}
                          onChange={(e) => {
                            handleQrFileSelected(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}

                    {qrUploadError && (
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        {qrUploadError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Daily Check-In Code
                  </label>
                  <input
                    type="text"
                    value={settingsForm.dailyCheckInCode}
                    onChange={(e) =>
                      setSettingsForm((s) => ({
                        ...s,
                        dailyCheckInCode: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] font-mono-tabular uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Check-In Reward (₹)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.checkInRewardAmount}
                    onChange={(e) =>
                      setSettingsForm((s) => ({
                        ...s,
                        checkInRewardAmount: Number(e.target.value),
                      }))
                    }
                    className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Sign-Up Bonus (₹)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.signupBonusAmount}
                    onChange={(e) =>
                      setSettingsForm((s) => ({
                        ...s,
                        signupBonusAmount: Number(e.target.value),
                      }))
                    }
                    className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Max Withdrawal (₹)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.maxWithdrawalAmount}
                    onChange={(e) =>
                      setSettingsForm((s) => ({
                        ...s,
                        maxWithdrawalAmount: Number(e.target.value),
                      }))
                    }
                    className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] tabular-nums"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || qrUploading}
                className="w-full min-h-[46px] rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] font-bold cursor-pointer disabled:opacity-60"
              >
                Save Global &amp; QR Settings
              </button>
            </form>
          </section>

          <section className="lg:col-span-7 bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Mahindra BE6 Fleet Plan Catalog ({database.plans.length})
              </h2>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Enforced bounds: Investment &lt; ₹1,500 · Daily Income &le; 25% ·
                Duration 7–30 days · Total &le; ₹5,000.
              </p>
            </div>

            <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
              {database.plans.map((p) => {
                const edit = catalogEdits[p.id] ?? {
                  investmentAmount: String(p.investmentAmount),
                  dailyIncome: String(p.dailyIncome),
                  durationDays: String(p.durationDays),
                };
                const inv = Number(edit.investmentAmount);
                const daily = Number(edit.dailyIncome);
                const dur = Number(edit.durationDays);
                const total =
                  Number.isFinite(daily) && Number.isFinite(dur)
                    ? daily * dur
                    : 0;
                const pct =
                  inv > 0 && Number.isFinite(daily)
                    ? Math.round((daily / inv) * 100)
                    : 0;

                return (
                  <div
                    key={p.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#0F172A] dark:text-white">
                        {p.name} ·{' '}
                        <span className="uppercase text-[10px] text-[#B86B28] dark:text-[#E08E45]">
                          {p.category}
                        </span>
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                        {pct}%/day · Total {formatINR(total)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <input
                        type="number"
                        aria-label={`${p.name} investment`}
                        value={edit.investmentAmount}
                        onChange={(e) =>
                          setCatalogEdits((prev) => ({
                            ...prev,
                            [p.id]: {
                              ...edit,
                              investmentAmount: e.target.value,
                            },
                          }))
                        }
                        className="w-20 min-h-[36px] px-2 rounded-lg border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F6F7FA] dark:bg-[#090D16] tabular-nums font-semibold"
                      />
                      <input
                        type="number"
                        aria-label={`${p.name} daily income`}
                        value={edit.dailyIncome}
                        onChange={(e) =>
                          setCatalogEdits((prev) => ({
                            ...prev,
                            [p.id]: { ...edit, dailyIncome: e.target.value },
                          }))
                        }
                        className="w-18 min-h-[36px] px-2 rounded-lg border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F6F7FA] dark:bg-[#090D16] tabular-nums font-semibold"
                      />
                      <input
                        type="number"
                        aria-label={`${p.name} days`}
                        value={edit.durationDays}
                        onChange={(e) =>
                          setCatalogEdits((prev) => ({
                            ...prev,
                            [p.id]: { ...edit, durationDays: e.target.value },
                          }))
                        }
                        className="w-16 min-h-[36px] px-2 rounded-lg border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F6F7FA] dark:bg-[#090D16] tabular-nums font-semibold"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction('update_plan_config', {
                            planId: p.id,
                            investmentAmount: inv,
                            dailyIncome: daily,
                            durationDays: dur,
                          })
                        }
                        className="min-h-[36px] px-3 rounded-lg bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] font-bold cursor-pointer"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* SECTION 6: ADMIN SECURITY, PASSWORD CHANGE & ADMIN ALLOWLIST */}
      {section === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-7">
            <PasswordSecurityCard isAdminMode />
          </div>

          <section className="lg:col-span-5 bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Admin Access Directory
              </h2>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Any Admin below can sign in directly on the standard Login page
              using their Email/Phone &amp; Password or Google Sign-In. Select any
              user under the Users tab and click{' '}
              <span className="font-semibold text-[#0F172A] dark:text-white">
                Make Admin
              </span>{' '}
              to grant access.
            </p>

            <div className="divide-y divide-[#E6E8EE] dark:divide-white/[0.06]">
              {database.users
                .filter(
                  (u) =>
                    adminUidSet.has(u.uid) || isBootstrappedAdminEmail(u.email),
                )
                .map((adm) => {
                  const isOwnerAdmin = isBootstrappedAdminEmail(adm.email);
                  return (
                    <div
                      key={adm.uid}
                      className="py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[#0F172A] dark:text-white truncate">
                          {adm.userName}
                        </p>
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                          {adm.email || adm.phone || adm.uid}
                        </p>
                      </div>
                      {isOwnerAdmin ? (
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase shrink-0">
                          Owner
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            runAction('revoke_admin', { uid: adm.uid })
                          }
                          className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-[11px] font-bold shrink-0 cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        </div>
      )}

      {/* SECTION 7: BROADCAST MESSAGE COMPOSER & LIVE TOAST STATUS */}
      {section === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <section
            aria-label="Broadcast Message"
            className="lg:col-span-7 bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#FDF6EE] dark:bg-[#231910] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                    Broadcast Message
                  </h2>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Send system-wide alerts or promotional offers that appear as
                    live toast notifications for all logged-in investors.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <p className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1.5">
                  Notification Type
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'promo', label: 'Promotional', icon: Megaphone },
                      { id: 'info', label: 'Announcement', icon: BellRing },
                      { id: 'warning', label: 'System Alert', icon: AlertTriangle },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    const active = broadcastTone === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBroadcastTone(item.id)}
                        className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16]'
                            : 'bg-[#F6F7FA] dark:bg-[#192234] text-[#64748B] dark:text-[#94A3B8]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] mb-1.5">
                  Quick Templates
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      label: 'Bonus Offer',
                      tone: 'promo' as BroadcastTone,
                      title: 'BE6 Weekend Bonus Live!',
                      message:
                        'Activate BE6 Pack One today and claim instant daily fleet yields straight to your wallet.',
                    },
                    {
                      label: 'Fast Payouts',
                      tone: 'info' as BroadcastTone,
                      title: 'IMPS Withdrawals Active',
                      message:
                        'All verified IMPS bank withdrawals are settling within 15 minutes right now.',
                    },
                    {
                      label: 'System Alert',
                      tone: 'warning' as BroadcastTone,
                      title: 'Scheduled Maintenance Notice',
                      message:
                        'Brief payment gateway maintenance tonight 11:30 PM – 11:45 PM IST. Plan claims stay unaffected.',
                    },
                  ].map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => {
                        setBroadcastTone(tpl.tone);
                        setBroadcastTitle(tpl.title);
                        setBroadcastMessage(tpl.message);
                      }}
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#F6F7FA] dark:bg-[#192234] hover:border-[#B86B28]/50 border border-[#E6E8EE] dark:border-white/[0.08] text-[11px] font-semibold text-[#0F172A] dark:text-white cursor-pointer"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="broadcast-title-input"
                  className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1"
                >
                  Alert Title (2–60 characters)
                </label>
                <input
                  id="broadcast-title-input"
                  type="text"
                  maxLength={60}
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Limited-Time BE6 Bonus Offer"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-base sm:text-xs font-semibold text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="broadcast-message-input"
                    className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8]"
                  >
                    Notification Message
                  </label>
                  <span className="text-[11px] font-mono-tabular text-[#64748B] dark:text-[#94A3B8]">
                    {broadcastMessage.length}/240
                  </span>
                </div>
                <textarea
                  id="broadcast-message-input"
                  rows={3}
                  maxLength={240}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Write the alert or promotional message shown to all logged-in investors..."
                  className="w-full p-3.5 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-white dark:bg-[#090D16] text-base sm:text-xs text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span>Send Broadcast Toast</span>
              </button>
            </form>
          </section>

          <section className="lg:col-span-5 bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
              Currently Active Investor Alert
            </h3>

            {database.settings.activeBroadcast &&
            database.settings.activeBroadcast.active ? (
              <div className="p-4 rounded-xl bg-[#F6F7FA] dark:bg-[#192234] border border-[#E6E8EE] dark:border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#FDF6EE] dark:bg-[#231910] text-[#B86B28] dark:text-[#E08E45] text-[10px] font-extrabold uppercase">
                    {database.settings.activeBroadcast.tone === 'warning'
                      ? 'System Alert'
                      : database.settings.activeBroadcast.tone === 'promo'
                        ? 'Promotional'
                        : 'Announcement'}
                  </span>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                    {new Date(
                      database.settings.activeBroadcast.sentAt,
                    ).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                  {database.settings.activeBroadcast.title}
                </p>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                  {database.settings.activeBroadcast.message}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction('clear_broadcast')}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Active Broadcast</span>
                </button>
              </div>
            ) : (
              <div className="py-8 text-center space-y-1.5">
                <Megaphone className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  No active broadcast right now. Send a message to pop a live
                  toast alert for all logged-in investors.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
