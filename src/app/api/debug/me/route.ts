import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId, sessionClaims } = await auth();
  const user = await currentUser();
  return NextResponse.json({
    userId,
    sessionClaimsMetadata: (sessionClaims as any)?.metadata,
    publicMetadata: user?.publicMetadata,
    privateMetadata: user?.privateMetadata,
  });
}
