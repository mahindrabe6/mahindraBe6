import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAIN_SWIPE_ROUTES,
  computeDampedDragOffset,
  getNeighborSwipeRoute,
  getSwipeRouteDirection,
  isMainSwipeRoute,
  resolveSwipeNavigation,
} from './swipeNavigation';

test('MAIN_SWIPE_ROUTES covers Home, Plans, Team, Profile in tab order', () => {
  assert.deepEqual(MAIN_SWIPE_ROUTES, ['home', 'plans', 'team', 'profile']);
  assert.equal(isMainSwipeRoute('home'), true);
  assert.equal(isMainSwipeRoute('plans'), true);
  assert.equal(isMainSwipeRoute('team'), true);
  assert.equal(isMainSwipeRoute('profile'), true);
  assert.equal(isMainSwipeRoute('recharge'), false);
  assert.equal(isMainSwipeRoute('settings'), false);
});

test('getSwipeRouteDirection computes signed transition directions between main tabs', () => {
  assert.equal(getSwipeRouteDirection('home', 'plans'), 1);
  assert.equal(getSwipeRouteDirection('plans', 'profile'), 1);
  assert.equal(getSwipeRouteDirection('profile', 'home'), -1);
  assert.equal(getSwipeRouteDirection('team', 'plans'), -1);
  assert.equal(getSwipeRouteDirection('home', 'home'), 0);
  assert.equal(getSwipeRouteDirection('home', 'recharge'), 0);
});

test('getNeighborSwipeRoute respects left and right route boundaries', () => {
  assert.equal(getNeighborSwipeRoute('home', -1), null);
  assert.equal(getNeighborSwipeRoute('home', 1), 'plans');
  assert.equal(getNeighborSwipeRoute('plans', 1), 'team');
  assert.equal(getNeighborSwipeRoute('team', 1), 'profile');
  assert.equal(getNeighborSwipeRoute('profile', 1), null);
  assert.equal(getNeighborSwipeRoute('profile', -1), 'team');
});

test('resolveSwipeNavigation navigates on clear horizontal swipes and fast flicks', () => {
  assert.deepEqual(
    resolveSwipeNavigation({
      currentRoute: 'home',
      deltaX: -90,
      deltaY: 12,
      durationMs: 320,
    }),
    { targetRoute: 'plans', direction: 1 },
  );

  assert.deepEqual(
    resolveSwipeNavigation({
      currentRoute: 'plans',
      deltaX: 85,
      deltaY: -10,
      durationMs: 300,
    }),
    { targetRoute: 'home', direction: -1 },
  );

  // Fast horizontal flick shorter than 56px still triggers navigation
  assert.deepEqual(
    resolveSwipeNavigation({
      currentRoute: 'team',
      deltaX: -40,
      deltaY: 5,
      durationMs: 90,
    }),
    { targetRoute: 'profile', direction: 1 },
  );
});

test('resolveSwipeNavigation rejects vertical scrolls, micro-taps, non-swipe routes, and out-of-bounds edges', () => {
  // Predominantly vertical scroll
  assert.equal(
    resolveSwipeNavigation({
      currentRoute: 'home',
      deltaX: -45,
      deltaY: 80,
      durationMs: 200,
    }),
    null,
  );

  // Too short & too slow
  assert.equal(
    resolveSwipeNavigation({
      currentRoute: 'home',
      deltaX: -28,
      deltaY: 2,
      durationMs: 400,
    }),
    null,
  );

  // Edge guard: cannot swipe right past Home or left past Profile
  assert.equal(
    resolveSwipeNavigation({
      currentRoute: 'home',
      deltaX: 110,
      deltaY: 4,
      durationMs: 250,
    }),
    null,
  );
  assert.equal(
    resolveSwipeNavigation({
      currentRoute: 'profile',
      deltaX: -110,
      deltaY: 4,
      durationMs: 250,
    }),
    null,
  );

  // Sub-routes like recharge or withdraw do not swipe-navigate
  assert.equal(
    resolveSwipeNavigation({
      currentRoute: 'recharge',
      deltaX: -100,
      deltaY: 2,
      durationMs: 200,
    }),
    null,
  );
});

test('computeDampedDragOffset caps travel and applies edge rubber-band damping', () => {
  const innerOffset = computeDampedDragOffset('plans', -100);
  const edgeOffset = computeDampedDragOffset('home', 100);
  assert.ok(innerOffset < 0 && Math.abs(innerOffset) <= 88);
  assert.ok(edgeOffset > 0 && edgeOffset <= 24);
  assert.equal(computeDampedDragOffset('recharge', -100), 0);
});
