import { useState } from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import {
  INVESTMENT_PLANS,
  InvestmentPlan,
  PlanCategory,
  formatINR,
} from '../lib/investmentEngine';
import { VehicleImage } from './VehicleImage';

interface PlansViewProps {
  plans?: InvestmentPlan[];
  onSelectPlan: (plan: InvestmentPlan) => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function PlansView({ plans, onSelectPlan }: PlansViewProps) {
  const [category, setCategory] = useState<PlanCategory>('normal');
  const catalog = plans ?? INVESTMENT_PLANS;
  const visiblePlans = catalog.filter((p) => p.category === category);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Under ₹1,500 · Max 25% daily return · 7–30 day cycle · Up to ₹5,000
        </p>

        <div
          role="tablist"
          aria-label="Plan Category"
          className="grid grid-cols-2 p-1 rounded-xl bg-white dark:bg-[#0E1422] border border-[#E4E7EE] dark:border-white/[0.08] w-full sm:w-64"
        >
          <button
            type="button"
            role="tab"
            aria-selected={category === 'normal'}
            onClick={() => setCategory('normal')}
            className={`relative min-h-[42px] px-4 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              category === 'normal'
                ? 'text-white dark:text-[#090D16]'
                : 'text-[#64748B] dark:text-[#94A3B8]'
            }`}
          >
            {category === 'normal' && (
              <motion.span
                layoutId="plans-category-pill"
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                className="absolute inset-0 rounded-lg bg-[#0B1120] dark:bg-[#E59A54]"
              />
            )}
            <span className="relative z-10">Normal Plan</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={category === 'vip'}
            onClick={() => setCategory('vip')}
            className={`relative min-h-[42px] px-4 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              category === 'vip'
                ? 'text-white dark:text-[#090D16]'
                : 'text-[#64748B] dark:text-[#94A3B8]'
            }`}
          >
            {category === 'vip' && (
              <motion.span
                layoutId="plans-category-pill"
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                className="absolute inset-0 rounded-lg bg-[#0B1120] dark:bg-[#E59A54]"
              />
            )}
            <span className="relative z-10">VIP Plan</span>
          </button>
        </div>
      </div>

      {/* Showroom Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visiblePlans.map((plan, index) => {
          const dailyPct = Math.round(
            (plan.dailyIncome / plan.investmentAmount) * 100,
          );
          return (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.22,
                delay: Math.min(index * 0.035, 0.2),
                ease: EASE_OUT_EXPO,
              }}
              className="group bg-white dark:bg-[#0E1422] rounded-2xl border border-[#E4E7EE] dark:border-white/[0.08] hover:border-[#C26D27]/45 dark:hover:border-[#E59A54]/40 overflow-hidden flex flex-col justify-between transition-colors"
            >
              <div className="flex gap-4 p-4">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-[#F1F3F6] dark:bg-[#151D2F] shrink-0">
                  <VehicleImage
                    src={plan.imageUrl}
                    alt={plan.modelName}
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-base font-bold text-[#0F172A] dark:text-white truncate">
                        {plan.name}
                      </h3>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 tabular-nums">
                        {dailyPct}% / day
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate mt-0.5">
                      {plan.modelName}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-[#E4E7EE] dark:divide-white/[0.08] pt-3 mt-2 border-t border-[#E4E7EE] dark:border-white/[0.06]">
                    <div className="pr-2">
                      <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                        Daily
                      </p>
                      <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatINR(plan.dailyIncome)}
                      </p>
                    </div>
                    <div className="px-2">
                      <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                        Total Earning
                      </p>
                      <p className="text-sm font-extrabold text-[#0F172A] dark:text-white tabular-nums">
                        {formatINR(plan.totalIncome)}
                      </p>
                    </div>
                    <div className="pl-2">
                      <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                        Cycle
                      </p>
                      <p className="text-sm font-extrabold text-[#0F172A] dark:text-white tabular-nums">
                        {plan.durationDays}d
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#151D2F]/70 border-t border-[#E4E7EE] dark:border-white/[0.06] flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                    Investment
                  </p>
                  <p className="text-lg font-extrabold text-[#0F172A] dark:text-white tabular-nums">
                    {formatINR(plan.investmentAmount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectPlan(plan)}
                  aria-label={`Buy ${plan.name}`}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-gradient-to-r from-[#0B1120] to-[#17233B] hover:from-[#131C33] hover:to-[#1F2F4F] dark:from-[#E59A54] dark:to-[#D48238] text-white dark:text-[#090D16] text-xs font-bold flex items-center gap-1.5 active:scale-[0.97] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-[#E59A54] dark:text-[#090D16]" />
                  <span>Buy Now</span>
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
