import type { BubbleSettings, KeyStrategy } from './settings.ts';

type Slot = {
  id: string;
  secret: string;
  cooledUntil: number;
  failures: number;
};

export class KeyRing {
  private readonly keys: Slot[];
  private readonly settings: Pick<BubbleSettings, 'secrets' | 'strategy' | 'cooldownMs'>;
  private cursor = 0;

  constructor(settings: Pick<BubbleSettings, 'secrets' | 'strategy' | 'cooldownMs'>) {
    this.settings = settings;
    this.keys = settings.secrets.map((secret, index) => ({
      id: `k${index + 1}`,
      secret,
      cooledUntil: 0,
      failures: 0,
    }));
  }

  get size(): number {
    return this.keys.length;
  }

  get strategy(): KeyStrategy {
    return this.settings.strategy;
  }

  secrets(): string[] {
    return this.keys.map((key) => key.secret);
  }

  coolingCount(now = Date.now()): number {
    return this.keys.filter((key) => key.cooledUntil > now).length;
  }

  acquire(exclude: ReadonlySet<string>, now = Date.now()): { id: string; secret: string } | null {
    if (this.keys.length === 0) return null;
    const available = (key: Slot) => !exclude.has(key.id) && key.cooledUntil <= now;
    if (this.settings.strategy === 'failover') {
      const key = this.keys.find(available);
      return key ? { id: key.id, secret: key.secret } : null;
    }
    for (let offset = 0; offset < this.keys.length; offset += 1) {
      const key = this.keys[(this.cursor + offset) % this.keys.length];
      if (!available(key)) continue;
      this.cursor = (this.cursor + offset + 1) % this.keys.length;
      return { id: key.id, secret: key.secret };
    }
    return null;
  }

  reportSuccess(id: string): void {
    const key = this.keys.find((item) => item.id === id);
    if (!key) return;
    key.failures = 0;
    key.cooledUntil = 0;
  }

  reportFailure(id: string, now = Date.now()): void {
    const key = this.keys.find((item) => item.id === id);
    if (!key) return;
    key.failures += 1;
    key.cooledUntil = now + this.settings.cooldownMs;
  }
}
