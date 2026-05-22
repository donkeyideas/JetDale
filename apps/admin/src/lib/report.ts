// ============================================================
// Jetdale — Client-side file download helpers
// ============================================================

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Download an admin page's data as a JSON report.
 * No-op (alerts) if there's no data loaded yet.
 */
export function downloadReport(name: string, data: unknown) {
  if (data == null) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `jetdale-${name}-${today()}.json`);
}

/**
 * Download tabular data as a CSV file.
 * `rows` is an array of objects; columns are taken from the first row's keys.
 */
export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `jetdale-${name}-${today()}.csv`);
}
