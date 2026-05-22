// ============================================================
// GET /api/projects/check — can the current user create a project?
// Lets the UI show an upgrade prompt before creation; the
// enforce_project_quota DB trigger is the hard enforcement.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyUser, isErrorResponse } from '@/lib/stripe';
import { getUserPlanTier, checkProjectQuota, isStaff } from '@/lib/quota';

export async function GET(req: NextRequest) {
  const user = await verifyUser(req);
  if (isErrorResponse(user)) return user;

  if (await isStaff(user.id)) {
    return NextResponse.json({ allowed: true, current: 0, max: -1, tier: 'staff' });
  }

  const tier = await getUserPlanTier(user.id);
  const quota = await checkProjectQuota(user.id, tier);
  return NextResponse.json(quota);
}
