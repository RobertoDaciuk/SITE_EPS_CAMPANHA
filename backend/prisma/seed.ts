// ============================================================================
// PRISMA SEED - VERSÃO LIMPA (V7.0)
// ============================================================================
// Seed minimalista que cria apenas estrutura básica para testes:
// - 2 Óticas
// - 5 Usuários (1 Admin + 2 Gerentes + 2 Vendedores)
// - Nenhuma campanha ou dados de produção
//
// Uso:
//   npx prisma migrate reset (zera banco, roda migrations e seed)
//   OU
//   npx ts-node prisma/seed.ts (apenas seed, mantém estrutura)
// ============================================================================

import { PrismaClient, PapelUsuario, StatusUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Senha padrão para todos os usuários de teste
const SENHA_PADRAO = 'Senha@123';

async function limparDados() {
  console.log('🧹 Limpando dados antigos (ordem segura para evitar erros de FK)...');

  await prisma.historicoCampanha.deleteMany({});
  await prisma.historicoValidacao.deleteMany({});
  await prisma.cartelaConcluida.deleteMany({});
  await prisma.relatorioFinanceiro.deleteMany({});
  await prisma.notificacao.deleteMany({});
  await prisma.envioVenda.deleteMany({});
  await prisma.condicaoRequisito.deleteMany({});
  await prisma.requisitoCartela.deleteMany({});
  await prisma.regraCartela.deleteMany({});
  await prisma.eventoEspecial.deleteMany({});
  // produtoCampanha removido (Sprint 21): produtos agora são por requisito
  await prisma.campanha.deleteMany({});
  await prisma.usuario.deleteMany({});
  await prisma.optica.deleteMany({});
  await prisma.configuracaoGlobal.deleteMany({});
  await prisma.logAutenticacao.deleteMany({});

  console.log('✅ Dados antigos removidos com sucesso.');
}

async function criarOpticas() {
  console.log('\n🏢 Criando 2 óticas...');

  const oticaA = await prisma.optica.create({
    data: {
      cnpj: '11111111000111',
      nome: 'Ótica Visão Clara',
      cidade: 'São Paulo',
      estado: 'SP',
      ativa: true,
      ehMatriz: true,
      visivelNoRanking: true,
      rankingVisivelParaVendedores: true,
    },
  });
  console.log(`   ✓ Criada: ${oticaA.nome} (CNPJ: ${oticaA.cnpj})`);

  const oticaB = await prisma.optica.create({
    data: {
      cnpj: '22222222000122',
      nome: 'Ótica Bom Ver',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      ativa: true,
      ehMatriz: true,
      visivelNoRanking: true,
      rankingVisivelParaVendedores: true,
    },
  });
  console.log(`   ✓ Criada: ${oticaB.nome} (CNPJ: ${oticaB.cnpj})`);

  return { oticaA, oticaB };
}

async function criarUsuarios(opticas: any) {
  console.log('\n👥 Criando 5 usuários...');

  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);

  // 1. ADMIN (não vinculado a ótica específica)
  const admin = await prisma.usuario.create({
    data: {
      nome: 'Administrador do Sistema',
      email: 'admin@eps.com.br',
      cpf: '00000000001',
      senhaHash,
      papel: PapelUsuario.ADMIN,
      status: StatusUsuario.ATIVO,
    },
  });
  console.log(`   ✓ Admin criado: ${admin.email}`);

  // 2. GERENTE A (Ótica Visão Clara)
  const gerenteA = await prisma.usuario.create({
    data: {
      nome: 'Carlos Silva',
      email: 'carlos.gerente@visaoclara.com',
      cpf: '11111111111',
      senhaHash,
      papel: PapelUsuario.GERENTE,
      status: StatusUsuario.ATIVO,
      opticaId: opticas.oticaA.id,
    },
  });
  console.log(`   ✓ Gerente criado: ${gerenteA.email} (${opticas.oticaA.nome})`);

  // 3. GERENTE B (Ótica Bom Ver)
  const gerenteB = await prisma.usuario.create({
    data: {
      nome: 'Maria Santos',
      email: 'maria.gerente@bomver.com',
      cpf: '22222222222',
      senhaHash,
      papel: PapelUsuario.GERENTE,
      status: StatusUsuario.ATIVO,
      opticaId: opticas.oticaB.id,
    },
  });
  console.log(`   ✓ Gerente criado: ${gerenteB.email} (${opticas.oticaB.nome})`);

  // 4. VENDEDOR A (subordinado ao Gerente A)
  const vendedorA = await prisma.usuario.create({
    data: {
      nome: 'João Pedro',
      email: 'joao.vendedor@visaoclara.com',
      cpf: '33333333333',
      senhaHash,
      papel: PapelUsuario.VENDEDOR,
      status: StatusUsuario.ATIVO,
      opticaId: opticas.oticaA.id,
      gerenteId: gerenteA.id,
    },
  });
  console.log(`   ✓ Vendedor criado: ${vendedorA.email} (Gerente: ${gerenteA.nome})`);

  // 5. VENDEDOR B (subordinado ao Gerente B)
  const vendedorB = await prisma.usuario.create({
    data: {
      nome: 'Ana Costa',
      email: 'ana.vendedor@bomver.com',
      cpf: '44444444444',
      senhaHash,
      papel: PapelUsuario.VENDEDOR,
      status: StatusUsuario.ATIVO,
      opticaId: opticas.oticaB.id,
      gerenteId: gerenteB.id,
    },
  });
  console.log(`   ✓ Vendedor criado: ${vendedorB.email} (Gerente: ${gerenteB.nome})`);

  return { admin, gerenteA, gerenteB, vendedorA, vendedorB };
}

async function main() {
  console.log('\n🌱 Iniciando seed LIMPO V7.0...');
  console.log(`🔑 Senha padrão para todos: ${SENHA_PADRAO}\n`);

  await limparDados();
  const opticas = await criarOpticas();
  const usuarios = await criarUsuarios(opticas);

  console.log('\n' + '═'.repeat(60));
  console.log('✅ SEED CONCLUÍDO COM SUCESSO!');
  console.log('═'.repeat(60));

  console.log('\n📋 CREDENCIAIS CRIADAS:\n');

  console.log('🔐 ADMIN:');
  console.log(`   Email: admin@eps.com.br`);
  console.log(`   Senha: ${SENHA_PADRAO}\n`);

  console.log('🏢 ÓTICA VISÃO CLARA (São Paulo):');
  console.log(`   Gerente: carlos.gerente@visaoclara.com | Senha: ${SENHA_PADRAO}`);
  console.log(`   Vendedor: joao.vendedor@visaoclara.com | Senha: ${SENHA_PADRAO}\n`);

  console.log('🏢 ÓTICA BOM VER (Rio de Janeiro):');
  console.log(`   Gerente: maria.gerente@bomver.com | Senha: ${SENHA_PADRAO}`);
  console.log(`   Vendedor: ana.vendedor@bomver.com | Senha: ${SENHA_PADRAO}\n`);

  console.log('═'.repeat(60));
  console.log('💡 PRÓXIMO PASSO: Criar campanhas via interface web!');
  console.log('═'.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('\n❌ ERRO durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexão Prisma fechada.\n');
  });
