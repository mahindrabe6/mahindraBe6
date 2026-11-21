export interface ActiveInvestorTargetInput {
  currentAuthUid: string | null | undefined;
  isAdminUser: boolean;
  viewMode: 'investor' | 'admin';
  impersonatedUserUid: string | null | undefined;
}

export interface ActiveInvestorTargetResult {
  targetUid: string | null;
  isImpersonating: boolean;
}

export function resolveActiveInvestorTarget(
  input: ActiveInvestorTargetInput,
): ActiveInvestorTargetResult {
  const authUid = input.currentAuthUid ? String(input.currentAuthUid).trim() : '';
  if (!authUid) {
    return { targetUid: null, isImpersonating: false };
  }

  const target = input.impersonatedUserUid
    ? String(input.impersonatedUserUid).trim()
    : '';

  if (
    input.isAdminUser &&
    input.viewMode === 'investor' &&
    target.length > 0 &&
    target !== authUid
  ) {
    return { targetUid: target, isImpersonating: true };
  }

  return { targetUid: authUid, isImpersonating: false };
}

export function resolveEffectiveAccountEmail(params: {
  profileEmail: string | null | undefined;
  authEmail: string | null | undefined;
  isImpersonating: boolean;
}): string {
  const cleanProfileEmail = (params.profileEmail ?? '').trim();
  if (params.isImpersonating) {
    return cleanProfileEmail;
  }
  return cleanProfileEmail || (params.authEmail ?? '').trim();
}
