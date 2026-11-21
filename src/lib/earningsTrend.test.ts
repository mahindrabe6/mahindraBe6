import test from 'node:test';
import assert from 'node:assert/strict';
import { compute7DayEarningsTrend, isEarningTransaction } from './earningsTrend';
import { ActivePlan, Transaction } from './investmentEngine';

function makeTx(
  id: string,
  daysAgo: number,
  amount: number,
  kind: Transaction['kind'],
  isCredit: boolean,
  refDate: Date,
): Transaction {
  const d = new Date(
    refDate.getFullYear(),
    refDate.getMonth(),
    refDate.getDate() - daysAgo,
    12,
    0,
    0,
  );
  return {
    id,
    userLabel: 'Tester',
    description: `${kind} entry`,
    kind,
    amount,
    isCredit,
    timestamp: d.toISOString(),
  };
}

test('isEarningTransaction filters only credited yield, checkin, and bonus entries', () => {
  const ref = new Date(2026, 10, 21, 10, 0, 0);
  assert.equal(isEarningTransaction(makeTx('1', 0, 100, 'yield', true, ref)), true);
  assert.equal(isEarningTransaction(makeTx('2', 0, 25, 'checkin', true, ref)), true);
  assert.equal(isEarningTransaction(makeTx('3', 0, 40, 'bonus', true, ref)), true);
  assert.equal(isEarningTransaction(makeTx('4', 0, 400, 'recharge', true, ref)), false);
  assert.equal(isEarningTransaction(makeTx('5', 0, 250, 'purchase', false, ref)), false);
});

test('compute7DayEarningsTrend builds cumulative 7-day curve including prior baseline', () => {
  const ref = new Date(2026, 10, 21, 10, 0, 0);
  const transactions: Transaction[] = [
    makeTx('old', 10, 40, 'bonus', true, ref),
    makeTx('d5', 5, 100, 'yield', true, ref),
    makeTx('d2', 2, 25, 'checkin', true, ref),
    makeTx('d0', 0, 100, 'yield', true, ref),
    makeTx('rech', 1, 500, 'recharge', true, ref),
  ];

  const activePlans: ActivePlan[] = [
    {
      id: 'ap-1',
      planId: 'normal-popular',
      name: 'BE6 Pack One',
      modelName: 'Mahindra BE6',
      dailyIncome: 100,
      totalIncome: 1500,
      durationDays: 15,
      investmentAmount: 400,
      purchasedAt: ref.toISOString(),
      daysClaimed: 2,
      lastClaimDate: null,
      imageUrl: '/img.jpg',
    },
  ];

  const summary = compute7DayEarningsTrend(transactions, activePlans, ref);
  assert.equal(summary.points.length, 7);
  assert.equal(summary.points[6].label, 'Today');
  // Baseline 40 + 0 on day 6
  assert.equal(summary.points[0].cumulativeTotal, 40);
  // Day 5 adds 100 -> 140
  assert.equal(summary.points[1].dailyEarned, 100);
  assert.equal(summary.points[1].cumulativeTotal, 140);
  // Today reaches 40 + 100 + 25 + 100 = 265
  assert.equal(summary.points[6].cumulativeTotal, 265);
  assert.equal(summary.sevenDayDelta, 225);
  assert.equal(summary.totalEarnedAllTime, 265);
  assert.equal(summary.projectedDailyIncome, 100);
});
