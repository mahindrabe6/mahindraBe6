import { ReactNode, TouchEvent as ReactTouchEvent, useRef, useState } from 'react';
import {
  Home,
  Store,
  Zap,
  Users,
  User,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Headset,
  Settings,
  Wallet,
  CarFront,
  ShieldCheck,
  LogOut,
  ArrowLeftRight,
} from 'lucide-react';
import { AppRoute, UserRole, formatINR } from '../lib/investmentEngine';
import {
  SWIPE_ROUTE_LABELS,
  computeDampedDragOffset,
  getNeighborSwipeRoute,
  isMainSwipeRoute,
  resolveSwipeNavigation,
} from '../lib/swipeNavigation';

interface AppShellProps {
  route: AppRoute;
  role: UserRole;
  isAdminUser?: boolean;
  viewMode?: 'investor' | 'admin';
  impersonatedInvestor?: { userName: string; identifier: string } | null;
  onExitImpersonation?: () => void;
  swipeDisabled?: boolean;
  balance: number;
  onNavigate: (route: AppRoute) => void;
  onBack: () => void;
  onOpenSupport: () => void;
  onSwitchViewMode?: (mode: 'investor' | 'admin') => void;
  onLogout: () => void;
  children: ReactNode;
}

const ROUTE_TITLES: Record<AppRoute, string> = {
  home: 'Mahindra BE6',
  plans: 'BE6 Fleet Plans',
  checkin: 'Daily Check-In',
  recharge: 'Recharge Wallet',
  withdraw: 'Withdraw Funds',
  team: 'Refer & Earn',
  profile: 'Investor Profile',
  settings: 'Settings',
  bank: 'Bank Details',
  admin: 'Admin Portal',
};

function ViewModeToggle({
  viewMode,
  onSwitch,
}: {
  viewMode: 'investor' | 'admin';
  onSwitch: (mode: 'investor' | 'admin') => void;
}) {
  return (
    <div
      role="group"
      aria-label="View Mode Switcher"
      className="inline-flex items-center p-1 rounded-xl bg-[#EEF1F6] dark:bg-[#151D2F] border border-[#E2E6EE] dark:border-white/[0.08] shrink-0"
    >
      <button
        type="button"
        aria-pressed={viewMode === 'investor'}
        onClick={() => onSwitch('investor')}
        className={`min-h-[32px] px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
          viewMode === 'investor'
            ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#090D16] shadow-xs'
            : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
        }`}
      >
        Investor
      </button>
      <button
        type="button"
        aria-pressed={viewMode === 'admin'}
        onClick={() => onSwitch('admin')}
        className={`min-h-[32px] px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold inline-flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
          viewMode === 'admin'
            ? 'bg-[#C26D27] text-white dark:bg-[#E08E45] dark:text-[#090D16] shadow-xs'
            : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
        }`}
      >
        <ShieldCheck className="w-3 h-3 shrink-0" />
        <span>Admin</span>
      </button>
    </div>
  );
}

function shouldIgnoreSwipeTarget(
  target: EventTarget | null,
  boundary: HTMLElement | null,
): boolean {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== boundary) {
    const tag = el.tagName;
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      tag === 'OPTION' ||
      el.isContentEditable ||
      el.getAttribute('role') === 'slider' ||
      el.dataset.noSwipe === 'true'
    ) {
      return true;
    }
    if (el.scrollWidth > el.clientWidth + 4) {
      const style = window.getComputedStyle(el);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

export function AppShell({
  route,
  role,
  isAdminUser = false,
  viewMode = 'investor',
  impersonatedInvestor = null,
  onExitImpersonation,
  swipeDisabled = false,
  balance,
  onNavigate,
  onBack,
  onOpenSupport,
  onSwitchViewMode,
  onLogout,
  children,
}: AppShellProps) {
  const isHome = route === 'home';
  const isAdmin = role === 'admin';
  const hideChromeHeader = route === 'settings' && !isAdmin;
  const showAdminToggle = isAdminUser && Boolean(onSwitchViewMode);

  const mainRef = useRef<HTMLElement | null>(null);
  const swipeGestureRef = useRef<{
    active: boolean;
    axis: 'undecided' | 'horizontal' | 'vertical';
    startX: number;
    startY: number;
    startTime: number;
  }>({
    active: false,
    axis: 'undecided',
    startX: 0,
    startY: 0,
    startTime: 0,
  });
  const [dragOffsetX, setDragOffsetX] = useState(0);

  const swipeEnabled = !isAdmin && !swipeDisabled && isMainSwipeRoute(route);

  const handleTouchStart = (e: ReactTouchEvent<HTMLElement>) => {
    if (!swipeEnabled || e.touches.length !== 1) return;
    if (shouldIgnoreSwipeTarget(e.target, mainRef.current)) return;
    const touch = e.touches[0];
    swipeGestureRef.current = {
      active: true,
      axis: 'undecided',
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: performance.now(),
    };
  };

  const handleTouchMove = (e: ReactTouchEvent<HTMLElement>) => {
    const g = swipeGestureRef.current;
    if (!g.active || !swipeEnabled || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - g.startX;
    const dy = touch.clientY - g.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (g.axis === 'undecided') {
      if (absX < 10 && absY < 10) return;
      if (absX > absY * 1.35) {
        g.axis = 'horizontal';
      } else {
        g.axis = 'vertical';
        g.active = false;
        setDragOffsetX(0);
        return;
      }
    }

    if (g.axis === 'horizontal') {
      setDragOffsetX(computeDampedDragOffset(route, dx));
    }
  };

  const resetSwipeState = () => {
    swipeGestureRef.current.active = false;
    swipeGestureRef.current.axis = 'undecided';
    setDragOffsetX(0);
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLElement>) => {
    const g = swipeGestureRef.current;
    if (!g.active || !swipeEnabled || e.changedTouches.length === 0) {
      resetSwipeState();
      return;
    }

    const touch = e.changedTouches[0];
    const dx = touch.clientX - g.startX;
    const dy = touch.clientY - g.startY;
    const durationMs = performance.now() - g.startTime;

    const wasHorizontal = g.axis === 'horizontal' || Math.abs(dx) > Math.abs(dy) * 1.25;
    resetSwipeState();

    if (!wasHorizontal) return;

    const resolved = resolveSwipeNavigation({
      currentRoute: route,
      deltaX: dx,
      deltaY: dy,
      durationMs,
    });

    if (resolved) {
      onNavigate(resolved.targetRoute);
    }
  };

  const peekTargetRoute =
    dragOffsetX <= -28
      ? getNeighborSwipeRoute(route, 1)
      : dragOffsetX >= 28
        ? getNeighborSwipeRoute(route, -1)
        : null;

  const desktopLinks: Array<{ label: string; route: AppRoute }> = [
    { label: 'Home', route: 'home' },
    { label: 'Plans', route: 'plans' },
    { label: 'Check-In', route: 'checkin' },
    { label: 'Team', route: 'team' },
    { label: 'Profile', route: 'profile' },
  ];

  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#F4F5F8] dark:bg-[#070A11] text-[#0F172A] dark:text-[#F1F5F9]">
        <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-[#E6E8EE] dark:border-white/[0.08]">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                <span className="sm:hidden">BE6 Admin</span>
                <span className="hidden sm:inline">Mahindra BE6 Admin</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {showAdminToggle && onSwitchViewMode && (
                <ViewModeToggle
                  viewMode={viewMode}
                  onSwitch={onSwitchViewMode}
                />
              )}
              <button
                type="button"
                onClick={onLogout}
                aria-label="Log Out"
                className="min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#F1F3F6] dark:bg-[#192234] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#0F172A] dark:text-[#F1F5F9] hover:text-rose-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-7">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#F4F5F8] dark:bg-[#070A11] text-[#0F172A] dark:text-[#F1F5F9]">
      <header className="hidden md:block sticky top-0 z-30 bg-white/95 dark:bg-[#0B101D]/95 backdrop-blur-md border-b border-[#E4E7EE] dark:border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-[#0F172A] dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CarFront className="w-5 h-5 text-[#B86B28] dark:text-[#E08E45]" />
            <span>Mahindra BE6</span>
          </button>

          <nav
            aria-label="Primary Navigation"
            className="flex items-center gap-6 text-sm font-semibold"
          >
            {desktopLinks.map((item) => {
              const active = route === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => onNavigate(item.route)}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-[#B86B28] text-[#0F172A] dark:border-[#E08E45] dark:text-white'
                      : 'border-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {showAdminToggle && onSwitchViewMode && (
              <ViewModeToggle
                viewMode={viewMode}
                onSwitch={onSwitchViewMode}
              />
            )}
            <button
              type="button"
              onClick={() => onNavigate('recharge')}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-[#E08E45] dark:text-[#090D16]" />
              <span>{formatINR(balance, true)}</span>
            </button>
          </div>
        </div>
      </header>

      {!hideChromeHeader && (
        <header className="md:hidden sticky top-0 z-30 h-[52px] bg-[#F4F5F8]/95 dark:bg-[#070A11]/95 backdrop-blur-md px-4 flex items-center justify-between border-b border-[#E4E7EE] dark:border-white/[0.08]">
          {isHome ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="flex items-center gap-2 text-base font-extrabold tracking-tight text-[#0F172A] dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CarFront className="w-5 h-5 text-[#B86B28] dark:text-[#E08E45]" />
                <span>Mahindra BE6</span>
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenSupport}
                  aria-label="Customer Support"
                  className="min-w-[44px] min-h-[44px] rounded-full bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08] flex items-center justify-center text-[#B86B28] dark:text-[#E08E45] active:scale-95 transition-transform cursor-pointer"
                >
                  <Headset className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  aria-label="Settings"
                  className="min-w-[44px] min-h-[44px] rounded-full bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08] flex items-center justify-center text-[#0F172A] dark:text-white active:scale-95 transition-transform cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className="min-w-[44px] min-h-[44px] -ml-1 rounded-full bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08] flex items-center justify-center text-[#0F172A] dark:text-white active:scale-95 transition-transform cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-base font-bold text-[#0F172A] dark:text-white truncate px-2">
                {ROUTE_TITLES[route]}
              </h1>
              <button
                type="button"
                onClick={() => onNavigate('recharge')}
                aria-label="Wallet Balance"
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08] text-xs font-bold text-[#B86B28] dark:text-[#E08E45] flex items-center gap-1.5 tabular-nums whitespace-nowrap shrink-0 active:scale-95 transition-transform cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{formatINR(balance, true)}</span>
              </button>
            </>
          )}
        </header>
      )}

      {showAdminToggle && onSwitchViewMode && (
        <div className="md:hidden bg-white/90 dark:bg-[#0B101D]/90 border-b border-[#E4E7EE] dark:border-white/[0.08] px-4 py-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C26D27] dark:text-[#E08E45]" />
            <span>Switch View</span>
          </span>
          <ViewModeToggle
            viewMode={viewMode}
            onSwitch={onSwitchViewMode}
          />
        </div>
      )}

      {isAdminUser && impersonatedInvestor && onExitImpersonation && (
        <div
          role="status"
          aria-label="Admin Investor Session Banner"
          className="bg-[#0F172A] dark:bg-[#192234] text-white border-b border-[#E08E45]/40 px-4 py-2"
        >
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded bg-[#E08E45] text-[#090D16] text-[10px] font-extrabold uppercase shrink-0">
                Investor Account
              </span>
              <span className="truncate font-semibold">
                Logged in as{' '}
                <strong className="font-extrabold">
                  {impersonatedInvestor.userName}
                </strong>{' '}
                <span className="text-slate-300 font-mono-tabular">
                  ({impersonatedInvestor.identifier})
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={onExitImpersonation}
              className="min-h-[34px] px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#E08E45]" />
              <span>Exit to Admin</span>
            </button>
          </div>
        </div>
      )}

      {!isHome && !hideChromeHeader && (
        <div className="hidden md:flex max-w-6xl w-full mx-auto px-6 pt-5 items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="w-10 h-10 rounded-full bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08] hover:border-[#B86B28]/50 flex items-center justify-center text-[#0F172A] dark:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              {ROUTE_TITLES[route]}
            </h1>
          </div>
          <button
            type="button"
            onClick={onOpenSupport}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08] text-xs font-semibold text-[#0F172A] dark:text-white hover:border-[#B86B28]/50 flex items-center gap-1.5 cursor-pointer"
          >
            <Headset className="w-4 h-4 text-[#B86B28] dark:text-[#E08E45]" />
            <span>Support</span>
          </button>
        </div>
      )}

      <main
        ref={mainRef}
        data-swipe-surface={swipeEnabled ? 'enabled' : 'disabled'}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={resetSwipeState}
        className="relative flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 pt-4 md:pt-5 pb-24 md:pb-10 touch-pan-y"
      >
        {peekTargetRoute && (
          <div
            aria-hidden="true"
            className={`md:hidden pointer-events-none fixed top-1/2 -translate-y-1/2 z-40 px-3 py-1.5 rounded-full bg-[#0F172A]/90 dark:bg-[#E08E45]/95 text-white dark:text-[#090D16] text-xs font-extrabold shadow-lg inline-flex items-center gap-1 ${
              dragOffsetX < 0 ? 'right-3' : 'left-3'
            }`}
          >
            {dragOffsetX > 0 && <ChevronLeft className="w-3.5 h-3.5" />}
            <span>{SWIPE_ROUTE_LABELS[peekTargetRoute]}</span>
            {dragOffsetX < 0 && <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        )}
        <div
          style={{
            transform: dragOffsetX !== 0 ? `translate3d(${dragOffsetX}px, 0, 0)` : undefined,
            transition: dragOffsetX === 0 ? 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          }}
        >
          {children}
        </div>
      </main>

      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 min-h-[62px] pb-[env(safe-area-inset-bottom)] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-t border-[#E6E8EE] dark:border-white/[0.08] grid grid-cols-5 items-center px-2"
      >
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`min-h-[48px] relative flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer ${
            route === 'home'
              ? 'text-[#B86B28] dark:text-[#E08E45] font-bold'
              : 'text-[#64748B] dark:text-[#94A3B8] font-medium'
          }`}
        >
          {route === 'home' && (
            <span aria-hidden="true" className="absolute top-0 w-6 h-0.5 rounded-full bg-[#B86B28] dark:bg-[#E08E45]" />
          )}
          <Home className="w-5 h-5" />
          <span className="text-[10px] leading-none">Home</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('plans')}
          className={`min-h-[48px] relative flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer ${
            route === 'plans'
              ? 'text-[#B86B28] dark:text-[#E08E45] font-bold'
              : 'text-[#64748B] dark:text-[#94A3B8] font-medium'
          }`}
        >
          {route === 'plans' && (
            <span aria-hidden="true" className="absolute top-0 w-6 h-0.5 rounded-full bg-[#B86B28] dark:bg-[#E08E45]" />
          )}
          <Store className="w-5 h-5" />
          <span className="text-[10px] leading-none">Plans</span>
        </button>

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => onNavigate('recharge')}
            aria-label="Quick Recharge"
            className="w-12 h-12 -mt-4 rounded-full bg-[#0B1120] dark:bg-[#E08E45] hover:opacity-95 text-[#E08E45] dark:text-[#090D16] shadow-[0_8px_20px_-6px_rgba(11,17,32,0.5)] flex items-center justify-center ring-[5px] ring-[#F6F7FA] dark:ring-[#090D16] active:scale-95 transition-transform cursor-pointer"
          >
            <Zap className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('team')}
          className={`min-h-[48px] relative flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer ${
            route === 'team'
              ? 'text-[#B86B28] dark:text-[#E08E45] font-bold'
              : 'text-[#64748B] dark:text-[#94A3B8] font-medium'
          }`}
        >
          {route === 'team' && (
            <span aria-hidden="true" className="absolute top-0 w-6 h-0.5 rounded-full bg-[#B86B28] dark:bg-[#E08E45]" />
          )}
          <Users className="w-5 h-5" />
          <span className="text-[10px] leading-none">Team</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className={`min-h-[48px] relative flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer ${
            route === 'profile' || route === 'settings' || route === 'bank'
              ? 'text-[#B86B28] dark:text-[#E08E45] font-bold'
              : 'text-[#64748B] dark:text-[#94A3B8] font-medium'
          }`}
        >
          {(route === 'profile' || route === 'settings' || route === 'bank') && (
            <span aria-hidden="true" className="absolute top-0 w-6 h-0.5 rounded-full bg-[#B86B28] dark:bg-[#E08E45]" />
          )}
          <User className="w-5 h-5" />
          <span className="text-[10px] leading-none">Profile</span>
        </button>
      </nav>
    </div>
  );
}
