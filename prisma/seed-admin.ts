import { config } from 'dotenv';
import ws from 'ws';
import bcrypt from 'bcryptjs';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: '.env.local' });
config({ path: '.env' });

neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD in .env.local before running this script');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role: 'ADMIN' },
    create: { username, passwordHash, name: '관리자', email: null, role: 'ADMIN' },
  });

  console.log(`✓ Admin ready: username=${username}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
