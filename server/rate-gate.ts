export class RateGate {
  private readonly hits = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxClients: number;

  constructor(limit: number, windowMs: number, maxClients = 10_000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.maxClients = maxClients;
  }

  allow(id: string, now = Date.now()): boolean {
    const clientId = id.slice(0, 128) || 'unknown';
    const windowStart = now - this.windowMs;
    const recent = (this.hits.get(clientId) ?? []).filter((stamp) => stamp > windowStart);
    if (recent.length >= this.limit) {
      this.hits.set(clientId, recent);
      return false;
    }
    if (!this.hits.has(clientId) && this.hits.size >= this.maxClients) {
      for (const [client, stamps] of this.hits) {
        if (stamps.every((stamp) => stamp <= windowStart)) this.hits.delete(client);
      }
      if (this.hits.size >= this.maxClients) return false;
    }
    recent.push(now);
    this.hits.set(clientId, recent);
    return true;
  }

  get clientCount(): number {
    return this.hits.size;
  }
}
