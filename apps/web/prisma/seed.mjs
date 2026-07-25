// Seed del usuario administrador.
// Ejecutar (desde apps/web) con las variables cargadas:
//   node --env-file=.env.local prisma/seed.mjs
// Requiere en el entorno: DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME.
// El password NUNCA se guarda en el repo: solo vive en .env.local (gitignored).

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Administrador';

  if (!email || !password) {
    throw new Error('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD en el entorno.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { isAdmin: true, isApproved: true },
    create: { email, name, passwordHash, isAdmin: true, isApproved: true },
    select: { id: true, email: true, isAdmin: true, isApproved: true },
  });

  console.log('✔ Admin listo:', user);
}

main()
  .catch((e) => {
    console.error('✖ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
