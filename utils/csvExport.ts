/** Escape a CSV cell and neutralize formula injection when opened in spreadsheets. */
export function csvCell(value: string | number): string {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export interface CsvExportInput {
  generatedAt: string;
  clusterHealth: number;
  ingressGbps: number;
  nodeCount: number;
  nodes: Array<{
    id: string;
    name: string;
    region: string;
    tier: string;
    status: string;
    cpuLoad: number;
    memoryUsage: number;
    thermalC: number;
    latencyMs: number;
  }>;
  alerts: Array<{
    id: string;
    timestamp: string;
    severity: string;
    status: string;
    impactScore: number;
    title: string;
    origin: string;
    targetSubsystem: string;
  }>;
  messages: Array<{
    role: string;
    timestamp: string;
    content: string;
  }>;
}

export function buildSovereignAuditCsv(input: CsvExportInput): string {
  const rows: string[] = [];

  rows.push('--- GUARDIAN STRATEGIST V3.0 SOVEREIGN AUDIT REPORT ---');
  rows.push(`Generated: ${input.generatedAt}`);
  rows.push(`Cluster Health: ${input.clusterHealth.toFixed(1)}%`);
  rows.push(`Ingress: ${input.ingressGbps.toFixed(2)} GB/s`);
  rows.push(`Active Enclaves: ${input.nodeCount}`);
  rows.push('');

  rows.push('--- TELEMETRY NODES ---');
  rows.push('ID,Name,Region,Tier,Status,CPU(%),RAM(%),Thermal(C),Latency(ms)');
  for (const n of input.nodes) {
    rows.push(
      [
        csvCell(n.id),
        csvCell(n.name),
        csvCell(n.region),
        csvCell(n.tier),
        csvCell(n.status),
        n.cpuLoad,
        n.memoryUsage,
        n.thermalC,
        n.latencyMs,
      ].join(',')
    );
  }
  rows.push('');

  rows.push('--- STRATEGIC ALERTS ---');
  rows.push('ID,Timestamp,Severity,Status,ImpactScore,Title,Origin,Target');
  for (const a of input.alerts) {
    rows.push(
      [
        csvCell(a.id),
        csvCell(a.timestamp),
        csvCell(a.severity),
        csvCell(a.status),
        a.impactScore,
        csvCell(a.title),
        csvCell(a.origin),
        csvCell(a.targetSubsystem),
      ].join(',')
    );
  }
  rows.push('');

  rows.push('--- CONSOLE DIRECTIVES ---');
  rows.push('Role,Timestamp,Content');
  for (const m of input.messages) {
    rows.push([csvCell(m.role), csvCell(m.timestamp), csvCell(m.content)].join(','));
  }

  return rows.join('\n');
}

export function downloadTextFile(filename: string, contents: string, mime = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
