/**
 * ====================================================================
 * SERVIÇO: PerfilService (REFATORADO - Atomicidade)
 * ====================================================================
 *
 * Serviço de perfil pessoal para autoatendimento do usuário autenticado.
 *
 * CORREÇÃO (Princípio 5.1 - Atomicidade):
 * - O método `atualizarSenha` agora usa `prisma.$transaction` para garantir
 * que a atualização da senha seja atômica.
 *
 * Princípios de Segurança (Data Tenancy):
 * - Toda operação utiliza o usuarioId extraído do JWT (Princípio 5.5).
 * - Nenhuma operação permite alterar dados de outros usuários.
 * - Campos sensíveis (senhaHash) nunca são retornados.
 *
 * Versão: 4.1 (Sprint 17.2 - Tarefa 40.1)
 */
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';
import { AtualizarSenhaDto } from './dto/atualizar-senha.dto';
import {
  PapelUsuario,
  Prisma,
  StatusEnvioVenda,
  StatusUsuario,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Serviço de perfil pessoal para autoatendimento do usuário autenticado.
 */
@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

  /** Conversão segura de valores Prisma.Decimal | bigint | string para number */
  private toNumber(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (
      typeof value === 'object' &&
      value !== null &&
      'toNumber' in (value as Record<string, unknown>) &&
      typeof (value as any).toNumber === 'function'
    ) {
      return (value as any).toNumber();
    }
    const coerced = Number(value);
    return Number.isNaN(coerced) ? 0 : coerced;
  }

  /**
   * ====================================================================
   * MÉTODO: Consultar Próprio Perfil
   * ====================================================================
   *
   * Retorna os dados públicos e seguros do perfil do usuário autenticado.
   *
   * @param usuarioId - ID do usuário obtido via JWT (req.user.id)
   * @returns Objeto com os dados públicos do perfil
   */
  async meuPerfil(usuarioId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        // ====================================
        // CAMPOS DE IDENTIFICAÇÃO
        // ====================================
        id: true,
        nome: true,
        email: true,
        cpf: true,
        avatarUrl: true,

        // ====================================
        // CAMPOS DE AUTORIZAÇÃO
        // ====================================
        papel: true,
        status: true,

    // ====================================
    // CAMPOS DE GAMIFICAÇÃO
    // ====================================
    nivel: true,
    // Campos de saldo/ranking de gamificação foram descontinuados e não são retornados

        // ====================================
        // CAMPOS DE CONTATO
        // ====================================
        whatsapp: true,
        dataNascimento: true,

        // ====================================
        // CAMPOS DE PREFERÊNCIAS
        // ====================================
        mapeamentoPlanilhaSalvo: true,

        // ====================================
        // CAMPOS DE AUDITORIA
        // ====================================
        criadoEm: true,
        atualizadoEm: true,

        // ====================================
        // DADOS DA ÓTICA VINCULADA (NOVO)
        // ====================================
        optica: {
          select: {
            nome: true,
            cnpj: true,
          },
        },
      },
    });
  }

  /**
   * ====================================================================
   * MÉTODO: Atualizar Próprio Perfil
   * ====================================================================
   *
   * Atualiza os dados do perfil do usuário autenticado.
   *
   * @param usuarioId - ID do usuário obtido via JWT (req.user.id)
   * @param dto - Dados a serem atualizados (AtualizarPerfilDto)
   * @returns Perfil atualizado (mesmos campos do meuPerfil)
   */
  async atualizarMeuPerfil(usuarioId: string, dto: AtualizarPerfilDto) {
    // ====================================
    // CONSTRUIR OBJETO DE ATUALIZAÇÃO
    // ====================================
    const data: Prisma.UsuarioUpdateInput = {};

    if (dto.nome !== undefined) {
      data.nome = dto.nome;
    }

    if (dto.cpf !== undefined) {
      data.cpf = dto.cpf;
    }

    if (dto.whatsapp !== undefined) {
      data.whatsapp = dto.whatsapp;
    }

    if (dto.dataNascimento !== undefined) {
      data.dataNascimento = dto.dataNascimento ? new Date(dto.dataNascimento) : null;
    }

    if (dto.mapeamentoPlanilhaSalvo !== undefined) {
      data.mapeamentoPlanilhaSalvo = dto.mapeamentoPlanilhaSalvo;
    }

    // ====================================
    // EXECUTAR ATUALIZAÇÃO NO BANCO
    // ====================================
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: data,
      select: {
        // ====================================
        // RETORNAR OS MESMOS CAMPOS DO meuPerfil
        // ====================================
        id: true,
        nome: true,
        email: true,
        cpf: true,
        avatarUrl: true,
        papel: true,
        status: true,
  nivel: true,
        whatsapp: true,
        dataNascimento: true,
        mapeamentoPlanilhaSalvo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });
  }

  /**
   * ====================================================================
   * MÉTODO: Alterar Própria Senha (ATÔMICO)
   * ====================================================================
   *
   * Permite ao usuário alterar sua própria senha.
   *
   * @param usuarioId - ID do usuário obtido via JWT (req.user.id)
   * @param dto - Objeto contendo senhaAtual e novaSenha (AtualizarSenhaDto)
   * @returns Perfil atualizado (sem senhaHash)
   *
   * @throws UnauthorizedException - Se a senha atual estiver incorreta
   */
  async atualizarSenha(usuarioId: string, dto: AtualizarSenhaDto) {
    // ====================================
    // BUSCAR USUÁRIO COM SENHA ATUAL (FORA DA TRANSAÇÃO)
    // ====================================
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { senhaHash: true },
    });

    // ====================================
    // VALIDAR SENHA ATUAL (FORA DA TRANSAÇÃO)
    // ====================================
    const senhaValida = await bcrypt.compare(
      dto.senhaAtual,
      usuario.senhaHash,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('A senha atual está incorreta.');
    }

    // ====================================
    // HASHEAR NOVA SENHA
    // ====================================
    const novaSenhaHash = await bcrypt.hash(dto.novaSenha, 10);

    // ====================================
    // ATUALIZAR SENHA NO BANCO (DENTRO DA TRANSAÇÃO - Princípio 5.1)
    // ====================================
    return this.prisma.$transaction(async (tx) => {
      // 1. Atualizar senha (e outras futuras operações de escrita, ex: log de auditoria)
      const perfilAtualizado = await tx.usuario.update({
        where: { id: usuarioId },
        data: { senhaHash: novaSenhaHash },
        select: {
          // Retornar apenas campos seguros (sem senhaHash)
          id: true,
          nome: true,
          email: true,
          cpf: true,
          avatarUrl: true,
          papel: true,
          status: true,
          nivel: true,
          whatsapp: true,
          mapeamentoPlanilhaSalvo: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      });

      // 2. Se necessário, adicionar log de auditoria aqui dentro da transação (tx.logAutenticacao.create)

      return perfilAtualizado;
    });
  }

  /**
   * Retorna a visão 360º da equipe do gerente autenticado.
   */
  async minhaEquipeGerente(usuarioId: string) {
    const gerente = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        avatarUrl: true,
        whatsapp: true,
        dataNascimento: true,
        papel: true,
        status: true,
        nivel: true,
        saldoPontos: true,
        criadoEm: true,
        optica: {
          select: {
            id: true,
            nome: true,
            cnpj: true,
            cidade: true,
            estado: true,
            ehMatriz: true,
            rankingVisivelParaVendedores: true,
          },
        },
      },
    });

    if (!gerente || gerente.papel !== PapelUsuario.GERENTE) {
      throw new ForbiddenException(
        'Apenas gerentes podem consultar informações da equipe.',
      );
    }

    const vendedores = await this.prisma.usuario.findMany({
      where: { gerenteId: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        whatsapp: true,
        status: true,
        nivel: true,
        avatarUrl: true,
        saldoPontos: true,
        criadoEm: true,
        atualizadoEm: true,
        optica: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            estado: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    const statusGroup = await this.prisma.usuario.groupBy({
      by: ['status'],
      where: { gerenteId: usuarioId },
      _count: { _all: true },
    });

    const getStatusCount = (status: StatusUsuario) =>
      statusGroup.find((item) => item.status === status)?._count?._all ?? 0;

    const statusResumo = {
      ATIVO: getStatusCount(StatusUsuario.ATIVO),
      PENDENTE: getStatusCount(StatusUsuario.PENDENTE),
      BLOQUEADO: getStatusCount(StatusUsuario.BLOQUEADO),
    };

    const vendasEmAnalise = await this.prisma.envioVenda.count({
      where: {
        vendedor: { gerenteId: usuarioId },
        status: StatusEnvioVenda.EM_ANALISE,
      },
    });

    const comissaoPendente = await this.prisma.relatorioFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        usuarioId,
        tipo: 'GERENTE',
        status: 'PENDENTE',
      },
    });

    const cartelasPorVendedor = await this.prisma.cartelaConcluida.groupBy({
      by: ['vendedorId'],
      where: { vendedor: { gerenteId: usuarioId } },
      _count: { _all: true },
    });

    const pontosPorVendedor = await this.prisma.envioVenda.groupBy({
      by: ['vendedorId'],
      where: {
        vendedor: { gerenteId: usuarioId },
        status: StatusEnvioVenda.VALIDADO,
        numeroCartelaAtendida: { not: null },
        pontosAdicionadosAoSaldo: true,
      },
      _sum: {
        valorFinalComEvento: true,
        valorPontosReaisRecebido: true,
      },
    });

    const ultimaVendaPorVendedor = await this.prisma.envioVenda.groupBy({
      by: ['vendedorId'],
      where: {
        vendedor: { gerenteId: usuarioId },
        status: StatusEnvioVenda.VALIDADO,
      },
      _max: {
        dataVenda: true,
        dataValidacao: true,
        atualizadoEm: true,
      },
    });

    const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const vendasRecentesPorVendedor = await this.prisma.envioVenda.groupBy({
      by: ['vendedorId'],
      where: {
        vendedor: { gerenteId: usuarioId },
        status: StatusEnvioVenda.VALIDADO,
        OR: [
          { dataVenda: { gte: trintaDiasAtras } },
          { dataValidacao: { gte: trintaDiasAtras } },
        ],
      },
      _count: { _all: true },
    });

    const cartelasMap = new Map(
      cartelasPorVendedor.map((item) => [item.vendedorId, item._count._all]),
    );
    const pontosMap = new Map(
      pontosPorVendedor.map((item) => [item.vendedorId, item._sum]),
    );
    const ultimaVendaMap = new Map(
      ultimaVendaPorVendedor.map((item) => [item.vendedorId, item._max]),
    );
    const vendasRecentesMap = new Map(
      vendasRecentesPorVendedor.map((item) => [item.vendedorId, item._count]),
    );

    const equipeDetalhada = vendedores.map((vendedor) => {
      const pontos = pontosMap.get(vendedor.id);
      const ultimaVendaRaw = ultimaVendaMap.get(vendedor.id);
      const vendasRecentes = vendasRecentesMap.get(vendedor.id)?._all ?? 0;
      const cartelasConcluidas = cartelasMap.get(vendedor.id) ?? 0;

      const totalPontosCalculados =
        this.toNumber(pontos?.valorFinalComEvento) > 0
          ? this.toNumber(pontos?.valorFinalComEvento)
          : this.toNumber(pontos?.valorPontosReaisRecebido);

      const ultimaVenda = ultimaVendaRaw
        ? ultimaVendaRaw.dataVenda ??
          ultimaVendaRaw.dataValidacao ??
          ultimaVendaRaw.atualizadoEm ??
          null
        : null;

      return {
        id: vendedor.id,
        nome: vendedor.nome,
        email: vendedor.email,
        whatsapp: vendedor.whatsapp,
        status: vendedor.status,
        nivel: vendedor.nivel,
        avatarUrl: vendedor.avatarUrl,
        saldoPontos: this.toNumber(vendedor.saldoPontos),
        totalPontosReais: totalPontosCalculados,
        cartelasConcluidas,
        vendasUltimos30Dias: vendasRecentes,
        ultimaVenda,
        optica: vendedor.optica,
        criadoEm: vendedor.criadoEm,
      };
    });

    const totalPontosEquipe = equipeDetalhada.reduce(
      (acc, item) => acc + item.totalPontosReais,
      0,
    );
    const saldoEquipe = equipeDetalhada.reduce(
      (acc, item) => acc + item.saldoPontos,
      0,
    );
    const cartelasEquipeTotal = cartelasPorVendedor.reduce(
      (acc, item) => acc + item._count._all,
      0,
    );

    const equipeOrdenadaPorPontos = [...equipeDetalhada].sort(
      (a, b) => b.totalPontosReais - a.totalPontosReais,
    );
    const equipeOrdenadaPorEngajamento = [...equipeDetalhada].sort(
      (a, b) =>
        a.vendasUltimos30Dias - b.vendasUltimos30Dias ||
        a.totalPontosReais - b.totalPontosReais,
    );

    return {
      gerente: {
        ...gerente,
        saldoPontos: this.toNumber(gerente.saldoPontos),
      },
      overview: {
        totalVendedores: vendedores.length,
        ativos: statusResumo.ATIVO,
        pendentes: statusResumo.PENDENTE,
        bloqueados: statusResumo.BLOQUEADO,
        vendasEmAnalise,
        cartelasConcluidas: cartelasEquipeTotal,
        totalPontosEquipe,
        saldoEquipe,
        comissaoPendente: this.toNumber(comissaoPendente._sum.valor),
      },
      destaques: {
        topPerformer: equipeOrdenadaPorPontos[0] ?? null,
        precisaAtencao: equipeOrdenadaPorEngajamento[0] ?? null,
      },
      equipe: equipeDetalhada,
    };
  }
}