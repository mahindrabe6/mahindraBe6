import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeBroadcastFromDoc,
  shouldDisplayBroadcastToast,
  validateBroadcastInput,
} from './broadcastMessage';

test('validateBroadcastInput enforces title, message, and tone bounds', () => {
  const shortTitle = validateBroadcastInput({
    title: 'A',
    message: 'Valid broadcast text here',
    tone: 'promo',
  });
  assert.equal(shortTitle.valid, false);

  const shortMsg = validateBroadcastInput({
    title: 'Bonus Live',
    message: 'Hi',
    tone: 'info',
  });
  assert.equal(shortMsg.valid, false);

  const longMsg = validateBroadcastInput({
    title: 'Alert',
    message: 'x'.repeat(241),
    tone: 'warning',
  });
  assert.equal(longMsg.valid, false);

  const ok = validateBroadcastInput({
    title: '  Weekend Bonus  ',
    message: '  Earn instant rewards on all BE6 plans today!  ',
    tone: 'promo',
  });
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.clean, {
    title: 'Weekend Bonus',
    message: 'Earn instant rewards on all BE6 plans today!',
    tone: 'promo',
  });
});

test('sanitizeBroadcastFromDoc parses valid payloads and rejects malformed records', () => {
  assert.equal(sanitizeBroadcastFromDoc(null), null);
  assert.equal(
    sanitizeBroadcastFromDoc({
      id: 'bad id with spaces',
      title: 'Offer',
      message: 'Valid body text',
      tone: 'promo',
      active: true,
      sentAt: '2026-11-21T01:00:00.000Z',
    }),
    null,
  );

  const valid = sanitizeBroadcastFromDoc({
    id: 'bcast-1795166000000-ab12',
    title: 'IMPS Payouts Faster',
    message: 'All IMPS withdrawals settle within 15 minutes today.',
    tone: 'info',
    active: true,
    sentAt: '2026-11-21T01:00:00.000Z',
  });
  assert.equal(valid?.id, 'bcast-1795166000000-ab12');
  assert.equal(valid?.tone, 'info');
  assert.equal(valid?.active, true);
});

test('shouldDisplayBroadcastToast displays only active undismissed broadcasts for logged-in investors', () => {
  const activePromo = {
    id: 'bcast-100',
    title: 'Flash Offer',
    message: 'Extra bonus live on BE6 Pack One today.',
    tone: 'promo' as const,
    active: true,
    sentAt: '2026-11-21T01:00:00.000Z',
  };

  assert.equal(
    shouldDisplayBroadcastToast({
      broadcast: activePromo,
      role: 'investor',
      dismissedIds: [],
    }),
    true,
  );

  assert.equal(
    shouldDisplayBroadcastToast({
      broadcast: activePromo,
      role: 'admin',
      dismissedIds: [],
    }),
    false,
  );

  assert.equal(
    shouldDisplayBroadcastToast({
      broadcast: activePromo,
      role: 'investor',
      dismissedIds: ['bcast-100'],
    }),
    false,
  );

  assert.equal(
    shouldDisplayBroadcastToast({
      broadcast: { ...activePromo, active: false },
      role: 'investor',
      dismissedIds: [],
    }),
    false,
  );
});
