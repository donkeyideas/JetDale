// ============================================================
// Jetdale — Display formatting helpers
// ============================================================

// Words that should render fully uppercase when humanized.
const ACRONYMS = new Set([
  'ai', 'api', 'pdf', 'url', 'id', 'seo', 'aeo', 'geo', 'cro',
  'raci', 'mrr', 'arr', 'arpu', 'kpi', 'sla', 'csv', 'json',
  'html', 'b2b', 'b2c', 'ui', 'ux', 'cli', 'sdk', 'crm',
]);

/**
 * Turn a raw key / enum value into a human-readable label.
 *   "voice_input"          -> "Voice Input"
 *   "artifact_generation"  -> "Artifact Generation"
 *   "export_pdf"           -> "Export PDF"
 *   "deepseek-v4-flash"    -> "Deepseek V4 Flash"
 *   "feature_flag.update"  -> "Feature Flag Update"
 */
export function humanize(value: string | null | undefined): string {
  if (!value) return '';
  return String(value)
    .replace(/[-_.]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) =>
      ACRONYMS.has(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(' ');
}
