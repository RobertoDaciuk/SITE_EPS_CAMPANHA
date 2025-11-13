/**
 * ============================================================================
 * ENVIO VENDA SERVICE (REFATORADO - RBAC Polimórfico Otimizado)
 * ============================================================================
 * * Serviço robusto para gerenciamento de envios de venda.
 * Implementa lógica polimórfica de acesso (RBAC) e rotas de intervenção manual do Admin.
 * Integração transacional com o motor de recompensa via RecompensaService.
 * * REFATORAÇÃO (Q.I. 170 - Performance/Princípio 5.5):
 * - O método `listar` foi otimizado para o papel GERENTE, usando filtros
 * aninhados (`vendedor: { gerenteId: usuario.id }`) em vez de realizar uma
 * consulta separada para buscar IDs de equipe.
 * * @module EnvioVendaModule
 * ============================================================================
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarEnvioVendaDto } from './dto/criar-envio-venda.dto';
import { ListarEnviosFiltroDto } from './dto/listar-envios-filtro.dto';
import { RejeitarManualDto } from './dto/rejeitar-manual.dto';
import { StatusEnvioVenda, Prisma } from '@prisma/client';

// INTEGRAÇÃO MOTOR DE RECOMPENSA
import { RecompensaService } from '../recompensa/recompensa.service';

@Injectable()
export class EnvioVendaService {
  private readonly logger = new Logger(EnvioVendaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recompensaService: RecompensaService, // INJETADO
  ) {}

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (typeof value === 'object' && value !== null && 'toNumber' in value && typeof (value as any).toNumber === 'function') {
      return (value as any).toNumber();
    }
    const coerced = Number(value);
    return Number.isNaN(coerced) ? null : coerced;
  }

  /**
   * ============================================================================
   * CRIAR ENVIO (Vendedor submete número de pedido)
   * ============================================================================
   * * @param dto Dados do envio (numeroPedido, campanhaId, requisitoId)
   * @param vendedorId ID do vendedor autenticado (extraído do token JWT)
   * @returns EnvioVenda criado com status EM_ANALISE
   * @throws BadRequestException se número de pedido já foi submetido pelo vendedor
   */
  async criar(dto: CriarEnvioVendaDto, vendedorId: string) {
    this.logger.log(
      `[CRIAR_ENVIO] Vendedor ${vendedorId} submetendo pedido ${dto.numeroPedido} para campanha ${dto.campanhaId}, requisito ${dto.requisitoId}`,
    );

    // ========================================
    // VALIDAÇÃO 1: DUPLICATA (Sprint 16.3)
    // ========================================
    this.logger.log(
      `[DUPLICATA] Verificando duplicidade para Pedido: ${dto.numeroPedido}, Vendedor: ${vendedorId}, Campanha: ${dto.campanhaId}`,
    );

    const envioExistente = await this.prisma.envioVenda.findFirst({
      where: {
        numeroPedido: dto.numeroPedido,
        vendedorId: vendedorId,
        campanhaId: dto.campanhaId,
      },
    });

    if (envioExistente) {
      this.logger.warn(
        `[DUPLICATA] Tentativa de submissão duplicada detectada! Pedido: ${dto.numeroPedido}, Vendedor: ${vendedorId}, Envio Existente: ${envioExistente.id}`,
      );

      throw new BadRequestException(
        'Você já submeteu este número de pedido nesta campanha.',
      );
    }

    this.logger.log(
      '[DUPLICATA] Nenhuma duplicidade encontrada, prosseguindo com a criação.',
    );

    // ========================================
    // CRIAÇÃO DO ENVIO (Status: EM_ANALISE)
    // ========================================
    const envio = await this.prisma.envioVenda.create({
      data: {
        numeroPedido: dto.numeroPedido,
        vendedorId,
        campanhaId: dto.campanhaId,
        requisitoId: dto.requisitoId,
      },
    });

    this.logger.log(
      `[CRIAR_ENVIO] Envio ${envio.id} criado com sucesso. Status: EM_ANALISE`,
    );

    return envio;
  }

  /**
   * ============================================================================
   * LISTAR ENVIOS (Polimórfico: Admin, Gerente, Vendedor)
   * ============================================================================
   * * Rota polimórfica de listagem de envios com controle de acesso baseado em papel.
   * * @param usuario Objeto {id, papel} do usuário autenticado
   * @param filtros Filtros opcionais de query string
   * @returns Lista de envios de acordo com permissões
   */
  async listar(
    usuario: { id: string; papel: string },
    filtros: ListarEnviosFiltroDto,
  ) {
    const where: Prisma.EnvioVendaWhereInput = {};

    // Filtros opcionais
    if (filtros.status) where.status = filtros.status;
    if (filtros.campanhaId) where.campanhaId = filtros.campanhaId;

    if (usuario.papel === 'VENDEDOR') {
      // Vendedor só pode ver os próprios envios (Princípio 5.5)
      where.vendedorId = usuario.id;

      if (process.env.NODE_ENV === 'development') {
        this.logger.log(`[LISTAR] Vendedor ${usuario.id} listando seus próprios envios`);
      }
    } else if (usuario.papel === 'GERENTE') {
      // ========================================
      // VALIDAÇÃO DE SUBORDINAÇÃO (Fase 2 - Princípio 5.5)
      // ========================================
      // Se Gerente fornece vendedorId específico, valida que é subordinado
      if (filtros.vendedorId) {
        const vendedor = await this.prisma.usuario.findUnique({
          where: { id: filtros.vendedorId },
          select: { id: true, nome: true, gerenteId: true },
        });

        if (!vendedor) {
          throw new NotFoundException(
            `Vendedor com ID ${filtros.vendedorId} não encontrado.`,
          );
        }

        if (vendedor.gerenteId !== usuario.id) {
          if (process.env.NODE_ENV === 'development') {
            this.logger.warn(
              `[LISTAR] TENTATIVA DE ACESSO NEGADA! Gerente ${usuario.id} tentou acessar vendedor ${filtros.vendedorId} que não é seu subordinado (gerenteId: ${vendedor.gerenteId})`,
            );
          }
          throw new ForbiddenException(
            'Você não tem permissão para visualizar envios deste vendedor.',
          );
        }

        // Se validação passou, aplica filtro de vendedor específico
        where.vendedorId = filtros.vendedorId;

        if (process.env.NODE_ENV === 'development') {
          this.logger.log(
            `[LISTAR] Gerente ${usuario.id} listando envios do subordinado ${filtros.vendedorId} (${vendedor.nome})`,
          );
        }
      } else {
        // Sem filtro de vendedor específico: mostra todos os subordinados
        where.vendedor = {
          gerenteId: usuario.id,
        };

        if (process.env.NODE_ENV === 'development') {
          this.logger.log(
            `[LISTAR] Gerente ${usuario.id} listando envios de TODOS os subordinados`,
          );
        }
      }
    } else {
      // Admin vê tudo, aplica filtro vendedorId se fornecido
      if (filtros.vendedorId) {
        where.vendedorId = filtros.vendedorId;
      }

      if (process.env.NODE_ENV === 'development') {
        this.logger.log(`[LISTAR] Admin listando envios com filtros:`, filtros);
      }
    }

    return this.prisma.envioVenda.findMany({
      where,
      include: {
        vendedor: { select: { id: true, nome: true, email: true } },
        requisito: { select: { id: true, descricao: true } },
      },
    });
  }

  /**
   * ============================================================================
   * LISTAR MINHAS SUBMISSÕES (Vendedor - Nova Rota)
   * ============================================================================
   * * @param vendedorId ID do vendedor autenticado (extraído do token JWT)
   * @param campanhaId ID da campanha (obrigatório, validado por DTO)
   * @returns Lista de envios do vendedor para a campanha especificada
   */
  async listarMinhasPorCampanha(vendedorId: string, campanhaId: string) {
    this.logger.log(
      `[listarMinhasPorCampanha] Vendedor ${vendedorId} buscando envios da campanha ${campanhaId}`,
    );

    // ========================================
    // QUERY PRISMA COM FILTROS DE SEGURANÇA (Princípio 5.5)
    // ========================================
    const envios = await this.prisma.envioVenda.findMany({
      where: {
        // Data Tenancy: Sempre filtra pelo vendedor autenticado
        vendedorId: vendedorId,
        // Filtro obrigatório: Apenas envios da campanha solicitada
        campanhaId: campanhaId,
      },
      select: {
        // Campos necessários para exibição na UI
        id: true,
        numeroPedido: true,
        status: true,
        dataEnvio: true,
        dataValidacao: true,
        motivoRejeicao: true,
        motivoRejeicaoVendedor: true, // Mensagem formal para vendedor
        requisitoId: true,
        numeroCartelaAtendida: true,
        valorPontosReaisRecebido: true,
        valorFinalComEvento: true,
        multiplicadorAplicado: true,
        pontosAdicionadosAoSaldo: true,
        pontosLiquidados: true,
      },
      orderBy: {
        // Envios mais recentes primeiro
        dataEnvio: 'desc',
      },
    });

    return envios.map((envio) => {
      const valorOriginal = this.toNumberOrNull(envio.valorPontosReaisRecebido);
      const valorFinal = this.toNumberOrNull(envio.valorFinalComEvento);
      const multiplicador = this.toNumberOrNull(envio.multiplicadorAplicado);

      return {
        ...envio,
        valorPontosReaisRecebido: valorOriginal,
        valorFinalComEvento: valorFinal,
        multiplicadorAplicado: multiplicador ?? 1,
      };
    });
  }

  /**
   * ============================================================================
   * VALIDAR MANUALMENTE (Admin Only)
   * ============================================================================
   * * @param envioId ID do envio a ser validado
   * @returns EnvioVenda atualizado
   * @throws NotFoundException se envio não existir
   * @throws BadRequestException se envio não estiver EM_ANALISE
   */
  async validarManual(envioId: string) {
    /**
     * Passo 1 - Hidratação profunda do envio, vendedor, gerente, requisito, campanha.
     */
    const envio = await this.prisma.envioVenda.findUnique({
      where: { id: envioId },
      include: {
        vendedor: { include: { gerente: true } },
        requisito: {
          include: {
            regraCartela: { include: { campanha: true } },
          },
        },
      },
    });

    if (!envio) throw new NotFoundException('Envio não encontrado.');

    /**
     * Passo 2 - Transação para garantir atomicidade de todas as operações
     */
    return this.prisma.$transaction(async (tx) => {
      // -----------------------------------------------------------------------
      // CÁLCULO SPILLOVER (Lógica de Alocação de Cartela)
      // -----------------------------------------------------------------------

      // PASSO 2A: Buscar todos os requisitos relacionados (mesma ordem)
      const requisitosRelacionados = await tx.requisitoCartela.findMany({
        where: {
          ordem: envio.requisito.ordem, // ✅ Mesma ordem = mesmo requisito lógico
          regraCartela: {
            campanhaId: envio.campanhaId, // ✅ Mesma campanha
          },
        },
        select: {
          id: true,
        },
      });

      const idsRequisitosRelacionados = requisitosRelacionados.map((r) => r.id);

      this.logger.log(
        `[SPILLOVER] Requisito ordem ${envio.requisito.ordem}: IDs relacionados = ${idsRequisitosRelacionados.join(', ')}`,
      );

      // PASSO 2B: Contar validados de TODOS os requisitos relacionados
      const countValidado = await tx.envioVenda.count({
        where: {
          vendedorId: envio.vendedorId,
          requisitoId: { in: idsRequisitosRelacionados }, // ✅ CORRIGIDO: Conta TODOS
          status: StatusEnvioVenda.VALIDADO,
        },
      });

      const quantidadeRequisito = envio.requisito.quantidade;
      const numeroCartela = Math.floor(countValidado / quantidadeRequisito) + 1; // Lógica de Spillover

      this.logger.log(
        `[ADMIN] Validação manual do envio ${envioId}: countValidado=${countValidado}, quantidade=${quantidadeRequisito}, numeroCartelaAtendida=${numeroCartela}`,
      );

      // Atualiza envio (status, spillover/cartela, data, etc.)
      const envioAtualizado = await tx.envioVenda.update({
        where: { id: envioId },
        data: {
          status: StatusEnvioVenda.VALIDADO,
          numeroCartelaAtendida: numeroCartela,
          dataValidacao: new Date(),
          motivoRejeicao: null,
          infoConflito: null,
        },
      });

      // PASSO DE GATILHO: Dispara o motor de recompensa de forma transacional
      const campanha = envio.requisito.regraCartela.campanha;
      const vendedor = envio.vendedor;

      await this.recompensaService.processarGatilhos(
        tx,
        envioAtualizado,
        campanha,
        vendedor,
      );

      return envioAtualizado; // Retorna envio atualizado
    });
  }

  /**
   * ============================================================================
   * REJEITAR MANUALMENTE (Admin Only)
   * ============================================================================
   * * @param envioId ID do envio a ser rejeitado
   * @param dto DTO contendo motivoRejeicao
   * @returns EnvioVenda atualizado
   * @throws NotFoundException se envio não existir
   */
  async rejeitarManual(envioId: string, dto: RejeitarManualDto) {
    const envio = await this.prisma.envioVenda.findUnique({
      where: { id: envioId },
    });

    if (!envio) throw new NotFoundException('Envio não encontrado.');

    this.logger.log(
      `[ADMIN] Rejeição manual do envio ${envioId} pelo motivo: ${dto.motivoRejeicao}`,
    );

    return this.prisma.envioVenda.update({
      where: { id: envioId },
      data: {
        status: StatusEnvioVenda.REJEITADO,
        motivoRejeicao: dto.motivoRejeicao,
        numeroCartelaAtendida: null,
        dataValidacao: new Date(),
        infoConflito: null,
      },
    });
  }
}