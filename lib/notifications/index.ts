/**
 * Notifier — fires notifications on the three key load transitions:
 *   1. confirmation      (shipper confirms/books)  -> both sides
 *   2. carrier_accepted  (a carrier accepts)       -> both sides
 *   3. delivered         (load delivered)          -> both sides
 *
 * Each transition notifies BOTH the shipper and carrier (acceptance criteria:
 * "Both sides receive notifications ..."). Messages are content-built by pure
 * template functions so they can be asserted in tests, and dispatch is
 * idempotency-keyed so a retried transition doesn't double-send.
 */

import type { NotifiableTransition } from '../types.ts';
import type {
  DeliveryResult,
  NotificationMessage,
  NotificationProvider,
} from './provider.ts';

export interface NotifyParty {
  email?: string;
  phone?: string;
  name: string;
}

export interface TransitionContext {
  loadId: string;
  transition: NotifiableTransition;
  shipper: NotifyParty;
  carrier: NotifyParty;
  origin?: string;
  destination?: string;
  /** e.g. carrier legal name to reference in the shipper's message. */
  carrierName?: string;
}

interface TemplatedMessage {
  subject: string;
  body: string;
}

/** Pure templates keyed by transition + audience. Exported for direct testing. */
export function buildMessage(
  ctx: TransitionContext,
  audience: 'shipper' | 'carrier',
): TemplatedMessage {
  const lane =
    ctx.origin && ctx.destination ? ` (${ctx.origin} → ${ctx.destination})` : '';
  const ref = `Load ${ctx.loadId}${lane}`;

  switch (ctx.transition) {
    case 'confirmation':
      return audience === 'shipper'
        ? { subject: `Booking confirmed — ${ref}`, body: `Hi ${ctx.shipper.name}, your ${ref} is confirmed and out to carriers.` }
        : { subject: `New confirmed load — ${ref}`, body: `Hi ${ctx.carrier.name}, ${ref} is confirmed and available to accept.` };
    case 'carrier_accepted':
      return audience === 'shipper'
        ? { subject: `Carrier assigned — ${ref}`, body: `Hi ${ctx.shipper.name}, ${ctx.carrierName ?? 'a carrier'} accepted ${ref}.` }
        : { subject: `You accepted — ${ref}`, body: `Hi ${ctx.carrier.name}, you've been assigned ${ref}. Pickup details to follow.` };
    case 'delivered':
      return audience === 'shipper'
        ? { subject: `Delivered — ${ref}`, body: `Hi ${ctx.shipper.name}, ${ref} was delivered. Thanks for shipping with Endurance.` }
        : { subject: `Delivery confirmed — ${ref}`, body: `Hi ${ctx.carrier.name}, delivery of ${ref} is recorded. Nice work.` };
    default: {
      const _exhaustive: never = ctx.transition;
      throw new Error(`unhandled transition: ${String(_exhaustive)}`);
    }
  }
}

function messagesForParty(
  party: NotifyParty,
  tpl: TemplatedMessage,
  idempotencyKey: string,
): NotificationMessage[] {
  const out: NotificationMessage[] = [];
  if (party.email) {
    out.push({ channel: 'email', to: party.email, subject: tpl.subject, body: tpl.body, idempotencyKey: `${idempotencyKey}:email` });
  }
  if (party.phone) {
    // SMS is subject-less; prepend nothing, keep it short.
    out.push({ channel: 'sms', to: party.phone, body: tpl.body, idempotencyKey: `${idempotencyKey}:sms` });
  }
  return out;
}

export class Notifier {
  /** Tracks idempotency keys already dispatched to avoid double-sends on retry. */
  private readonly seen = new Set<string>();

  constructor(private readonly provider: NotificationProvider) {}

  /**
   * Notify both sides of a transition. Returns every delivery result. Any
   * message whose idempotency key was already sent is skipped (not resent).
   */
  async notifyTransition(ctx: TransitionContext): Promise<DeliveryResult[]> {
    const base = `${ctx.loadId}:${ctx.transition}`;
    const shipperMsgs = messagesForParty(
      ctx.shipper,
      buildMessage(ctx, 'shipper'),
      `${base}:shipper`,
    );
    const carrierMsgs = messagesForParty(
      ctx.carrier,
      buildMessage(ctx, 'carrier'),
      `${base}:carrier`,
    );

    const results: DeliveryResult[] = [];
    for (const msg of [...shipperMsgs, ...carrierMsgs]) {
      const key = msg.idempotencyKey!;
      if (this.seen.has(key)) continue;
      this.seen.add(key);
      results.push(await this.provider.send(msg));
    }
    return results;
  }

  /** Convenience wrappers for the three named transitions. */
  onConfirmation(ctx: Omit<TransitionContext, 'transition'>): Promise<DeliveryResult[]> {
    return this.notifyTransition({ ...ctx, transition: 'confirmation' });
  }
  onCarrierAccepted(ctx: Omit<TransitionContext, 'transition'>): Promise<DeliveryResult[]> {
    return this.notifyTransition({ ...ctx, transition: 'carrier_accepted' });
  }
  onDelivered(ctx: Omit<TransitionContext, 'transition'>): Promise<DeliveryResult[]> {
    return this.notifyTransition({ ...ctx, transition: 'delivered' });
  }
}

export * from './provider.ts';
