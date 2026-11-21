import {
  ActivePlan,
  Transaction,
  getActiveOngoingPlans,
  getTodayDateString,
} from './investmentEngine';

export interface EarningsTrendPoint {
  date: string;
  label: string;
  dailyEarned: number;
  cumulativeTotal: number;
}

export interface EarningsTrendSummary {
  points: EarningsTrendPoint[];
  totalEarnedAllTime: number;
  sevenDayDelta: number;
  projectedDailyIncome: number;
}

const EARNING_KINDS = new Set<Transaction['kind']>(['yield', 'checkin', 'bonus']);

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

export function isEarningTransaction(tx: Transaction): boolean {
  return Boolean(tx.isCredit && tx.amount > 0 && EARNING_KINDS.has(tx.kind));
}

export function compute7DayEarningsTrend(
  transactions: Transaction[],
  activePlans: ActivePlan[],
  referenceDate: Date = new Date(),
): EarningsTrendSummary {
  const days: Array<{ dateStr: string; label: string }> = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - offset,
    );
    days.push({
      dateStr: getTodayDateString(d),
      label: offset === 0 ? 'Today' : formatDayLabel(d),
    });
  }

  const windowStart = days[0].dateStr;
  const windowEnd = days[days.length - 1].dateStr;
  const dailyMap = new Map<string, number>();
  let baselineBeforeWindow = 0;
  let totalEarnedAllTime = 0;

  for (const tx of transactions) {
    if (!isEarningTransaction(tx)) continue;
    const txDate = new Date(tx.timestamp);
    if (Number.isNaN(txDate.getTime())) continue;
    const txDateStr = getTodayDateString(txDate);
    if (txDateStr > windowEnd) continue;

    totalEarnedAllTime += tx.amount;
    if (txDateStr < windowStart) {
      baselineBeforeWindow += tx.amount;
    } else {
      dailyMap.set(txDateStr, (dailyMap.get(txDateStr) ?? 0) + tx.amount);
    }
  }

  let running = baselineBeforeWindow;
  let sevenDayDelta = 0;
  const points: EarningsTrendPoint[] = days.map((day) => {
    const dailyEarned = Math.round((dailyMap.get(day.dateStr) ?? 0) * 100) / 100;
    running = Math.round((running + dailyEarned) * 100) / 100;
    sevenDayDelta = Math.round((sevenDayDelta + dailyEarned) * 100) / 100;
    return {
      date: day.dateStr,
      label: day.label,
      dailyEarned,
      cumulativeTotal: running,
    };
  });

  const projectedDailyIncome = getActiveOngoingPlans(activePlans).reduce(
    (sum, plan) => sum + plan.dailyIncome,
    0,
  );

  return {
    points,
    totalEarnedAllTime: Math.round(totalEarnedAllTime * 100) / 100,
    sevenDayDelta,
    projectedDailyIncome,
  };
}
