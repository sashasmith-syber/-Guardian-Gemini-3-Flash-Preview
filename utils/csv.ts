const FORMULA_LEAD = /^[=+\-@]/;

/** Quote a CSV field and neutralize spreadsheet formula injection. */
export function csvCell(value: string | number): string {
  const flattened = String(value).replace(/\r\n|\r|\n/g, ' ');
  const guarded = FORMULA_LEAD.test(flattened.trimStart()) ? `'${flattened}` : flattened;
  return `"${guarded.replace(/"/g, '""')}"`;
}
