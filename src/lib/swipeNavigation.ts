import { AppRoute } from './investmentEngine';

export const MAIN_SWIPE_ROUTES: readonly AppRoute[] = [
  'home',
  'plans',
  'team',
  'profile',
] as const;

export const SWIPE_ROUTE_LABELS: Record<AppRoute, string> = {
  home: 'Home',
  plans: 'Plans',
  team: 'Team',
  profile: 'Profile',
  checkin: 'Check-In',
  recharge: 'Recharge',
  withdraw: 'Withdraw',
  settings: 'Settings',
  bank: 'Bank Details',
  admin: 'Admin',
};

export function isMainSwipeRoute(route: AppRoute): boolean {
  return MAIN_SWIPE_ROUTES.includes(route);
}

export function getSwipeRouteDirection(
  fromRoute: AppRoute,
  toRoute: AppRoute,
): -1 | 0 | 1 {
  const fromIdx = MAIN_SWIPE_ROUTES.indexOf(fromRoute);
  const toIdx = MAIN_SWIPE_ROUTES.indexOf(toRoute);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return 0;
  return toIdx > fromIdx ? 1 : -1;
}

export function getNeighborSwipeRoute(
  currentRoute: AppRoute,
  direction: -1 | 1,
): AppRoute | null {
  const idx = MAIN_SWIPE_ROUTES.indexOf(currentRoute);
  if (idx === -1) return null;
  const nextIdx = idx + direction;
  if (nextIdx < 0 || nextIdx >= MAIN_SWIPE_ROUTES.length) return null;
  return MAIN_SWIPE_ROUTES[nextIdx];
}

export function computeDampedDragOffset(
  currentRoute: AppRoute,
  deltaX: number,
): number {
  const idx = MAIN_SWIPE_ROUTES.indexOf(currentRoute);
  if (idx === -1 || deltaX === 0) return 0;
  const direction: -1 | 1 = deltaX < 0 ? 1 : -1;
  const hasNeighbor = getNeighborSwipeRoute(currentRoute, direction) !== null;
  const abs = Math.abs(deltaX);
  if (!hasNeighbor) {
    // Edge rubber-band resistance
    return Math.sign(deltaX) * Math.min(24, abs * 0.16);
  }
  return Math.sign(deltaX) * Math.min(88, abs * 0.48);
}

export interface SwipeResolutionInput {
  currentRoute: AppRoute;
  deltaX: number;
  deltaY: number;
  durationMs: number;
  minDistancePx?: number;
  fastDistancePx?: number;
  fastVelocityPxPerMs?: number;
}

export interface SwipeResolution {
  targetRoute: AppRoute;
  direction: -1 | 1;
}

export function resolveSwipeNavigation({
  currentRoute,
  deltaX,
  deltaY,
  durationMs,
  minDistancePx = 56,
  fastDistancePx = 32,
  fastVelocityPxPerMs = 0.32,
}: SwipeResolutionInput): SwipeResolution | null {
  if (!isMainSwipeRoute(currentRoute)) return null;

  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  // Reject mostly-vertical gestures
  if (absX <= 0 || absY * 1.15 >= absX) return null;

  const velocity = durationMs > 0 ? absX / durationMs : 0;
  const passedDistance = absX >= minDistancePx;
  const passedFastFlick = absX >= fastDistancePx && velocity >= fastVelocityPxPerMs;

  if (!passedDistance && !passedFastFlick) return null;

  // Swiping finger left (deltaX < 0) advances right in tab order (+1)
  const direction: -1 | 1 = deltaX < 0 ? 1 : -1;
  const targetRoute = getNeighborSwipeRoute(currentRoute, direction);
  if (!targetRoute) return null;

  return { targetRoute, direction };
}
