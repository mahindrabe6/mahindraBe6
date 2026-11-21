export type BroadcastTone = 'promo' | 'info' | 'warning';

export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  tone: BroadcastTone;
  active: boolean;
  sentAt: string;
}

export interface BroadcastValidationResult {
  valid: boolean;
  error?: string;
  clean?: {
    title: string;
    message: string;
    tone: BroadcastTone;
  };
}

const VALID_TONES: ReadonlyArray<BroadcastTone> = ['promo', 'info', 'warning'];

export function validateBroadcastInput(input: {
  title: string;
  message: string;
  tone: BroadcastTone;
}): BroadcastValidationResult {
  const title = (input.title ?? '').trim();
  const message = (input.message ?? '').trim();
  const tone: BroadcastTone = VALID_TONES.includes(input.tone)
    ? input.tone
    : 'info';

  if (title.length < 2 || title.length > 60) {
    return {
      valid: false,
      error: 'Broadcast title must be between 2 and 60 characters.',
    };
  }
  if (message.length < 4 || message.length > 240) {
    return {
      valid: false,
      error: 'Broadcast message must be between 4 and 240 characters.',
    };
  }

  return {
    valid: true,
    clean: { title, message, tone },
  };
}

export function createBroadcastId(nowMs: number = Date.now()): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `bcast-${nowMs}-${rand}`;
}

export function sanitizeBroadcastFromDoc(raw: unknown): BroadcastMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const message = typeof obj.message === 'string' ? obj.message.trim() : '';
  const tone = VALID_TONES.includes(obj.tone as BroadcastTone)
    ? (obj.tone as BroadcastTone)
    : 'info';
  const active = Boolean(obj.active);
  const sentAt =
    typeof obj.sentAt === 'string' && obj.sentAt.trim().length > 0
      ? obj.sentAt.trim()
      : new Date().toISOString();

  if (!/^[a-zA-Z0-9_-]{3,80}$/.test(id)) return null;
  if (title.length < 2 || title.length > 60) return null;
  if (message.length < 4 || message.length > 240) return null;

  return {
    id,
    title,
    message,
    tone,
    active,
    sentAt,
  };
}

export function shouldDisplayBroadcastToast(params: {
  broadcast: BroadcastMessage | null | undefined;
  role: 'investor' | 'admin';
  dismissedIds: ReadonlyArray<string>;
}): boolean {
  if (params.role !== 'investor') return false;
  const b = params.broadcast;
  if (!b || !b.active) return false;
  if (b.title.trim().length < 2 || b.message.trim().length < 4) return false;
  return !params.dismissedIds.includes(b.id);
}
