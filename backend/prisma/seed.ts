// Seed de desenvolvimento — Central de Vitalidade
//
// Garante dados mínimos para rodar o app fora do ambiente de migração:
//   - 1 usuário administrador (admin / admin — troque após o primeiro acesso)
//   - User de exemplo (paciente) para navegar pelas telas
//
// Uso: npx prisma db seed  (ou npm run prisma:seed)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { id: 'admin' },
    update: {},
    create: {
      id: 'admin',
      name: 'admin',
      passwordHash: '$2a$10$9GQdY0O0h82gx3sUSp0oMeX7Yq7DDTxL4BxCfRVlBGx2QZpQgjzMS', // 'admin'
      fullName: 'Administrador',
      role: 'ADMINISTRADOR',
    },
  });
  console.log('✔ usuário admin:', admin.id, admin.name);

  const pac = await prisma.user.upsert({
    where: { id: 'seed-patient' },
    update: {},
    create: {
      id: 'seed-patient',
      name: 'joao.falcao',
      passwordHash: '$2a$10$9GQdY0O0h82gx3sUSp0oMeX7Yq7DDTxL4BxCfRVlBGx2QZpQgjzMS', // 'admin'
      fullName: 'João Falcão',
      role: 'PACIENTE',
      height: 1.75,
      email: 'joao.falcao@example.com',
      medicalRecordNumber: '0000000-0',
    },
  });
  console.log('✔ paciente seed:', pac.id, pac.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());