import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveActiveInvestorTarget,
  resolveEffectiveAccountEmail,
} from './adminImpersonation';

test('resolveActiveInvestorTarget switches UID only when verified admin is in investor mode', () => {
  assert.deepEqual(
    resolveActiveInvestorTarget({
      currentAuthUid: 'admin-1',
      isAdminUser: true,
      viewMode: 'investor',
      impersonatedUserUid: 'investor-99',
    }),
    { targetUid: 'investor-99', isImpersonating: true },
  );

  // Admin Console mode ignores impersonatedUserUid and treats session as not impersonating
  assert.deepEqual(
    resolveActiveInvestorTarget({
      currentAuthUid: 'admin-1',
      isAdminUser: true,
      viewMode: 'admin',
      impersonatedUserUid: 'investor-99',
    }),
    { targetUid: 'admin-1', isImpersonating: false },
  );

  // Impersonating self keeps isImpersonating false
  assert.deepEqual(
    resolveActiveInvestorTarget({
      currentAuthUid: 'admin-1',
      isAdminUser: true,
      viewMode: 'investor',
      impersonatedUserUid: 'admin-1',
    }),
    { targetUid: 'admin-1', isImpersonating: false },
  );
});

test('resolveActiveInvestorTarget refuses impersonation for non-admin accounts', () => {
  assert.deepEqual(
    resolveActiveInvestorTarget({
      currentAuthUid: 'user-5',
      isAdminUser: false,
      viewMode: 'investor',
      impersonatedUserUid: 'investor-99',
    }),
    { targetUid: 'user-5', isImpersonating: false },
  );

  assert.deepEqual(
    resolveActiveInvestorTarget({
      currentAuthUid: null,
      isAdminUser: true,
      viewMode: 'investor',
      impersonatedUserUid: 'investor-99',
    }),
    { targetUid: null, isImpersonating: false },
  );
});

test('resolveEffectiveAccountEmail prevents leaking admin email onto impersonated investor', () => {
  assert.equal(
    resolveEffectiveAccountEmail({
      profileEmail: '',
      authEmail: 'techbcofficialaman@gmail.com',
      isImpersonating: true,
    }),
    '',
  );

  assert.equal(
    resolveEffectiveAccountEmail({
      profileEmail: 'investor@example.com',
      authEmail: 'techbcofficialaman@gmail.com',
      isImpersonating: true,
    }),
    'investor@example.com',
  );

  assert.equal(
    resolveEffectiveAccountEmail({
      profileEmail: '',
      authEmail: 'owner@example.com',
      isImpersonating: false,
    }),
    'owner@example.com',
  );
});
