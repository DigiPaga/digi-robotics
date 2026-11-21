import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { wallet: '0xB282276c54c6Cc9912A37c538fdD60a98a4EF5f1' },
  });
  
  if (user) {
    console.log('✅ USUARIO ENCONTRADO:');
    console.log('Wallet:', user.wallet);
    console.log('Role:', user.role);
    console.log('Created:', user.createdAt);
  } else {
    console.log('❌ USUARIO NO ENCONTRADO - Necesitas crearlo');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
