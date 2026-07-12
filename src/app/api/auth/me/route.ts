import { NextResponse } from 'next/server';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    id: user.id,
    role: user.role,
    branchId: user.branchId,
    branchName: user.branch?.name ?? null,
    name: user.name,
    studentProfileId: user.studentProfileId,
  });
}
