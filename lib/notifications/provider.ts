/**
 * Notification delivery behind a provider interface.
 *
 * The rest of the app never talks to Twilio/SendGrid directly — it talks to a
 * `NotificationProvider`. That keeps transition logic testable (InMemory
 * provider) and lets us swap providers without touching business code.
 */

export type Channel = 'email' | 'sms';

export interface NotificationMessage {
  channel: Channel;
  /** Email address or E.164 phone number depending on channel. */
  to: string;
  subject?: string;
  body: string;
  /** For idempotency / dedupe across retries. */
  idempotencyKey?: string;
}

export interface DeliveryResult {
  ok: boolean;
  channel: Channel;
  to: string;
  providerId?: string;
  error?: string;
}

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<DeliveryResult>;
}

/**
 * Captures every message in memory. Used by tests and dry-runs; also useful as
 * an audit sink you can compose alongside a real provider.
 */
export class InMemoryNotificationProvider implements NotificationProvider {
  readonly sent: NotificationMessage[] = [];

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    this.sent.push(message);
    return { ok: true, channel: message.channel, to: message.to, providerId: `mem-${this.sent.length}` };
  }

  byChannel(channel: Channel): NotificationMessage[] {
    return this.sent.filter((m) => m.channel === channel);
  }
}

/** Logs to stdout. Handy default for local dev where no provider is configured. */
export class ConsoleNotificationProvider implements NotificationProvider {
  async send(message: NotificationMessage): Promise<DeliveryResult> {
    // eslint-disable-next-line no-console
    console.log(`[notify:${message.channel}] -> ${message.to}: ${message.subject ?? ''} ${message.body}`);
    return { ok: true, channel: message.channel, to: message.to };
  }
}

/**
 * Fan a single logical message out to multiple providers (e.g. a real sender +
 * an in-memory audit sink). Aggregates into one result per underlying provider.
 */
export class CompositeNotificationProvider implements NotificationProvider {
  constructor(private readonly providers: NotificationProvider[]) {}

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    const results = await Promise.all(this.providers.map((p) => p.send(message)));
    const failed = results.find((r) => !r.ok);
    return failed ?? results[0] ?? { ok: true, channel: message.channel, to: message.to };
  }
}
