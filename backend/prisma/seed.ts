// Seed Script — Populates database with admin user only
// Reference data (categories, departments, machines, persons, suppliers) is left empty
// for the user to fill via the UI or Excel import.
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ============================================================
  // ADMIN USER (username: STORE ADMIN, password: S123T)
  // ============================================================
  const passwordHash = await bcrypt.hash('S123T', 10);

  const admin = await prisma.users.upsert({
    where: { username: 'STORE ADMIN' },
    update: {},
    create: {
      username: 'STORE ADMIN',
      password_hash: passwordHash,
      full_name: 'Store Admin',
      role: 'ADMIN',
    },
  });
  console.log(`✅ User: ${admin.username} (${admin.role})`);

  console.log('\n🎉 Seeding complete!');
  console.log('ℹ️  Categories, departments, machines, persons, suppliers are empty.');
  console.log('   Add them via the UI or import from Excel.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
