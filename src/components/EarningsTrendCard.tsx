import { useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ActivePlan, Transaction, formatINR } from '../lib/investmentEngine';
import { compute7DayEarningsTrend } from '../lib/earningsTrend';

interface EarningsTrendCardProps {
  transactions: Transaction[];
  activePlans: ActivePlan[];
}

export function EarningsTrendCard({
  transactions,
  activePlans,
}: EarningsTrendCardProps) {
  const summary = useMemo(
    () => compute7DayEarningsTrend(transactions, activePlans),
    [transactions, activePlans],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
      aria-label="7-Day Earnings Trend"
      className="bg-white dark:bg-[#0E1422] rounded-2xl border border-[#E4E7EE] dark:border-white/[0.08] p-4 md:p-5 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
              7-Day Earnings Trend
            </h2>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            Cumulative yield, check-ins &amp; bonuses over the past week
          </p>
        </div>

        <div className="flex items-baseline gap-2.5">
          <div className="text-right">
            <p className="text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
              Total Earned
            </p>
            <p className="text-lg font-extrabold text-[#0F172A] dark:text-white tabular-nums">
              {formatINR(summary.totalEarnedAllTime)}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/40 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 tabular-nums whitespace-nowrap">
            +{formatINR(summary.sevenDayDelta)} (7d)
          </span>
        </div>
      </div>

      <div className="w-full h-[156px] min-w-0" data-no-swipe="true">
        <ResponsiveContainer width="100%" height={156} minWidth={200}>
          <AreaChart
            data={summary.points}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <defs>
              <linearGradient id="be6EarningsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#94A3B8"
              strokeOpacity={0.18}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 10 }}
              width={48}
              tickFormatter={(val: number) => `₹${val}`}
              domain={[0, (dataMax: number) => Math.max(50, Math.ceil(dataMax * 1.15))]}
            />
            <Tooltip
              cursor={{ stroke: '#E08E45', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const pt = payload[0].payload as {
                  label: string;
                  date: string;
                  dailyEarned: number;
                  cumulativeTotal: number;
                };
                return (
                  <div className="rounded-xl bg-[#0F172A] text-white px-3 py-2 shadow-lg border border-white/10 text-xs space-y-0.5">
                    <p className="font-bold text-[#E08E45]">
                      {pt.label} · {pt.date}
                    </p>
                    <p className="tabular-nums">
                      Total Earned:{' '}
                      <span className="font-extrabold">
                        {formatINR(pt.cumulativeTotal)}
                      </span>
                    </p>
                    <p className="text-[11px] text-emerald-300 tabular-nums">
                      Added that day: +{formatINR(pt.dailyEarned)}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulativeTotal"
              stroke="#10B981"
              strokeWidth={2.5}
              fill="url(#be6EarningsFill)"
              activeDot={{ r: 5, fill: '#E08E45', stroke: '#FFFFFF', strokeWidth: 2 }}
              isAnimationActive
              animationDuration={550}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}
