// Script de teste rápido para validar login
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testarLogin() {
  console.log('\n🔍 TESTANDO SISTEMA DE LOGIN\n');
  
  // 1. Buscar usuário admin
  const admin = await prisma.usuario.findUnique({
    where: { email: 'admin@eps.com.br' },
    select: {
      id: true,
      nome: true,
      email: true,
      cpf: true,
      senhaHash: true,
      status: true,
      papel: true,
    },
  });

  if (!admin) {
    console.log('❌ Usuário admin NÃO encontrado no banco!');
    console.log('📌 Você precisa executar o seed: npx ts-node prisma/seed.ts\n');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Usuário encontrado:');
  console.log('   Nome:', admin.nome);
  console.log('   Email:', admin.email);
  console.log('   CPF:', admin.cpf);
  console.log('   Status:', admin.status);
  console.log('   Papel:', admin.papel);
  console.log('   Hash:', admin.senhaHash.substring(0, 30) + '...');

  // 2. Testar senha padrão
  const senhaParaTestar = 'Senha@123';
  console.log('\n🔐 Testando senha:', senhaParaTestar);
  
  const senhaCorreta = await bcrypt.compare(senhaParaTestar, admin.senhaHash);
  
  if (senhaCorreta) {
    console.log('✅ SENHA CORRETA! O login deveria funcionar.\n');
  } else {
    console.log('❌ SENHA INCORRETA!');
    console.log('📌 O hash no banco não corresponde à senha "Senha@123"');
    console.log('📌 Execute o seed novamente: npx ts-node prisma/seed.ts\n');
  }

  // 3. Buscar todos os usuários
  const todosUsuarios = await prisma.usuario.findMany({
    select: {
      email: true,
      status: true,
      papel: true,
    },
  });

  console.log('📊 Total de usuários no banco:', todosUsuarios.length);
  console.log('\n📋 Lista de emails cadastrados:');
  todosUsuarios.forEach((u) => {
    console.log(`   - ${u.email} (${u.papel} - ${u.status})`);
  });

  console.log('\n✅ Teste concluído!\n');
  
  await prisma.$disconnect();
}

testarLogin().catch((error) => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
