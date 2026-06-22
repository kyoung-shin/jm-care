import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Webhook } from 'svix';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) return NextResponse.json({ error: 'No webhook secret' }, { status: 500 });

  const headersList = await headers();
  const svix_id = headersList.get('svix-id');
  const svix_timestamp = headersList.get('svix-timestamp');
  const svix_signature = headersList.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, { 'svix-id': svix_id, 'svix-timestamp': svix_timestamp, 'svix-signature': svix_signature });
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses?.[0]?.email_address || '';
    const name = [first_name, last_name].filter(Boolean).join(' ') || email;

    await prisma.user.upsert({
      where: { clerkId: id },
      update: {},
      create: { clerkId: id, name, email, role: 'PENDING' },
    });
  }

  if (evt.type === 'user.updated') {
    const { id, public_metadata } = evt.data;
    const role = public_metadata?.role;
    if (role) {
      await prisma.user.updateMany({
        where: { clerkId: id },
        data: { role },
      });
    }
  }

  return NextResponse.json({ success: true });
}
