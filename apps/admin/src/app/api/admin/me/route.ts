import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const result = await verifyAdmin(req);
  if (isErrorResponse(result)) return result;
  return NextResponse.json(result);
}
