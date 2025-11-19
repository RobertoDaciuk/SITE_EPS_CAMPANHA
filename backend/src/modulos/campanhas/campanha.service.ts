/**
 * ============================================================================
 * CAMPANHA SERVICE - Lógica de Negócio do Módulo de Campanhas (REFATORADO)
 * ============================================================================
 * * Descrição:
 * Serviço responsável por toda a lógica de gerenciamento de campanhas.
 * * REFATORAÇÃO (Q.I. 170):
 * - NOVO: Validação manual de unicidade do campo `ordem` dentro de cada cartela
 * no método `criar` (Princípio 1 - Integridade Lógica Crítica).
 * - CORRIGIDO: O método `remover` agora recebe e usa o contexto do `usuario`
 * logado para verificar a existência da campanha através do método seguro
 * `buscarPorId(id, usuario)` (Princípio 5.5 - Isolamento de Dados).
 * * Complexidade:
 * - Transações atômicas (garantia de integridade)
 * - Dados profundamente aninhados (4 níveis de hierarquia)
 * * @module CampanhasModule
 * ============================================================================
 */

import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarCampanhaDto } from './dto/criar-campanha.dto';
import { AtualizarCampanhaDto } from './dto/atualizar-campanha.dto';
import { Campanha, Prisma, PapelUsuario, StatusEnvioVenda } from '@prisma/client';

/**
 * Serviço de gerenciamento de campanhas.
 */
@Injectable()
export class CampanhaService {
  /**
   * Logger dedicado para rastrear operações do módulo de campanhas.
   */
  private readonly logger = new Logger(CampanhaService.name);

  /**
   * Construtor do serviço.
   * * @param prisma - Serviço Prisma para acesso ao banco de dados
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma campanha completa com toda sua estrutura aninhada.
   * * @param dto - Dados completos da campanha (aninhados)
   * @param usuario - Dados do admin criando (opcional, para histórico)
   * @returns Campanha criada
   * * @throws {BadRequestException} Se datas inválidas, IDs de Ótica inválidos,
   * ou se a regra de negócio da `ordem` (unicidade dentro da cartela) for violada.
   */
  async criar(dto: CriarCampanhaDto, usuario?: { id: string }): Promise<Campanha> {
    this.logger.log(`Criando campanha: ${dto.titulo}`);

    /**
     * Validação de Datas (Pre-check)
     */
    const dataInicio = new Date(dto.dataInicio);
    const dataFim = new Date(dto.dataFim);

    if (dataFim <= dataInicio) {
      throw new BadRequestException(
        'A data de término deve ser posterior à data de início',
      );
    }

    /**
     * VALIDAÇÃO DE NEGÓCIO CRÍTICA (Princípio 1 - Unicidade de Ordem)
     * * Garante que o campo `ordem` seja único dentro de cada array de requisitos
     * de UMA ÚNICA cartela.
     */
    for (const cartelaDto of dto.cartelas) {
      const ordensEncontradas = new Set<number>();
      for (const requisitoDto of cartelaDto.requisitos) {
        if (ordensEncontradas.has(requisitoDto.ordem)) {
          throw new BadRequestException(
            `A Cartela ${cartelaDto.numeroCartela} possui requisitos com a Ordem (${requisitoDto.ordem}) duplicada. A Ordem deve ser única dentro da mesma cartela.`,
          );
        }
        ordensEncontradas.add(requisitoDto.ordem);
      }
    }

    /**
     * Transação atômica.
     */
    return this.prisma.$transaction(async (tx) => {
      // Construir objeto de dados da campanha
      const dadosCampanha: Prisma.CampanhaCreateInput = {
        titulo: dto.titulo,
        descricao: dto.descricao,
        dataInicio,
        dataFim,
  // Campo `moedinhasPorCartela` removido do schema (moedinhas descontinuadas).
        pontosReaisMaximo: dto.pontosReaisMaximo,
        percentualGerente: dto.percentualGerente,
        status: 'ATIVA',
        paraTodasOticas: dto.paraTodasOticas ?? false, // Default false se omitido
        tipoPedido: dto.tipoPedido ?? 'OS_OP_EPS', // Default OS_OP_EPS
        regras: dto.regras,
        // planilhaProdutosUrl removido (Sprint 21): produtos agora são sempre por requisito
        imagemCampanha16x9Url: dto.imagemCampanha16x9Url,
        imagemCampanha1x1Url: dto.imagemCampanha1x1Url,
      };

      // -----------------------------------------------------------------------
      // Validar e conectar Óticas Alvo (Targeting)
      // -----------------------------------------------------------------------
      if (!dadosCampanha.paraTodasOticas && dto.oticasAlvoIds && dto.oticasAlvoIds.length > 0) {
        // Validação: Verificar se todos os IDs de Ótica existem e estão ativos
        const countOticas = await tx.optica.count({ // Usar tx para consistência
          where: { id: { in: dto.oticasAlvoIds }, ativa: true },
        });

        if (countOticas !== dto.oticasAlvoIds.length) {
          throw new BadRequestException(
            'Um ou mais IDs de Óticas Alvo são inválidos ou inativos.',
          );
        }

        // Conectar óticas via relação muitos-para-muitos
        dadosCampanha.oticasAlvo = {
          connect: dto.oticasAlvoIds.map(id => ({ id })),
        };

        this.logger.log(`Campanha direcionada para ${dto.oticasAlvoIds.length} ótica(s) específica(s).`);
      } else if (dadosCampanha.paraTodasOticas) {
        this.logger.log(`Campanha criada para TODAS as óticas (paraTodasOticas=true).`);
      }

      const campanha = await tx.campanha.create({ data: dadosCampanha });

      this.logger.log(`Campanha base criada: ${campanha.id}`);

      /**
       * PASSO 1.5: REMOVIDO - Produtos Globais (Sprint 21)
       *
       * Produtos agora são SEMPRE por requisito (cartelas[].requisitos[].produtos).
       * A lógica de produtos globais foi completamente removida.
       * Para compatibilidade com campanhas antigas, a tabela produtos_campanha ainda existe,
       * mas novas campanhas NÃO devem criar produtos globais.
       */

      /**
       * PASSO 2, 3 e 4: Criar Cartelas, Requisitos e Condições (Loop Aninhado)
       */
      for (const cartelaDto of dto.cartelas) {
        this.logger.log(
          `Criando cartela ${cartelaDto.numeroCartela} para campanha ${campanha.id}`,
        );

        const regraCartela = await tx.regraCartela.create({
          data: {
            numeroCartela: cartelaDto.numeroCartela,
            descricao: cartelaDto.descricao,
            campanhaId: campanha.id,
          },
        });

        for (const requisitoDto of cartelaDto.requisitos) {
          this.logger.log(
            `Criando requisito "${requisitoDto.descricao}" (ordem ${requisitoDto.ordem}) para cartela ${regraCartela.numeroCartela}`,
          );

          const requisito = await tx.requisitoCartela.create({
            data: {
              descricao: requisitoDto.descricao,
              quantidade: requisitoDto.quantidade,
              tipoUnidade: requisitoDto.tipoUnidade,
              ordem: requisitoDto.ordem,
              regraCartelaId: regraCartela.id,
            },
          });

          // =====================================================================
          // NOVO (Sprint 21): Criar Produtos do Requisito
          // =====================================================================
          if (requisitoDto.importSessionId) {
            // OPÇÃO 1: Importar do staging via INSERT SELECT (otimizado para 10k+ produtos)
            this.logger.log(
              `Importando produtos do staging (sessionId: ${requisitoDto.importSessionId}) para requisito ${requisito.id}`,
            );

            await tx.$executeRaw`
              INSERT INTO "produtos_requisitos" ("id", "requisitoId", "codigoRef", "pontosReais", "criadoEm")
              SELECT
                gen_random_uuid(),
                ${requisito.id}::uuid,
                "codigoRef",
                "pontosReais",
                NOW()
              FROM "product_import_staging"
              WHERE "sessionId" = ${requisitoDto.importSessionId}
            `;

            // Contar quantos foram importados
            const countImportados = await tx.produtoRequisito.count({
              where: { requisitoId: requisito.id },
            });

            this.logger.log(`✅ ${countImportados} produto(s) importado(s) para requisito ${requisito.id}`);

            // Limpar staging após sucesso
            await tx.productImportStaging.deleteMany({
              where: { sessionId: requisitoDto.importSessionId },
            });

            this.logger.log(`🧹 Staging limpo (sessionId: ${requisitoDto.importSessionId})`);
          } else if (requisitoDto.produtos && requisitoDto.produtos.length > 0) {
            // OPÇÃO 2: Importação direta via array (para poucos produtos)
            this.logger.log(
              `Criando ${requisitoDto.produtos.length} produto(s) para requisito ${requisito.id}`,
            );

            await tx.produtoRequisito.createMany({
              data: requisitoDto.produtos.map((produto) => ({
                requisitoId: requisito.id,
                codigoRef: produto.codigoRef,
                pontosReais: produto.pontosReais,
              })),
            });

            this.logger.log(`✅ ${requisitoDto.produtos.length} produto(s) criado(s) para requisito`);
          }

          // =====================================================================
          // Criar Condições (DEPRECADO - mantido para compatibilidade)
          // =====================================================================
          if (requisitoDto.condicoes && requisitoDto.condicoes.length > 0) {
            for (const condicaoDto of requisitoDto.condicoes) {
              this.logger.log(
                `[DEPRECADO] Criando condição ${condicaoDto.campo} ${condicaoDto.operador} "${condicaoDto.valor}" para requisito ${requisito.id}`,
              );

              await tx.condicaoRequisito.create({
                data: {
                  campo: condicaoDto.campo,
                  operador: condicaoDto.operador,
                  valor: condicaoDto.valor,
                  requisitoId: requisito.id,
                },
              });
            }
          }
        }
      }

      /**
       * PASSO 5: Criar Eventos Especiais (se houver)
       */
      if (dto.eventosEspeciais && dto.eventosEspeciais.length > 0) {
        this.logger.log(
          `Criando ${dto.eventosEspeciais.length} evento(s) especial(is) para campanha ${campanha.id}`,
        );

        for (const eventoDto of dto.eventosEspeciais) {
          this.logger.log(
            `Criando evento especial "${eventoDto.nome}" (${eventoDto.multiplicador}x) de ${eventoDto.dataInicio} até ${eventoDto.dataFim}`,
          );

          await tx.eventoEspecial.create({
            data: {
              nome: eventoDto.nome,
              descricao: eventoDto.descricao || '',
              multiplicador: eventoDto.multiplicador,
              dataInicio: new Date(eventoDto.dataInicio),
              dataFim: new Date(eventoDto.dataFim),
              ativo: eventoDto.ativo ?? true,
              corDestaque: eventoDto.corDestaque || '#FF5733',
              campanhaId: campanha.id,
            },
          });
        }
      }

      this.logger.log(
        `✅ Campanha "${campanha.titulo}" criada com sucesso (ID: ${campanha.id})`,
      );

      // Registrar criação no histórico (Sprint 19.5)
      if (usuario?.id) {
        // Contar produtos de todos os requisitos (Sprint 21)
        const totalProdutos = dto.cartelas.reduce((acc, cartela) =>
          acc + cartela.requisitos.reduce((reqAcc, req) =>
            reqAcc + (req.produtos?.length || 0), 0), 0);

        await tx.historicoCampanha.create({
          data: {
            campanhaId: campanha.id,
            adminId: usuario.id,
            tipo: 'CRIACAO',
            alteracoes: {
              titulo: campanha.titulo,
              descricao: campanha.descricao,
              totalCartelas: dto.cartelas.length,
              totalProdutos,
              totalEventos: dto.eventosEspeciais?.length || 0,
            },
          },
        });
      }

      return campanha;
    });
  }

  /**
   * Lista campanhas visíveis para o usuário logado.
   *
   * @param usuario - Dados do usuário logado (id, papel, opticaId)
   * @returns Array de campanhas
   */
  async listar(usuario: { id: string; papel: PapelUsuario; opticaId?: string | null }): Promise<Campanha[]> {
    this.logger.log(`Listando campanhas para usuário: ${usuario.id} (${usuario.papel})`);

    // Construir filtro where baseado no usuário
    // CORRIGIDO: Removido filtro hardcoded status: 'ATIVA' para permitir listar todas as campanhas
    // O frontend agora é responsável por filtrar por status (ATIVA, CONCLUIDA, FUTURA, etc.)
    const where: Prisma.CampanhaWhereInput = {};

    // Admin vê tudo
    if (usuario.papel !== PapelUsuario.ADMIN) {
      const condicoesVisibilidade: Prisma.CampanhaWhereInput[] = [
        { paraTodasOticas: true }, // Condição 1: Campanha para todos
      ];

      if (usuario.opticaId) {
        // Buscar a ótica do usuário e seu matrizId
        const opticaUsuario = await this.prisma.optica.findUnique({
          where: { id: usuario.opticaId },
          select: { id: true, matrizId: true },
        });

        if (opticaUsuario) {
          // Condição 2: Campanha direcionada para a Ótica do usuário
          condicoesVisibilidade.push({
            oticasAlvo: { some: { id: opticaUsuario.id } },
          });

          // Condição 3: Campanha direcionada para a Matriz do usuário
          if (opticaUsuario.matrizId) {
            condicoesVisibilidade.push({
              oticasAlvo: { some: { id: opticaUsuario.matrizId } },
            });
          }
        }
      }

      where.OR = condicoesVisibilidade;
    }

    const agoraUtc = new Date();
    const campanhas = await this.prisma.campanha.findMany({
      where,
      orderBy: { dataInicio: 'desc' },
      include: {
        eventosEspeciais: {
          where: {
            ativo: true,
            dataInicio: { lte: agoraUtc },
            dataFim: { gte: agoraUtc },
          },
          select: {
            id: true,
            nome: true,
            multiplicador: true,
            dataInicio: true,
            dataFim: true,
            corDestaque: true,
          },
        },
      },
    });

    this.logger.log(`📋 ${campanhas.length} campanha(s) encontrada(s) para usuário ${usuario.id}`);

    return campanhas;
  }

  /**
   * Retorna dados de analytics agregados para uma campanha.
   */
  async analytics(
    id: string,
    usuario?: { id: string; papel: PapelUsuario; opticaId?: string | null },
  ) {
    // Garante acesso e obtém dados da campanha (inclui moedinhas/pontos)
    const campanha = await this.buscarPorId(id, usuario);

    // Totais por status
    const [
      totalEnvios,
      totalValidados,
      totalRejeitados,
      totalEmAnalise,
      totalConflito,
      enviosDetalhados,
    ] = await Promise.all([
      this.prisma.envioVenda.count({ where: { campanhaId: id } }),
      this.prisma.envioVenda.count({ where: { campanhaId: id, status: 'VALIDADO' } as any }),
      this.prisma.envioVenda.count({ where: { campanhaId: id, status: 'REJEITADO' } as any }),
      this.prisma.envioVenda.count({ where: { campanhaId: id, status: 'EM_ANALISE' } as any }),
      this.prisma.envioVenda.count({ where: { campanhaId: id, status: 'CONFLITO_MANUAL' } as any }),
      this.prisma.envioVenda.findMany({
        where: { campanhaId: id },
        orderBy: { dataEnvio: 'desc' },
        take: 200,
        select: {
          id: true,
          numeroPedido: true,
          status: true,
          dataEnvio: true,
          dataValidacao: true,
          numeroCartelaAtendida: true,
          motivoRejeicao: true,
          motivoRejeicaoVendedor: true, // Mensagem formal para vendedor
          infoConflito: true,
          valorPontosReaisRecebido: true,
          codigoReferenciaUsado: true,
          multiplicadorAplicado: true, // CRÍTICO: Multiplicador de evento (1x, 2x, 3x)
          valorFinalComEvento: true, // CRÍTICO: Valor com multiplicador aplicado
          pontosAdicionadosAoSaldo: true, // Indica se pontos já foram adicionados ao saldo
          vendedor: { select: { id: true, nome: true, email: true } },
        },
      }),
    ]);

    // Totais monetários/virtuais
    // Funcionalidade de moedinhas descontinuada: manter totalMoedinhasDistribuidas = 0
    const totalMoedinhasDistribuidas = 0;
    
    // CORRIGIDO: Soma os valores FINAIS com eventos (valorFinalComEvento) para refletir o total real distribuído
    // Usa valorFinalComEvento quando disponível, senão usa valorPontosReaisRecebido (fallback)
    const totalPontosReaisDistribuidos = enviosDetalhados
      .filter(e => e.status === 'VALIDADO')
      .reduce((acc, e: any) => {
        const valorFinal = Number(e.valorFinalComEvento || e.valorPontosReaisRecebido || 0);
        return acc + valorFinal;
      }, 0);
    const taxaConversao = totalEnvios > 0 ? (totalValidados / totalEnvios) * 100 : 0;

    // Ranking por vendedor
    const rankingMap = new Map<string, any>();
    for (const e of enviosDetalhados) {
      const key = e.vendedor.id;
      if (!rankingMap.has(key)) {
        rankingMap.set(key, {
          vendedorId: e.vendedor.id,
          nomeVendedor: e.vendedor.nome,
          emailVendedor: e.vendedor.email,
          totalEnvios: 0,
          totalValidados: 0,
          totalRejeitados: 0,
          totalEmAnalise: 0,
          totalConflito: 0,
          totalMoedinhasGanhas: 0,
          totalPontosReaisGanhos: 0,
        });
      }
      const r = rankingMap.get(key);
      r.totalEnvios += 1;
      switch (e.status) {
        case 'VALIDADO':
          r.totalValidados += 1;
          // CORRIGIDO: Soma valorFinalComEvento (com multiplicador) em vez de apenas valorPontosReaisRecebido
          // Isso garante que o ranking reflita os valores reais ganhos pelos vendedores (com bônus de eventos)
          const valorComEvento = Number((e as any).valorFinalComEvento || (e as any).valorPontosReaisRecebido || 0);
          r.totalPontosReaisGanhos += valorComEvento;
          break;
        case 'REJEITADO':
          r.totalRejeitados += 1;
          break;
        case 'EM_ANALISE':
          r.totalEmAnalise += 1;
          break;
        case 'CONFLITO_MANUAL':
          r.totalConflito += 1;
          break;
      }
    }
    // Ordena por total de Pontos Reais ganhos (R$)
    const rankingVendedores = Array.from(rankingMap.values()).sort(
      (a, b) => b.totalPontosReaisGanhos - a.totalPontosReaisGanhos,
    );

    // Evolução temporal (por dia)
    const evolMap = new Map<string, { data: string; totalEnvios: number; totalValidados: number }>();
    for (const e of enviosDetalhados) {
      const d = new Date(e.dataEnvio);
      const dia = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        .toISOString()
        .slice(0, 10);
      if (!evolMap.has(dia)) {
        evolMap.set(dia, { data: dia, totalEnvios: 0, totalValidados: 0 });
      }
      const it = evolMap.get(dia)!;
      it.totalEnvios += 1;
      if (e.status === 'VALIDADO') it.totalValidados += 1;
    }
    const evolucaoTemporal = Array.from(evolMap.values()).sort((a, b) => a.data.localeCompare(b.data));

    // Monta resposta
    return {
      totalEnvios,
      totalValidados,
      totalRejeitados,
      totalEmAnalise,
      totalConflito,
      taxaConversao,
      totalMoedinhasDistribuidas,
      totalPontosReaisDistribuidos,
      rankingVendedores,
      evolucaoTemporal,
      envios: enviosDetalhados.map((e) => ({
        id: e.id,
        numeroPedido: e.numeroPedido,
        status: e.status,
        dataEnvio: e.dataEnvio,
        dataValidacao: e.dataValidacao,
        vendedor: e.vendedor,
        numeroCartelaAtendida: e.numeroCartelaAtendida,
        motivoRejeicao: e.motivoRejeicao,
        motivoRejeicaoVendedor: (e as any).motivoRejeicaoVendedor, // CORRIGIDO: Retornar mensagem para vendedor
        infoConflito: e.infoConflito,
        dadosValidacao: null,
        valorPontosReaisRecebido: (e as any).valorPontosReaisRecebido, // CORRIGIDO: Incluir valor base
        codigoReferenciaUsado: (e as any).codigoReferenciaUsado, // CORRIGIDO: Incluir código de referência
        multiplicadorAplicado: (e as any).multiplicadorAplicado, // CORRIGIDO: Incluir multiplicador (1x, 2x, 3x)
        valorFinalComEvento: (e as any).valorFinalComEvento, // CORRIGIDO: Incluir valor com multiplicador
        pontosAdicionadosAoSaldo: (e as any).pontosAdicionadosAoSaldo, // CORRIGIDO: Incluir flag de adição ao saldo
      })),
    };
  }

  /**
   * Busca uma campanha específica pelo ID com dados aninhados completos.
   *
   * @param id - UUID da campanha
   * @param usuario - Dados do usuário logado (opcional para chamadas internas)
   * @returns Campanha com dados aninhados
   *
   * @throws {NotFoundException} Se campanha não encontrada ou não acessível
   */
  async buscarPorId(
    id: string,
    usuario?: { id: string; papel: PapelUsuario; opticaId?: string | null },
  ) {
    this.logger.log(`Buscando campanha por ID: ${id}${usuario ? ` (usuário: ${usuario.id})` : ' (chamada interna)'}`);

    const campanha = await this.prisma.campanha.findUnique({
      where: { id },
      include: {
        cartelas: {
          orderBy: { numeroCartela: 'asc' },
          include: {
            requisitos: {
              orderBy: { ordem: 'asc' },
              include: {
                condicoes: true,
                produtos: true, // Sprint 21: Incluir produtos do requisito
              },
            },
          },
        },
        oticasAlvo: {
          select: { id: true, nome: true },
        },
        eventosEspeciais: true,
        // produtosCampanha removido (Sprint 21): produtos apenas por requisito
      },
    });

    if (!campanha) {
      this.logger.warn(`Campanha não encontrada: ${id}`);
      throw new NotFoundException(`Campanha com ID ${id} não encontrada`);
    }

    // -----------------------------------------------------------------------
    // Verificação de Acesso (Segurança - Princípio 5.5)
    // -----------------------------------------------------------------------
    if (usuario && usuario.papel !== PapelUsuario.ADMIN) {
      let podeVer = campanha.paraTodasOticas; // Verifica se é para todos

      if (!podeVer && usuario.opticaId) {
        // Verifica se está no alvo direto
        if (campanha.oticasAlvo.some(otica => otica.id === usuario.opticaId)) {
          podeVer = true;
        } else {
          // Verifica se está no alvo da matriz
          const opticaUsuario = await this.prisma.optica.findUnique({
            where: { id: usuario.opticaId },
            select: { matrizId: true },
          });
          if (
            opticaUsuario?.matrizId &&
            campanha.oticasAlvo.some(otica => otica.id === opticaUsuario.matrizId)
          ) {
            podeVer = true;
          }
        }
      }

      if (!podeVer) {
        this.logger.warn(`Usuário ${usuario.id} tentou acessar campanha restrita ${id}.`);
        throw new NotFoundException(
          `Campanha com ID ${id} não encontrada ou não acessível.`,
        ); // Retorna 404 por segurança
      }
    }

    return campanha;
  }

  async buscarPorIdParaVendedorView(
    id: string,
    usuario?: { id: string; papel: PapelUsuario; opticaId?: string | null },
  ) {
    const campanhaCompleta = await this.buscarPorId(id, usuario);

    if (!usuario || usuario.papel !== PapelUsuario.VENDEDOR) {
      return campanhaCompleta;
    }

  const cartelasDaCampanha = campanhaCompleta.cartelas ?? [];
  const totalCartelasDefinidas = cartelasDaCampanha.length;

    if (totalCartelasDefinidas === 0) {
      return {
        ...campanhaCompleta,
        metaVendedor: {
          totalCartelasDefinidas: 0,
          totalCartelasVisiveis: 0,
          totalCartelasConcluidas: 0,
          limiteCartelas: 0,
        },
      };
    }

    const [cartelasConcluidasDoVendedor, maxCartelaValidada] = await Promise.all([
      this.prisma.cartelaConcluida.findMany({
        where: {
          campanhaId: id,
          vendedorId: usuario.id,
        },
        select: { numeroCartela: true },
      }),
      this.prisma.envioVenda.aggregate({
        where: {
          campanhaId: id,
          vendedorId: usuario.id,
          status: StatusEnvioVenda.VALIDADO,
          numeroCartelaAtendida: { not: null },
        },
        _max: { numeroCartelaAtendida: true },
      }),
    ]);

    const totalCartelasConcluidas = cartelasConcluidasDoVendedor.length;
    const maiorCartelaValidada = maxCartelaValidada._max.numeroCartelaAtendida ?? 0;

    let limiteCartelas = Math.max(totalCartelasConcluidas + 1, maiorCartelaValidada);
    limiteCartelas = Math.min(limiteCartelas, totalCartelasDefinidas);

    if (limiteCartelas <= 0) {
      limiteCartelas = Math.min(1, totalCartelasDefinidas);
    }

    const cartelasVisiveis = cartelasDaCampanha.filter(
      (cartela) => cartela.numeroCartela <= limiteCartelas,
    );

    return {
      ...campanhaCompleta,
      cartelas: cartelasVisiveis,
      metaVendedor: {
        totalCartelasDefinidas,
        totalCartelasVisiveis: cartelasVisiveis.length,
        totalCartelasConcluidas,
        limiteCartelas,
      },
    };
  }

  /**
   * Atualiza dados básicos de uma campanha existente.
   *
   * @param id - UUID da campanha
   * @param dto - Dados a serem atualizados
   * @returns Campanha atualizada
   *
   * @throws {NotFoundException} Se campanha não encontrada
   */
  async atualizar(id: string, dto: AtualizarCampanhaDto): Promise<Campanha> {
    this.logger.log(`Atualizando campanha: ${id}`);

    // Verifica se campanha existe e se é acessível (Admin sempre acessa)
    await this.buscarPorId(id);

    // Valida datas se ambas fornecidas
    if (dto.dataInicio && dto.dataFim) {
      const dataInicio = new Date(dto.dataInicio);
      const dataFim = new Date(dto.dataFim);

      if (dataFim <= dataInicio) {
        throw new BadRequestException(
          'A data de término deve ser posterior à data de início',
        );
      }
    }

    // Converte datas para Date se fornecidas
    const dados: any = { ...dto };
    if (dto.dataInicio) {
      dados.dataInicio = new Date(dto.dataInicio);
    }
    if (dto.dataFim) {
      dados.dataFim = new Date(dto.dataFim);
    }

    if (dto.paraTodasOticas !== undefined) {
      dados.paraTodasOticas = dto.paraTodasOticas;
    }

    // Remove campos não permitidos no update (garantia extra)
    delete dados['cartelas'];
    delete dados['oticasAlvoIds'];
    delete dados['produtosCampanha']; // Sprint 21: produtos globais deprecated (removido no create, mantido aqui para compatibilidade)
    delete dados['eventosEspeciais']; // Eventos também só na criação
    delete dados['importSessionId']; // Sprint 21: não permitir importação global no update

    const campanha = await this.prisma.campanha.update({
      where: { id },
      data: dados,
    });

    this.logger.log(`✅ Campanha atualizada: ${campanha.titulo}`);

    return campanha;
  }

  /**
   * Remove uma campanha do sistema.
   * * CORREÇÃO (Princípio 5.5 - Segurança/Isolamento de Dados):
   * - O método agora recebe o contexto do usuário e usa `buscarPorId` para
   * garantir que a campanha existe e o usuário tem permissão para acessá-la
   * antes de deletar.
   * * @param id - UUID da campanha
   * @param usuario - Dados do usuário logado (usado para verificar acesso)
   * @returns Campanha removida
   * * @throws {NotFoundException} Se campanha não encontrada
   */
  async remover(
    id: string,
    usuario: { id: string; papel: PapelUsuario; opticaId?: string | null },
  ): Promise<Campanha> {
    this.logger.log(`Removendo campanha: ${id}`);

    // Verifica se campanha existe E se é acessível ao usuário (Admin sempre passa)
    await this.buscarPorId(id, usuario);

    // Hard delete (deleção física com cascata automática)
    const campanha = await this.prisma.campanha.delete({
      where: { id },
    });

    this.logger.log(
      `✅ Campanha deletada permanentemente: ${campanha.titulo}`,
    );

    return campanha;
  }
  
  /**
   * Edição avançada de campanha (Sprint 19.5).
   * 
   * Permite ao Admin editar aspectos completos da campanha:
   * - Campos básicos (título, descrição, datas, valores, regras, imagens)
   * - Adicionar/remover produtos (com validação de pedidos)
   * - Adicionar/remover óticas (com validação de envios)
   * - Adicionar/editar/remover eventos especiais
   * - Adicionar novas cartelas (cartelas existentes não podem ser editadas)
   * 
   * Registra todas as alterações em HistoricoCampanha para auditoria.
   * 
   * @param id - UUID da campanha
   * @param dto - Dados avançados a serem atualizados
   * @param usuario - Dados do admin que está fazendo a edição
   * @returns Campanha atualizada
   * 
   * @throws {NotFoundException} Se campanha não encontrada
   * @throws {BadRequestException} Se validações falharem
   */
  async atualizarAvancado(
    id: string,
    dto: any, // Usar tipo genérico para evitar erro de import circular
    usuario: { id: string; email: string },
  ): Promise<any> {
    this.logger.log(`Iniciando edição avançada da campanha ${id} (Admin: ${usuario.email})`);

    // Busca campanha completa para comparação
    const campanhaAtual: any = await this.prisma.campanha.findUnique({
      where: { id },
      include: {
        // produtosCampanha removido (Sprint 21)
        oticasAlvo: true,
        eventosEspeciais: true,
        cartelas: { include: { requisitos: { include: { condicoes: true, produtos: true } } } },
      },
    });

    if (!campanhaAtual) {
      throw new NotFoundException(`Campanha com ID ${id} não encontrada`);
    }

    const alteracoes: any[] = [];

    // Executar em transação
    return this.prisma.$transaction(async (tx) => {
      // ======================================================================
      // 1. ATUALIZAR CAMPOS BÁSICOS
      // ======================================================================
      const camposBasicos: any = {};
      const camposEditaveis = [
        'titulo',
        'descricao',
        'dataInicio',
        'dataFim',
        'pontosReaisMaximo',
        'percentualGerente',
        'tipoPedido',
        'regras',
        'planilhaProdutosUrl',
        'imagemCampanha16x9Url',
        'imagemCampanha1x1Url',
        'paraTodasOticas',
      ];

      for (const campo of camposEditaveis) {
        if (dto[campo] !== undefined) {
          const valorAnterior = campanhaAtual[campo];
          const valorNovo =
            campo === 'dataInicio' || campo === 'dataFim'
              ? new Date(dto[campo])
              : dto[campo];

          if (JSON.stringify(valorAnterior) !== JSON.stringify(valorNovo)) {
            camposBasicos[campo] = valorNovo;
            alteracoes.push({ campo, valorAnterior, valorNovo });
          }
        }
      }

      if (Object.keys(camposBasicos).length > 0) {
        await tx.campanha.update({ where: { id }, data: camposBasicos });
        this.logger.log(`✅ Campos básicos atualizados: ${Object.keys(camposBasicos).join(', ')}`);
      }

      // ======================================================================
      // 2. PRODUTOS GLOBAIS REMOVIDO (Sprint 21)
      // ======================================================================
      // Produtos agora são SEMPRE gerenciados por requisito via endpoint específico:
      // PATCH /campanhas/requisitos/:requisitoId/produtos
      // 
      // Os campos dto.produtosRemover e dto.produtosAdicionar não são mais suportados.
      // Use o endpoint de atualização de produtos por requisito.

      // ======================================================================
      // 3. ÓTICAS ALVO
      // ======================================================================

      // 3.1 Remover óticas (com validação)
      if (dto.oticasRemover && dto.oticasRemover.length > 0) {
        this.logger.log(`Tentando remover ${dto.oticasRemover.length} ótica(s)...`);

        for (const opticaId of dto.oticasRemover) {
          // Verificar se existem envios ativos desta ótica
          const vendedoresOtica = await tx.usuario.findMany({
            where: { opticaId, papel: 'VENDEDOR' },
            select: { id: true },
          });

          const vendedorIds = vendedoresOtica.map((v) => v.id);

          const countEnvios = await tx.envioVenda.count({
            where: {
              campanhaId: id,
              vendedorId: { in: vendedorIds },
              status: { in: ['VALIDADO', 'EM_ANALISE'] },
            },
          });

          if (countEnvios > 0) {
            const optica = await tx.optica.findUnique({ where: { id: opticaId } });
            throw new BadRequestException(
              `Não é possível remover a ótica "${optica?.nome || opticaId}" pois existem ${countEnvios} envio(s) ativo(s) de vendedores desta ótica.`,
            );
          }

          // Remover ótica
          await tx.campanha.update({
            where: { id },
            data: { oticasAlvo: { disconnect: { id: opticaId } } },
          });

          alteracoes.push({
            campo: 'oticasAlvo',
            tipo: 'remocao',
            valor: opticaId,
          });

          this.logger.log(`✅ Ótica "${opticaId}" removida`);
        }
      }

      // 3.2 Adicionar novas óticas
      if (dto.oticasAdicionar && dto.oticasAdicionar.length > 0) {
        this.logger.log(`Adicionando ${dto.oticasAdicionar.length} nova(s) ótica(s)...`);

        // Validar se óticas existem
        const countOticas = await tx.optica.count({
          where: { id: { in: dto.oticasAdicionar }, ativa: true },
        });

        if (countOticas !== dto.oticasAdicionar.length) {
          throw new BadRequestException(
            'Um ou mais IDs de óticas são inválidos ou inativos.',
          );
        }

        await tx.campanha.update({
          where: { id },
          data: {
            oticasAlvo: {
              connect: dto.oticasAdicionar.map((opticaId: string) => ({ id: opticaId })),
            },
          },
        });

        alteracoes.push({
          campo: 'oticasAlvo',
          tipo: 'adicao',
          valor: dto.oticasAdicionar,
        });

        this.logger.log(`✅ ${dto.oticasAdicionar.length} ótica(s) adicionada(s)`);
      }

      // ======================================================================
      // 4. EVENTOS ESPECIAIS
      // ======================================================================

      // 4.1 Remover eventos
      if (dto.eventosRemover && dto.eventosRemover.length > 0) {
        await tx.eventoEspecial.deleteMany({
          where: { id: { in: dto.eventosRemover }, campanhaId: id },
        });

        alteracoes.push({
          campo: 'eventosEspeciais',
          tipo: 'remocao',
          valor: dto.eventosRemover,
        });

        this.logger.log(`✅ ${dto.eventosRemover.length} evento(s) removido(s)`);
      }

      // 4.2 Adicionar novos eventos
      if (dto.eventosAdicionar && dto.eventosAdicionar.length > 0) {
        for (const evento of dto.eventosAdicionar) {
          await tx.eventoEspecial.create({
            data: {
              nome: evento.nome,
              descricao: evento.descricao || '',
              multiplicador: evento.multiplicador,
              dataInicio: new Date(evento.dataInicio),
              dataFim: new Date(evento.dataFim),
              ativo: evento.ativo ?? true,
              corDestaque: evento.corDestaque || '#FF5733',
              campanhaId: id,
            },
          });
        }

        alteracoes.push({
          campo: 'eventosEspeciais',
          tipo: 'adicao',
          valor: dto.eventosAdicionar,
        });

        this.logger.log(`✅ ${dto.eventosAdicionar.length} evento(s) adicionado(s)`);
      }

      // 4.3 Atualizar eventos existentes
      if (dto.eventosAtualizar && dto.eventosAtualizar.length > 0) {
        for (const evento of dto.eventosAtualizar) {
          const { id: eventoId, ...dadosEvento } = evento;

          // Converter datas se presentes
          if (dadosEvento.dataInicio) {
            dadosEvento.dataInicio = new Date(dadosEvento.dataInicio);
          }
          if (dadosEvento.dataFim) {
            dadosEvento.dataFim = new Date(dadosEvento.dataFim);
          }

          await tx.eventoEspecial.update({
            where: { id: eventoId },
            data: dadosEvento,
          });
        }

        alteracoes.push({
          campo: 'eventosEspeciais',
          tipo: 'atualizacao',
          valor: dto.eventosAtualizar,
        });

        this.logger.log(`✅ ${dto.eventosAtualizar.length} evento(s) atualizado(s)`);
      }

      // ======================================================================
      // 5. CARTELAS (APENAS ADICIONAR NOVAS)
      // ======================================================================
      if (dto.cartelasAdicionar && dto.cartelasAdicionar.length > 0) {
        this.logger.log(`Adicionando ${dto.cartelasAdicionar.length} nova(s) cartela(s)...`);

        for (const cartelaDto of dto.cartelasAdicionar) {
          // Validar unicidade de ordem dentro da nova cartela
          const ordensEncontradas = new Set<number>();
          for (const requisitoDto of cartelaDto.requisitos) {
            if (ordensEncontradas.has(requisitoDto.ordem)) {
              throw new BadRequestException(
                `A nova Cartela ${cartelaDto.numeroCartela} possui requisitos com a Ordem (${requisitoDto.ordem}) duplicada.`,
              );
            }
            ordensEncontradas.add(requisitoDto.ordem);
          }

          // Criar cartela
          const regraCartela = await tx.regraCartela.create({
            data: {
              numeroCartela: cartelaDto.numeroCartela,
              descricao: cartelaDto.descricao,
              campanhaId: id,
            },
          });

          // Criar requisitos e condições
          for (const requisitoDto of cartelaDto.requisitos) {
            const requisito = await tx.requisitoCartela.create({
              data: {
                descricao: requisitoDto.descricao,
                quantidade: requisitoDto.quantidade,
                tipoUnidade: requisitoDto.tipoUnidade,
                ordem: requisitoDto.ordem,
                regraCartelaId: regraCartela.id,
              },
            });

            for (const condicaoDto of requisitoDto.condicoes) {
              await tx.condicaoRequisito.create({
                data: {
                  campo: condicaoDto.campo,
                  operador: condicaoDto.operador,
                  valor: condicaoDto.valor,
                  requisitoId: requisito.id,
                },
              });
            }
          }

          alteracoes.push({
            campo: 'cartelas',
            tipo: 'adicao',
            valor: cartelaDto,
          });

          this.logger.log(`✅ Cartela ${cartelaDto.numeroCartela} adicionada`);
        }
      }

      // ======================================================================
      // 6. REGISTRAR HISTÓRICO
      // ======================================================================
      if (alteracoes.length > 0) {
        await tx.historicoCampanha.create({
          data: {
            campanhaId: id,
            adminId: usuario.id,
            tipo: 'EDICAO',
            alteracoes: alteracoes,
          },
        });

        this.logger.log(`✅ Histórico de alterações registrado (${alteracoes.length} mudanças)`);
      }

      // Retornar campanha atualizada
      const campanhaAtualizada = await tx.campanha.findUnique({
        where: { id },
        include: {
          cartelas: {
            orderBy: { numeroCartela: 'asc' },
            include: { requisitos: { orderBy: { ordem: 'asc' }, include: { condicoes: true, produtos: true } } },
          },
          oticasAlvo: { select: { id: true, nome: true } },
          eventosEspeciais: true,
          // produtosCampanha removido (Sprint 21)
        },
      });

      this.logger.log(`✅ Edição avançada da campanha ${id} concluída com sucesso`);

      return campanhaAtualizada;
    });
  }

  /**
   * Busca histórico de alterações de uma campanha.
   * 
   * @param id - UUID da campanha
   * @returns Array de registros de histórico ordenados por data desc
   */
  async buscarHistorico(id: string) {
    this.logger.log(`Buscando histórico da campanha ${id}`);

    const historico = await this.prisma.historicoCampanha.findMany({
      where: { campanhaId: id },
      include: {
        admin: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { dataHora: 'desc' },
    });

    this.logger.log(`📋 ${historico.length} registro(s) de histórico encontrado(s)`);

    return historico;
  }
  async verificarProdutoPodeSerEditado(campanhaId: string, codigoRef: string) {
    const countPedidos = await this.prisma.envioVenda.count({
      where: {
        campanhaId,
        codigoReferenciaUsado: codigoRef,
        status: 'VALIDADO',
      },
    });

    if (countPedidos > 0) {
      return {
        podeEditar: false,
        motivoBloqueio: `Este produto foi usado em ${countPedidos} pedido(s) validado(s) e n�o pode ser alterado.`,
        countPedidos,
      };
    }

    return { podeEditar: true };
  }

  /**
   * Atualiza produtos de um requisito específico (Sprint 21).
   *
   * Permite ao Admin adicionar/remover produtos de um requisito existente.
   * Valida se não há vendas validadas usando os produtos atuais.
   *
   * @param requisitoId - UUID do requisito
   * @param dto - Dados dos produtos (importSessionId ou produtos[])
   * @param usuario - Dados do admin que está fazendo a edição
   * @returns Requisito atualizado com novos produtos
   *
   * @throws {NotFoundException} Se requisito não encontrado
   * @throws {BadRequestException} Se validações falharem
   */
  async atualizarProdutosRequisito(
    requisitoId: string,
    dto: { importSessionId?: string; produtos?: Array<{ codigoRef: string; pontosReais: number }> },
    usuario: { id: string; email: string },
  ): Promise<any> {
    this.logger.log(`Atualizando produtos do requisito ${requisitoId} (Admin: ${usuario.email})`);

    // Buscar requisito com campanha
    const requisito = await this.prisma.requisitoCartela.findUnique({
      where: { id: requisitoId },
      include: {
        produtos: true,
        regraCartela: {
          include: {
            campanha: true,
          },
        },
      },
    });

    if (!requisito) {
      throw new NotFoundException(`Requisito com ID ${requisitoId} não encontrado`);
    }

    const campanhaId = requisito.regraCartela.campanhaId;

    // Verificar se algum produto atual tem vendas validadas
    const produtosAtuais = requisito.produtos.map(p => p.codigoRef);

    if (produtosAtuais.length > 0) {
      const countVendasValidadas = await this.prisma.envioVenda.count({
        where: {
          campanhaId,
          codigoReferenciaUsado: { in: produtosAtuais },
          status: 'VALIDADO',
        },
      });

      if (countVendasValidadas > 0) {
        throw new BadRequestException(
          `Não é possível atualizar produtos deste requisito pois existem ${countVendasValidadas} venda(s) validada(s) usando os produtos atuais.`,
        );
      }
    }

    // Executar em transação
    return this.prisma.$transaction(async (tx) => {
      // Deletar produtos antigos
      await tx.produtoRequisito.deleteMany({
        where: { requisitoId },
      });

      this.logger.log(`🗑️ Produtos antigos removidos (${produtosAtuais.length})`);

      // Inserir novos produtos
      let countNovos = 0;

      if (dto.importSessionId) {
        // Via staging
        await tx.$executeRaw`
          INSERT INTO "produtos_requisitos" ("id", "requisitoId", "codigoRef", "pontosReais", "criadoEm")
          SELECT
            gen_random_uuid(),
            ${requisitoId}::uuid,
            "codigoRef",
            "pontosReais",
            NOW()
          FROM "product_import_staging"
          WHERE "sessionId" = ${dto.importSessionId}
        `;

        countNovos = await tx.produtoRequisito.count({
          where: { requisitoId },
        });

        // Limpar staging
        await tx.productImportStaging.deleteMany({
          where: { sessionId: dto.importSessionId },
        });

        this.logger.log(`🧹 Staging limpo (sessionId: ${dto.importSessionId})`);
      } else if (dto.produtos && dto.produtos.length > 0) {
        // Via array
        await tx.produtoRequisito.createMany({
          data: dto.produtos.map((produto) => ({
            requisitoId,
            codigoRef: produto.codigoRef,
            pontosReais: produto.pontosReais,
          })),
        });

        countNovos = dto.produtos.length;
      }

      this.logger.log(`✅ ${countNovos} novo(s) produto(s) adicionado(s) ao requisito ${requisitoId}`);

      // Registrar no histórico
      await tx.historicoCampanha.create({
        data: {
          campanhaId,
          adminId: usuario.id,
          tipo: 'EDICAO',
          alteracoes: [{
            campo: 'produtosRequisito',
            requisitoId,
            tipo: 'substituicao',
            produtosAnteriores: produtosAtuais.length,
            produtosNovos: countNovos,
          }],
        },
      });

      // Retornar requisito atualizado
      return tx.requisitoCartela.findUnique({
        where: { id: requisitoId },
        include: {
          produtos: true,
          condicoes: true,
        },
      });
    });
  }
}
