// ============================================================
// Jetdale — Public sample-project routing
//
// A public route /sample/[slug] renders the artifacts of a real
// project as a read-only page so visitors can see exactly what
// Jetdale produces before they sign up.
//
// To make a project public:
//   1. Generate a high-quality project as a normal user.
//   2. Copy its UUID from the URL (workspace?projectId=...).
//   3. Add a slug -> UUID entry below and redeploy.
//
// The route uses the admin Supabase client to bypass RLS, so the
// project doesn't need to be owned by the visitor. It only renders
// rows listed here — there's no enumeration risk.
// ============================================================

export const SAMPLE_PROJECTS: Record<string, string> = {
  // Add entries here. Example:
  // 'restaurant-saas': '00000000-0000-0000-0000-000000000000',
};

export function lookupSampleProjectId(slug: string): string | null {
  return SAMPLE_PROJECTS[slug] ?? null;
}
