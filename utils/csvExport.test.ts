import { describe, expect, it } from 'vitest';
import { buildSovereignAuditCsv, csvCell } from './csvExport';

describe('csvCell', () => {
  it('quotes and escapes embedded quotes', () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('neutralizes spreadsheet formula injection', () => {
    expect(csvCell('=CMD()')).toBe(`"'=CMD()"`);
    expect(csvCell('+1+1')).toBe(`"'+1+1"`);
    expect(csvCell('-1+1')).toBe(`"'-1+1"`);
    expect(csvCell('@SUM(A1)')).toBe(`"'@SUM(A1)"`);
  });
});

describe('buildSovereignAuditCsv', () => {
  it('includes nodes, alerts, and messages with sanitized cells', () => {
    const csv = buildSovereignAuditCsv({
      generatedAt: '2026-10-16T00:00:00.000Z',
      clusterHealth: 99.8,
      ingressGbps: 4.82,
      nodeCount: 1,
      nodes: [
        {
          id: 'NODE-01',
          name: 'Primus',
          region: 'Ashburn',
          tier: 'CORE_PRIMARY',
          status: 'NOMINAL',
          cpuLoad: 28,
          memoryUsage: 42,
          thermalC: 38.4,
          latencyMs: 4.1,
        },
      ],
      alerts: [
        {
          id: 'ALT-1',
          timestamp: '12:00:00',
          severity: 'HIGH',
          status: 'ACTIVE',
          impactScore: 78,
          title: '=Evil("x")',
          origin: 'Edge',
          targetSubsystem: 'Gateway',
        },
      ],
      messages: [
        {
          role: 'OPERATOR',
          timestamp: '12:01:00',
          content: 'Assess perimeter',
        },
      ],
    });

    expect(csv).toContain('TELEMETRY NODES');
    expect(csv).toContain('"NODE-01"');
    expect(csv).toContain(`"'=Evil(""x"")"`);
    expect(csv).toContain('"OPERATOR"');
    expect(csv).toContain('Assess perimeter');
  });
});
