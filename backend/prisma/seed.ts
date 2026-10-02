import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Departments must exist before machines (FK) — fixed IDs so machine refs hold
const departments = [
  { id: 3, name: 'Bag Making' },
  { id: 4, name: 'Extruder' },
  { id: 5, name: 'Printing' },
  { id: 6, name: 'Lamination' },
  { id: 7, name: 'Slitting' },
  { id: 8, name: 'Metalizer' },
  { id: 9, name: 'Hologram' },
  { id: 10, name: 'UV Machine' },
  { id: 11, name: 'Office' },
  { id: 12, name: 'Basic Mechanical' },
  { id: 13, name: 'Basic Electrical' },
];

const machines = [
  { name: 'Wordly GRV 1', departmentId: 5 },
  { name: 'Wordly GRV 2', departmentId: 5 },
  { name: 'Shanxi Barren GRV 1', departmentId: 5 },
  { name: 'Shanxi Barren GRV 2', departmentId: 5 },
  { name: 'Center Seal 1', departmentId: 3 },
  { name: 'Center Seal 2', departmentId: 3 },
  { name: 'Center Seal 3', departmentId: 3 },
  { name: 'Center Seal 4', departmentId: 3 },
  { name: 'Center Seal 5', departmentId: 3 },
  { name: 'Standup Pouch 1', departmentId: 3 },
  { name: 'Standup Pouch 2', departmentId: 3 },
  { name: 'Standup Pouch 3', departmentId: 3 },
  { name: 'Standup Pouch 4', departmentId: 3 },
  { name: 'Standup Pouch 5', departmentId: 3 },
  { name: 'Standup Pouch 6', departmentId: 3 },
  { name: 'Flat Bottom 1', departmentId: 3 },
  { name: 'Flat Bottom 2', departmentId: 3 },
  { name: 'Pamper Machine', departmentId: 3 },
  { name: 'Comexi Lamination New', departmentId: 6 },
  { name: 'Comexi Lamination Old', departmentId: 6 },
  { name: 'Sinomech Lamination 1', departmentId: 6 },
  { name: 'Sinomech Lamination 2', departmentId: 6 },
  { name: 'Solvent Base Lamination', departmentId: 6 },
  { name: 'Slitting 600 Speed 1', departmentId: 7 },
  { name: 'Slitting 600 Speed 2', departmentId: 7 },
  { name: 'Slitting 400 Speed 1', departmentId: 7 },
  { name: 'Slitting 400 Speed 2', departmentId: 7 },
  { name: 'Slitting 400 Speed 3', departmentId: 7 },
  { name: 'Monolayer Extu', departmentId: 4 },
  { name: '3 Layer Extu', departmentId: 4 },
  { name: 'HD Layer Extu', departmentId: 4 },
  { name: 'Metalizer', departmentId: 8 },
  { name: 'Hologram', departmentId: 9 },
  { name: 'UV Machine', departmentId: 10 },
];

async function main() {
  console.log('Seeding database...\n');

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
  console.log(`User: ${admin.username} (${admin.role})`);

  let deptsCreated = 0;
  for (const dept of departments) {
    const existing = await prisma.departments.findFirst({
      where: { id: dept.id },
    });
    if (existing) continue;
    await prisma.departments.create({
      data: { id: dept.id, name: dept.name },
    });
    deptsCreated++;
  }
  console.log(`Departments: ${deptsCreated} created, ${departments.length - deptsCreated} skipped (already exist)`);

  let created = 0;
  let skipped = 0;

  for (const machine of machines) {
    const existing = await prisma.machines.findFirst({
      where: { name: machine.name },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.machines.create({
      data: {
        name: machine.name,
        department_id: machine.departmentId,
      },
    });
    created++;
  }

  console.log(`Machines: ${created} created, ${skipped} skipped (already exist)`);
  console.log('\nSeeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
