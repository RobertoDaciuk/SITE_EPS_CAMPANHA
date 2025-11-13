/**
 * ============================================================================
 * VALIDACAO SERVICE - O "Robô" de Processamento em Lote (Sprint 16.4)
 * ============================================================================
 *
 * Descrição:
 * Serviço responsável por processar a fila de envios EM_ANALISE,
 * comparando cada envio com a planilha do admin, aplicando as regras
 * (Rule Builder), lógica de PAR/UNIDADE e disparando gatilhos de recompensa.
 *
 * Alterações Sprint 16.4 (Tarefa 38.4 Re-Refinada - Conexão do Gatilho):
 * - ADICIONADO: Validação de CNPJ (1º Check) antes das regras
 * - ATUALIZADO: Sequência de validação agora é CNPJ → Regras → Conflito
 * - ADICIONADO: Include da Ótica do Vendedor na query de enviosPendentes
 * - ADICIONADO: Include PROFUNDO (campanha via requisito.regraCartela) para RecompensaService
 * - ADICIONADO: Helper _limparCnpj para normalização de CNPJs
 * - REFATORADO: Loop principal de processamento com validação em cascata
 * - REMOVIDO: Métodos antigos _executarSpillover e _verificarConclusaoCartela
 * - REINTEGRADO: Chamada atômica ao RecompensaService.processarGatilhos() dentro da transação
 *
 * Toda lógica é comentada detalhadamente (robustez e rastreabilidade).
 *
 * @module ValidacaoModule
 * ============================================================================
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProcessarValidacaoDto } from './dto/processar-validacao.dto';
import { StatusEnvioVenda, TipoUnidade } from '@prisma/client';
import { RecompensaService } from '../recompensa/recompensa.service';
import {
  parseDateWithFormat,
  validarDataDentroPeriodoCampanha,
  formatarDataParaExibicao,
  FormatoData,
} from './helpers/data.helper';

/**
 * Tipo robusto de resultado interno da validação de um envio.
 * 
 * ATUALIZADO (Sprint 19 - Mensagens Duais):
 * - motivo: Mensagem técnica detalhada para o ADMIN
 * - motivoVendedor: Mensagem formal simplificada para o VENDEDOR
 */
type ResultadoValidacao = {
  status: StatusEnvioVenda;
  motivo: string | null;
  motivoVendedor: string | null;
};

/**
 * ============================================================================
 * SERVICE: ValidacaoService
 * ============================================================================
 */
@Injectable()
export class ValidacaoService {
  private readonly logger = new Logger(ValidacaoService.name);

  /**
   * Construtor do serviço.
   * 
   * @param prisma - Serviço Prisma para operações de banco de dados
   * @param recompensaService - Serviço de recompensas (gatilhos gamificados)
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly recompensaService: RecompensaService,
  ) {}

  /**
   * ============================================================================
   * HELPER: _gerarMensagensDuais (NOVO - Sprint 19)
   * ============================================================================
   * 
   * Gera duas versões da mensagem de rejeição:
   * 1. ADMIN: Mensagem técnica detalhada com contexto completo
   * 2. VENDEDOR: Mensagem formal simplificada, orientada à ação
   * 
   * @param tipo - Tipo de erro/validação
   * @param contexto - Dados específicos do erro
   * @returns Objeto com ambas as mensagens
   */
  private _gerarMensagensDuais(
    tipo: string,
    contexto: any,
  ): { admin: string; vendedor: string } {
    const campanhaTitulo = contexto.campanhaTitulo || 'N/A';

    switch (tipo) {
      case 'CNPJ_NAO_CADASTRADO':
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] Vendedor (ID: ${contexto.vendedorId}) não está associado a uma ótica com CNPJ cadastrado no sistema. Verifique o cadastro da ótica no banco de dados.`,
          vendedor: 'Sua ótica não possui CNPJ cadastrado no sistema. Entre em contato com o administrador para regularizar o cadastro.'
        };

      case 'CNPJ_NAO_ENCONTRADO_PLANILHA':
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] Coluna '${contexto.nomeColuna}' (CNPJ_OTICA) não encontrada ou está vazia na planilha para o pedido ${contexto.numeroPedido}. Verifique se a planilha foi mapeada corretamente pelo admin.`,
          vendedor: 'O CNPJ do pedido não foi encontrado na planilha enviada. Verifique se o pedido está corretamente registrado no sistema.'
        };

      case 'CNPJ_INVALIDO':
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] CNPJ '${contexto.cnpjPlanilha}' encontrado na planilha para o pedido ${contexto.numeroPedido} é inválido (não possui 14 dígitos numéricos após limpeza). Formato esperado: apenas números. CNPJ recebido: "${contexto.cnpjOriginal}".`,
          vendedor: `O CNPJ '${contexto.cnpjPlanilha}' do pedido está em formato inválido. Verifique se o CNPJ está correto no sistema de origem.`
        };

      case 'CNPJ_DIVERGENTE':
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] CNPJ do pedido ${contexto.numeroPedido} na planilha (${contexto.cnpjPlanilha}) não corresponde ao CNPJ da ótica do vendedor (${contexto.cnpjVendedor}) nem ao CNPJ da matriz (${contexto.cnpjMatriz || 'N/A'}). DETALHES: Vendedor ID: ${contexto.vendedorId}, Ótica: ${contexto.nomeOptica}, Matriz: ${contexto.nomeMatriz || 'Nenhuma'}.`,
          vendedor: 'O CNPJ do pedido não corresponde à sua ótica cadastrada. Verifique se o pedido foi realizado pela ótica correta.'
        };

      case 'DATA_VENDA_NAO_MAPEADA':
        return {
          admin: `[${campanhaTitulo}] [ERRO CRÍTICO] Coluna DATA_VENDA não foi mapeada na planilha pelo admin. Pedido afetado: ${contexto.numeroPedido}. O admin deve realizar o mapeamento da coluna que contém a data da venda antes de processar a planilha.`,
          vendedor: 'Não foi possível validar a data da venda. Entre em contato com o administrador.'
        };

      case 'DATA_VENDA_NAO_ENCONTRADA':
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] Data da venda não encontrada ou está vazia na coluna '${contexto.nomeColuna}' para o pedido ${contexto.numeroPedido}. Verifique se o sistema de origem está preenchendo o campo corretamente.`,
          vendedor: 'A data da venda está ausente no pedido. Verifique se o pedido está completo no sistema.'
        };

      case 'DATA_VENDA_FORMATO_INVALIDO':
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] Data da venda '${contexto.dataVendaOriginal}' do pedido ${contexto.numeroPedido} está em formato inválido. Formato esperado: ${contexto.formatoEsperado}. Não foi possível fazer parsing da data. AÇÃO: Admin deve verificar o formato configurado ou corrigir os dados da planilha.`,
          vendedor: `A data da venda '${contexto.dataVendaOriginal}' está em formato inválido. Entre em contato com o administrador.`
        };

      case 'DATA_VENDA_FORA_PERIODO':
        return {
          admin: `[${campanhaTitulo}] [VALIDAÇÃO CRÍTICA] Data da venda do pedido ${contexto.numeroPedido} está FORA do período da campanha. Data da venda: ${contexto.dataVendaFormatada}, Período da campanha: ${contexto.dataInicioFormatada} até ${contexto.dataFimFormatada}. MOTIVO: Venda ocorreu ${contexto.motivoDetalhado}. Apenas vendas dentro do período da campanha são elegíveis para pontuação.`,
          vendedor: `A data da venda (${contexto.dataVendaFormatada}) está fora do período válido da campanha (${contexto.dataInicioFormatada} até ${contexto.dataFimFormatada}). Apenas vendas realizadas durante o período da campanha são elegíveis.`
        };

      case 'PAR_DUAS_LINHAS_REQUERIDAS':
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] Requisito do tipo PAR (ID: ${contexto.requisitoId}) requer exatamente 2 linhas na planilha para o pedido ${contexto.numeroPedido}, mas foram encontradas ${contexto.linhasEncontradas} linha(s). CAUSA PROVÁVEL: ${contexto.linhasEncontradas < 2 ? 'Pedido incompleto - faltam unidades de lentes.' : 'Pedido duplicado ou com linhas extras.'} Verifique se o pedido possui duas unidades (par de lentes) corretamente cadastradas no sistema de origem.`,
          vendedor: `São necessárias 2 unidades de lentes no pedido (par completo), mas ${contexto.linhasEncontradas === 1 ? 'foi encontrada apenas 1 unidade' : `foram encontradas ${contexto.linhasEncontradas} unidades`}. Verifique se o pedido está completo no sistema.`
        };

      case 'UNIDADE_UMA_LINHA_REQUERIDA':
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] Requisito do tipo UNIDADE (ID: ${contexto.requisitoId}) requer exatamente 1 linha na planilha para o pedido ${contexto.numeroPedido}, mas foram encontradas ${contexto.linhasEncontradas} linhas. CAUSA PROVÁVEL: Pedido duplicado ou com múltiplas entradas. Verifique inconsistências no sistema de origem.`,
          vendedor: `São necessárias 1 unidade de lente no pedido, mas foram encontradas ${contexto.linhasEncontradas} unidades. Verifique se há duplicação no sistema.`
        };

      case 'CODIGO_REFERENCIA_NAO_MAPEADO':
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] Coluna CODIGO_REFERENCIA não foi mapeada na planilha pelo admin. O admin deve acessar a tela de validação e realizar o mapeamento da coluna que contém o código do produto antes de processar a planilha. Pedido afetado: ${contexto.numeroPedido}.`,
          vendedor: 'Não foi possível validar o código do produto. Entre em contato com o administrador.'
        };

      case 'CODIGO_REFERENCIA_VAZIO':
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] Código de referência não encontrado ou está vazio na coluna '${contexto.nomeColuna}' para o pedido ${contexto.numeroPedido}. CAUSA: Campo vazio ou null na planilha. Verifique se o sistema de origem está preenchendo o campo corretamente.`,
          vendedor: 'O código de referência do produto está ausente no pedido. Verifique se o pedido está completo no sistema.'
        };

      case 'CODIGO_REFERENCIA_NAO_CADASTRADO':
        return {
          admin: `[${campanhaTitulo}] [CONFLITO_MANUAL] Código de referência '${contexto.codigoReferencia}' do pedido ${contexto.numeroPedido} não foi encontrado na tabela ProdutoCampanha desta campanha (ID: ${contexto.campanhaId}). AÇÃO REQUERIDA: Admin deve cadastrar este código na planilha de produtos da campanha ou verificar se o código está correto. Possível erro de digitação ou produto não elegível.`,
          vendedor: `O produto do pedido (código: ${contexto.codigoReferencia}) não está cadastrado nesta campanha. Entre em contato com o suporte para verificar a elegibilidade do produto.`
        };

      case 'REGRA_NAO_SATISFEITA':
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] Condição de regra não satisfeita para o pedido ${contexto.numeroPedido}: Campo '${contexto.campo}' ${contexto.operador} '${contexto.valorEsperado}', mas foi encontrado '${contexto.valorReal}'. DETALHES DA REGRA: Requisito ID ${contexto.requisitoId}, Condição ID ${contexto.condicaoId || 'N/A'}. Verifique se a configuração da regra está correta ou se o pedido realmente não atende aos critérios.`,
          vendedor: `O pedido não atende aos requisitos da campanha. Requisito: ${contexto.campo} deve ser ${contexto.operador} '${contexto.valorEsperado}'.`
        };

      case 'CONFLITO_VENDEDOR_DUPLICADO':
        return {
          admin: `[${campanhaTitulo}] [CONFLITO_MANUAL] Conflito interno detectado: Pedido ${contexto.numeroPedido} já foi validado para outro vendedor (ID: ${contexto.vendedorConflitanteId}, Nome: ${contexto.vendedorConflitanteNome || 'N/A'}) nesta mesma campanha. EnvioVenda conflitante ID: ${contexto.envioConflitanteId}. AÇÃO REQUERIDA: Admin deve revisar manualmente e decidir qual vendedor deve receber os pontos. Possível duplicação de pedido no sistema.`,
          vendedor: 'Este pedido já foi validado para outro vendedor. Entre em contato com o administrador para resolução do conflito.'
        };

      case 'MAPEAMENTO_CNPJ_AUSENTE':
        return {
          admin: `[${campanhaTitulo}] [ERRO CRÍTICO] Mapeamento da coluna CNPJ_OTICA não encontrado no mapaColunas fornecido pelo admin. Pedido afetado: ${contexto.numeroPedido}. CAUSA: Erro de validação no frontend ou DTO corrompido. Isso não deveria acontecer devido ao decorator @IsMapaComCnpj no DTO ProcessarValidacaoDto.`,
          vendedor: 'Erro interno ao processar a validação. Entre em contato com o administrador.'
        };

      default:
        return {
          admin: `[${campanhaTitulo}] [TÉCNICO] Erro não categorizado: ${contexto.mensagem || 'Verifique os logs do sistema'}`,
          vendedor: 'Erro ao validar o pedido. Entre em contato com o administrador.'
        };
    }
  }

  /**
   * ============================================================================
   * MÉTODO PRINCIPAL: processarPlanilha
   * ============================================================================
   *
   * Processa todos os envios não-validados (EM_ANALISE, REJEITADO, CONFLITO_MANUAL) 
   * da campanha especificada, aplicando validação completa em cascata:
   * 
   * 1. Validação de CNPJ (Sprint 16.4 - Tarefa 38.4)
   * 2. Validação de Regras (Rule Builder)
   * 3. Detecção de Conflito entre Vendedores
   * 4. Disparo de Gatilhos de Recompensa (via RecompensaService)
   *
   * REFATORADO (Sprint 19.5 - Fix Crítico):
   * - Loop principal UNIFICADO processa todos os status não-validados
   * - Elimina lógica duplicada de revalidação separada
   * - Mantém atomicidade completa (transação + spillover + gatilhos)
   * - Pedidos VALIDADOS são PROTEGIDOS (nunca reprocessados)
   * 
   * Status Processados:
   * - ✅ EM_ANALISE: Pedidos novos aguardando primeira validação
   * - ✅ REJEITADO: Pedidos que falharam anteriormente e podem ser revalidados
   * - ✅ CONFLITO_MANUAL: Conflitos que podem ser resolvidos com nova planilha
   * - 🔒 VALIDADO: PROTEGIDO - nunca é reprocessado
   *
   * @param dto - DTO com campanhaId, ehSimulacao, mapaColunas e linhasPlanilha
   * @param adminId - ID do admin que está executando a validação (para histórico)
   * @returns Relatório consolidado do processamento
   */
  async processarPlanilha(dto: ProcessarValidacaoDto, adminId?: string) {
    const { campanhaId, ehSimulacao, mapaColunas, linhasPlanilha } = dto;

    this.logger.log(
      `========== INÍCIO DO PROCESSAMENTO ==========`,
    );
    this.logger.log(`Campanha: ${campanhaId}`);
    this.logger.log(`Simulação: ${ehSimulacao}`);
    this.logger.log(`Linhas da planilha: ${linhasPlanilha.length}`);

    // -------------------------------------------------------------------------
    // ETAPA 1: Buscar todos os envios EM_ANALISE da campanha
    // -------------------------------------------------------------------------
    // ATUALIZAÇÃO Sprint 17 (Tarefa 40 - Hierarquia Matriz/Filial):
    // - Include da MATRIZ da Ótica do Vendedor para validação CNPJ (matriz.cnpj)
    // - Permite validar CNPJ contra a ótica do vendedor OU sua matriz
    //
    // ATUALIZAÇÃO Sprint 16.4 (Tarefa 38.4 Re-Refinada):
    // - Include da Ótica do Vendedor para validação CNPJ
    // - Include PROFUNDO da Campanha (via requisito.regraCartela.campanha)
    //   para fornecer os dados necessários ao RecompensaService
    this.logger.log(`Buscando envios para validação (EM_ANALISE, REJEITADO, CONFLITO_MANUAL)...`);

    // Construir filtro baseado no campanhaId
    // CORRIGIDO (Sprint 19.5): Agora processa TODOS os status não-validados
    // - EM_ANALISE: Pedidos novos aguardando primeira validação
    // - REJEITADO: Pedidos que falharam anteriormente e podem ser revalidados
    // - CONFLITO_MANUAL: Conflitos que podem ser resolvidos com nova planilha
    // - VALIDADO: PROTEGIDO - nunca é reprocessado
    const whereFilter: any = {
      status: {
        in: ['EM_ANALISE', 'REJEITADO', 'CONFLITO_MANUAL']
      },
    };

    // Se campanhaId for "TODAS", busca envios de todas as campanhas ativas
    // Caso contrário, filtra por campanhaId específico
    if (campanhaId !== 'TODAS') {
      whereFilter.campanhaId = campanhaId;
    }

    const enviosPendentes = await this.prisma.envioVenda.findMany({
      where: whereFilter,
      include: {
        vendedor: {
          include: {
            gerente: true,            // Necessário para RecompensaService (comissão gerente)
            optica: {
              include: {
                matriz: true,         // <-- NOVO (Sprint 17): Include da Matriz para validação CNPJ
              },
            },
          },
        },
        requisito: {
          include: {
            condicoes: true,          // Necessário para validação de regras
            // CRUCIAL: Include profundo até a Campanha
            regraCartela: {
              include: {
                campanha: {
                  include: {
                    produtosCampanha: true as any,  // <-- NOVO (Sprint 18): Include produtos para validação CODIGO_DA_REFERENCIA
                  },
                },
              },
            },
          },
        },
      },
    });

    this.logger.log(`Encontrados ${enviosPendentes.length} envios para processar (EM_ANALISE, REJEITADO, CONFLITO_MANUAL).`);

    if (enviosPendentes.length === 0) {
      return {
        mensagem: 'Nenhum envio pendente de validação encontrado para esta campanha.',
        totalProcessados: 0,
        validado: 0,
        rejeitado: 0,
        conflito_manual: 0,
        em_analise: 0,
      };
    }

    // Log detalhado: Breakdown por status ANTES do processamento
    const statusCountAntes = enviosPendentes.reduce((acc, envio) => {
      acc[envio.status] = (acc[envio.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    this.logger.log(`📊 Breakdown ANTES do processamento:`, statusCountAntes);

    // -------------------------------------------------------------------------
    // ETAPA 2: Inverter o mapa de colunas (facilita busca)
    // -------------------------------------------------------------------------
    const mapaInvertido: Record<string, string> = {};
    for (const [nomeColunaPlanilha, campoSistema] of Object.entries(mapaColunas)) {
      mapaInvertido[campoSistema] = nomeColunaPlanilha;
    }

    this.logger.log(`Mapa de colunas invertido:`, mapaInvertido);

    // -------------------------------------------------------------------------
    // ETAPA 3: Processar cada envio (LOOP PRINCIPAL UNIFICADO)
    // -------------------------------------------------------------------------
    // REFATORADO (Sprint 19.5): Loop unificado processa todos os status não-validados
    // - Elimina lógica duplicada de revalidação separada
    // - Mantém atomicidade e consistência em todas as validações
    const relatorio = {
      validado: 0,
      rejeitado: 0,
      conflito_manual: 0,
      em_analise: 0,
      revalidado: 0, // Contador para pedidos que estavam REJEITADO ou CONFLITO_MANUAL
    };

    for (const envio of enviosPendentes) {
      this.logger.log(`\n--- Processando Envio ID: ${envio.id} ---`);
      this.logger.log(`Pedido: ${envio.numeroPedido}, Vendedor: ${envio.vendedorId}, Status Atual: ${envio.status}`);
      
      // Indicar se é reprocessamento (não é mais EM_ANALISE)
      if (envio.status !== 'EM_ANALISE') {
        this.logger.log(`🔄 REPROCESSAMENTO detectado: Este pedido estava anteriormente como ${envio.status}`);
        if (envio.motivoRejeicao) {
          this.logger.log(`   Motivo anterior: ${envio.motivoRejeicao}`);
        }
      }

      let resultadoValidacao: ResultadoValidacao;

      // -----------------------------------------------------------------------
      // VALIDAÇÃO 1: CNPJ (ATUALIZADO - Sprint 17, Tarefa 40)
      // -----------------------------------------------------------------------
      // NOVA LÓGICA: Valida CNPJ contra a Ótica do Vendedor OU sua Matriz
      this.logger.log(`[1/3] Validando CNPJ para Pedido: ${envio.numeroPedido}...`);

      // Buscar nome da coluna CNPJ na planilha
      const colunaCnpjPlanilha = Object.keys(mapaInvertido).find(
        (key) => key === 'CNPJ_OTICA',
      );
      const nomeColunaCnpj = mapaInvertido[colunaCnpjPlanilha!]; // Ex: "CNPJ da Loja"
      const campanhaTitulo = envio.requisito.regraCartela.campanha?.titulo || 'N/A';

      if (!nomeColunaCnpj) {
        // Isso não deveria acontecer devido ao DTO @IsMapaComCnpj, mas é uma segurança extra
        const mensagens = this._gerarMensagensDuais('MAPEAMENTO_CNPJ_AUSENTE', {
          campanhaTitulo,
          numeroPedido: envio.numeroPedido,
        });
        resultadoValidacao = {
          status: 'REJEITADO',
          motivo: mensagens.admin,
          motivoVendedor: mensagens.vendedor,
        };
        this.logger.error(
          `Mapeamento CNPJ_OTICA ausente para Pedido ${envio.numeroPedido}. Pulando envio.`,
        );
        envio['resultado'] = resultadoValidacao;
        relatorio[resultadoValidacao.status.toLowerCase()]++;
        continue; // Pula para o próximo envio
      }

      // Buscar a linha correspondente na planilha usando o tipoPedido da campanha
      const tipoPedidoCampanha = (envio.requisito.regraCartela.campanha as any).tipoPedido || 'OS_OP_EPS';
      const { linhasEncontradas, status, motivo } = this._buscarPedidoPlanilha(
        envio.numeroPedido,
        linhasPlanilha,
        mapaInvertido,
        tipoPedidoCampanha,
      );

      // Se houver erro na busca (pedido não encontrado)
      if (status !== 'OK') {
        // REGRA DE NEGÓCIO (Sprint 18): Pedidos não encontrados na planilha
        // devem permanecer EM_ANALISE ao invés de serem rejeitados automaticamente
        this.logger.warn(
          `Pedido ${envio.numeroPedido} não encontrado na planilha. Mantendo status EM_ANALISE.`,
        );
        relatorio.em_analise++;
        continue; // Pula para o próximo envio (mantém EM_ANALISE)
      }

      // Extrair dados da planilha
      const linhaPlanilha = linhasEncontradas[0]; // Assumindo uma única linha relevante
      const cnpjDaPlanilha = this._limparCnpj(linhaPlanilha[nomeColunaCnpj]);
      const cnpjDoVendedor = this._limparCnpj(envio.vendedor.optica?.cnpj);

      // Validações de CNPJ
      if (!cnpjDoVendedor) {
        const mensagens = this._gerarMensagensDuais('CNPJ_NAO_CADASTRADO', {
          campanhaTitulo,
          vendedorId: envio.vendedorId,
          numeroPedido: envio.numeroPedido,
        });
        resultadoValidacao = {
          status: 'REJEITADO',
          motivo: mensagens.admin,
          motivoVendedor: mensagens.vendedor,
        };
        this.logger.warn(
          `Vendedor ${envio.vendedorId} não possui CNPJ associado. Pedido ${envio.numeroPedido} rejeitado.`,
        );
      } else if (!nomeColunaCnpj || !linhaPlanilha[nomeColunaCnpj]) {
        const mensagens = this._gerarMensagensDuais('CNPJ_NAO_ENCONTRADO_PLANILHA', {
          campanhaTitulo,
          nomeColuna: nomeColunaCnpj,
          numeroPedido: envio.numeroPedido,
        });
        resultadoValidacao = {
          status: 'REJEITADO',
          motivo: mensagens.admin,
          motivoVendedor: mensagens.vendedor,
        };
        this.logger.warn(
          `CNPJ não encontrado na planilha para Pedido ${envio.numeroPedido}.`,
        );
      } else if (cnpjDaPlanilha.length !== 14) {
        const mensagens = this._gerarMensagensDuais('CNPJ_INVALIDO', {
          campanhaTitulo,
          cnpjPlanilha: cnpjDaPlanilha,
          cnpjOriginal: linhaPlanilha[nomeColunaCnpj],
          numeroPedido: envio.numeroPedido,
        });
        resultadoValidacao = {
          status: 'REJEITADO',
          motivo: mensagens.admin,
          motivoVendedor: mensagens.vendedor,
        };
        this.logger.warn(
          `CNPJ inválido na planilha para Pedido ${envio.numeroPedido}: ${cnpjDaPlanilha}`,
        );
      } else if (cnpjDaPlanilha === cnpjDoVendedor) {
        // -----------------------------------------------------------------------
        // CNPJ BATEU COM O DA ÓTICA DO VENDEDOR (Filial ou Matriz)
        // -----------------------------------------------------------------------
        this.logger.log(
          `✓ CNPJ validado (direto) para Pedido: ${envio.numeroPedido} (${cnpjDoVendedor})`,
        );
        // Prossegue para VALIDAÇÃO 2: REGRAS (código após este bloco)
      } else {
        // -----------------------------------------------------------------------
        // CNPJ NÃO BATEU COM O DA ÓTICA, VERIFICAR MATRIZ (Sprint 17)
        // -----------------------------------------------------------------------
        this.logger.log(
          `CNPJ da planilha (${cnpjDaPlanilha}) não bate com Ótica do Vendedor (${cnpjDoVendedor}). Verificando Matriz...`,
        );

        const matriz = envio.vendedor.optica?.matriz;
        const cnpjDaMatriz = this._limparCnpj(matriz?.cnpj);

        if (matriz && cnpjDaMatriz && cnpjDaPlanilha === cnpjDaMatriz) {
          // -----------------------------------------------------------------------
          // CNPJ BATEU COM O DA MATRIZ
          // -----------------------------------------------------------------------
          this.logger.log(
            `✓ CNPJ validado (via Matriz ${matriz.nome}) para Pedido: ${envio.numeroPedido} (${cnpjDaMatriz})`,
          );
          // Prossegue para VALIDAÇÃO 2: REGRAS (código após este bloco)
        } else {
          // -----------------------------------------------------------------------
          // CNPJ NÃO BATEU NEM COM FILIAL NEM COM MATRIZ
          // -----------------------------------------------------------------------
          this.logger.warn(
            `CNPJ divergente para Pedido: ${envio.numeroPedido}. Planilha: ${cnpjDaPlanilha}, Vendedor: ${cnpjDoVendedor}, Matriz: ${cnpjDaMatriz || 'N/A'}`,
          );
          const mensagens = this._gerarMensagensDuais('CNPJ_DIVERGENTE', {
            campanhaTitulo,
            numeroPedido: envio.numeroPedido,
            cnpjPlanilha: cnpjDaPlanilha,
            cnpjVendedor: cnpjDoVendedor,
            cnpjMatriz: cnpjDaMatriz,
            vendedorId: envio.vendedorId,
            nomeOptica: envio.vendedor.optica?.nome,
            nomeMatriz: matriz?.nome,
          });
          resultadoValidacao = {
            status: 'REJEITADO',
            motivo: mensagens.admin,
            motivoVendedor: mensagens.vendedor,
          };
        }
      }

      // -----------------------------------------------------------------------
      // VALIDAÇÃO 1.5: DATA DA VENDA (NOVO - Validação Crítica)
      // -----------------------------------------------------------------------
      // Valida se a data da venda está dentro do período da campanha
      // REGRA: dataInicio <= dataVenda <= dataFim
      if (!resultadoValidacao) {
        this.logger.log(`[1.5/4] Validando DATA DA VENDA para Pedido: ${envio.numeroPedido}...`);

        // Buscar nome da coluna DATA_VENDA na planilha
        const colunaDataVendaPlanilha = mapaInvertido['DATA_VENDA'];

        if (!colunaDataVendaPlanilha) {
          // DATA_VENDA não foi mapeada
          const mensagens = this._gerarMensagensDuais('DATA_VENDA_NAO_MAPEADA', {
            campanhaTitulo,
            numeroPedido: envio.numeroPedido,
          });
          resultadoValidacao = {
            status: 'REJEITADO',
            motivo: mensagens.admin,
            motivoVendedor: mensagens.vendedor,
          };
          this.logger.error(
            `Mapeamento DATA_VENDA ausente para Pedido ${envio.numeroPedido}. Pulando envio.`,
          );
          envio['resultado'] = resultadoValidacao;
          relatorio[resultadoValidacao.status.toLowerCase()]++;
          continue; // Pula para o próximo envio
        }

        // Extrair data da venda da planilha
        const dataVendaOriginal = linhaPlanilha[colunaDataVendaPlanilha];

        if (!dataVendaOriginal) {
          // Data vazia na planilha
          const mensagens = this._gerarMensagensDuais('DATA_VENDA_NAO_ENCONTRADA', {
            campanhaTitulo,
            nomeColuna: colunaDataVendaPlanilha,
            numeroPedido: envio.numeroPedido,
          });
          resultadoValidacao = {
            status: 'REJEITADO',
            motivo: mensagens.admin,
            motivoVendedor: mensagens.vendedor,
          };
          this.logger.warn(
            `Data da venda não encontrada na planilha para Pedido ${envio.numeroPedido}.`,
          );
          envio['resultado'] = resultadoValidacao;
          relatorio[resultadoValidacao.status.toLowerCase()]++;
          continue;
        }

        // Fazer parsing da data usando o formato brasileiro (padrão)
        // TODO: Futuramente permitir que admin configure o formato
        const dataVendaParsed = parseDateWithFormat(
          String(dataVendaOriginal),
          FormatoData.BRASILEIRO,
        );

        if (!dataVendaParsed) {
          // Erro no parsing da data
          const mensagens = this._gerarMensagensDuais('DATA_VENDA_FORMATO_INVALIDO', {
            campanhaTitulo,
            dataVendaOriginal,
            numeroPedido: envio.numeroPedido,
            formatoEsperado: 'DD/MM/YYYY (brasileiro)',
          });
          resultadoValidacao = {
            status: 'REJEITADO',
            motivo: mensagens.admin,
            motivoVendedor: mensagens.vendedor,
          };
          this.logger.warn(
            `Data da venda em formato inválido para Pedido ${envio.numeroPedido}: ${dataVendaOriginal}`,
          );
          envio['resultado'] = resultadoValidacao;
          relatorio[resultadoValidacao.status.toLowerCase()]++;
          continue;
        }

        // Validar se a data está dentro do período da campanha
        const campanha = envio.requisito.regraCartela.campanha;
        const dataInicio = campanha.dataInicio;
        const dataFim = campanha.dataFim;

        const dataDentroPeriodo = validarDataDentroPeriodoCampanha(
          dataVendaParsed,
          dataInicio,
          dataFim,
        );

        if (!dataDentroPeriodo) {
          // Data fora do período
          const dataVendaFormatada = formatarDataParaExibicao(dataVendaParsed);
          const dataInicioFormatada = formatarDataParaExibicao(dataInicio);
          const dataFimFormatada = formatarDataParaExibicao(dataFim);

          // Determinar se foi antes ou depois
          let motivoDetalhado = '';
          if (dataVendaParsed < dataInicio) {
            motivoDetalhado = 'ANTES do início da campanha';
          } else if (dataVendaParsed > dataFim) {
            motivoDetalhado = 'DEPOIS do término da campanha';
          }

          const mensagens = this._gerarMensagensDuais('DATA_VENDA_FORA_PERIODO', {
            campanhaTitulo,
            numeroPedido: envio.numeroPedido,
            dataVendaFormatada,
            dataInicioFormatada,
            dataFimFormatada,
            motivoDetalhado,
          });

          resultadoValidacao = {
            status: 'REJEITADO',
            motivo: mensagens.admin,
            motivoVendedor: mensagens.vendedor,
          };

          this.logger.warn(
            `⚠ Data da venda FORA DO PERÍODO para Pedido ${envio.numeroPedido}: ` +
              `${dataVendaFormatada} (Campanha: ${dataInicioFormatada} a ${dataFimFormatada})`,
          );
          envio['resultado'] = resultadoValidacao;
          relatorio[resultadoValidacao.status.toLowerCase()]++;
          continue;
        }

        // ✅ Data válida! Armazenar para persistir depois
        envio['dataVendaParsed'] = dataVendaParsed;
        this.logger.log(
          `✓ Data da venda validada para Pedido: ${envio.numeroPedido} (${formatarDataParaExibicao(dataVendaParsed)})`,
        );
      }

      // -----------------------------------------------------------------------
      // VALIDAÇÃO 2: REGRAS (Só chega aqui se CNPJ e DATA forem válidos)
      // -----------------------------------------------------------------------
      if (!resultadoValidacao) {
        // Se ainda não definiu resultado, significa que CNPJ e DATA foram validados
        this.logger.log(`[2/4] Aplicando regras de negócio (Rule Builder)...`);

        const tipoPedidoCampanha = (envio.requisito.regraCartela.campanha as any).tipoPedido || 'OS_OP_EPS';
        const resultadoRegras = this._aplicarRegras(
          linhasEncontradas,
          envio.requisito,
          mapaInvertido,
          envio.requisito.regraCartela.campanha,
          envio.numeroPedido,
          tipoPedidoCampanha,
        );

        if (!resultadoRegras.sucesso) {
          // Regras falharam - resultadoRegras já contém mensagens duais
          resultadoValidacao = {
            status: 'REJEITADO',
            motivo: resultadoRegras.motivo!,
            motivoVendedor: resultadoRegras.motivoVendedor!,
          };
          this.logger.warn(
            `Regras não satisfeitas para Pedido ${envio.numeroPedido}: ${resultadoRegras.motivo}`,
          );
        } else {
          // -----------------------------------------------------------------------
          // REGRAS VÁLIDAS! Buscar CÓDIGO DE REFERÊNCIA e calcular valor
          // -----------------------------------------------------------------------
          this.logger.log(
            `✓ Regras validadas com sucesso para Pedido: ${envio.numeroPedido}`,
          );

          // NOVO Sprint 18: Buscar código de referência na planilha
          this.logger.log(`[2.5/3] Buscando código de referência na planilha...`);
          
          const colunaCodRefPlanilha = mapaInvertido['CODIGO_REFERENCIA'];
          if (!colunaCodRefPlanilha) {
            const mensagens = this._gerarMensagensDuais('CODIGO_REFERENCIA_NAO_MAPEADO', {
              campanhaTitulo,
              numeroPedido: envio.numeroPedido,
            });
            resultadoValidacao = {
              status: 'REJEITADO',
              motivo: mensagens.admin,
              motivoVendedor: mensagens.vendedor,
            };
            this.logger.error(
              `Coluna CODIGO_REFERENCIA não mapeada. Pedido ${envio.numeroPedido} rejeitado.`,
            );
            envio['resultado'] = resultadoValidacao;
            relatorio[resultadoValidacao.status.toLowerCase()]++;
            continue;
          }

          const codigoReferencia = String(linhaPlanilha[colunaCodRefPlanilha] || '').trim().toUpperCase();
          
          if (!codigoReferencia) {
            const mensagens = this._gerarMensagensDuais('CODIGO_REFERENCIA_VAZIO', {
              campanhaTitulo,
              nomeColuna: colunaCodRefPlanilha,
              numeroPedido: envio.numeroPedido,
            });
            resultadoValidacao = {
              status: 'REJEITADO',
              motivo: mensagens.admin,
              motivoVendedor: mensagens.vendedor,
            };
            this.logger.error(
              `Código de referência vazio. Pedido ${envio.numeroPedido} rejeitado.`,
            );
            envio['resultado'] = resultadoValidacao;
            relatorio[resultadoValidacao.status.toLowerCase()]++;
            continue;
          }

          // ===============================================================
          // BUSCAR PRODUTO NA CAMPANHA (Sprint 18 - Produtos da Campanha)
          // ===============================================================
          // Agora buscamos o produto diretamente na tabela ProdutoCampanha
          // associada a esta campanha (não mais na tabela global ValorReferencia)
          this.logger.log(`Buscando código '${codigoReferencia}' nos produtos da campanha...`);
          const campanha = envio.requisito.regraCartela.campanha;
          const produtoCampanha = campanha.produtosCampanha?.find(
            (p: any) => p.codigoRef === codigoReferencia
          );

          if (!produtoCampanha) {
            const mensagens = this._gerarMensagensDuais('CODIGO_REFERENCIA_NAO_CADASTRADO', {
              campanhaTitulo,
              codigoReferencia,
              numeroPedido: envio.numeroPedido,
              campanhaId: envio.campanhaId,
            });
            resultadoValidacao = {
              status: 'CONFLITO_MANUAL',
              motivo: mensagens.admin,
              motivoVendedor: mensagens.vendedor,
            };
            this.logger.warn(
              `⚠ Código de referência '${codigoReferencia}' não cadastrado nesta campanha. Pedido ${envio.numeroPedido} marcado como conflito manual.`,
            );
            envio['resultado'] = resultadoValidacao;
            relatorio[resultadoValidacao.status.toLowerCase()]++;
            continue;
          }

          this.logger.log(
            `✓ Código de referência encontrado: ${codigoReferencia} = R$ ${Number(produtoCampanha.pontosReais).toFixed(2)}`,
          );

          // Armazenar dados para persistir depois
          envio['codigoReferenciaUsado'] = codigoReferencia;
          envio['valorPontosReaisRecebido'] = produtoCampanha.pontosReais;
          this.logger.log(
            `[3/3] Verificando conflito entre vendedores para Pedido: ${envio.numeroPedido}...`,
          );

          // Buscar se já existe outro envio VALIDADO do mesmo pedido por outro vendedor
          const conflitoOutroVendedor = await this.prisma.envioVenda.findFirst({
            where: {
              numeroPedido: envio.numeroPedido,
              campanhaId: envio.campanhaId,
              status: 'VALIDADO',
              vendedorId: { not: envio.vendedorId }, // Outro vendedor
            },
          });

          if (conflitoOutroVendedor) {
            // Conflito detectado: outro vendedor já tem este pedido validado
            const mensagens = this._gerarMensagensDuais('CONFLITO_VENDEDOR_DUPLICADO', {
              campanhaTitulo,
              numeroPedido: envio.numeroPedido,
              vendedorConflitanteId: conflitoOutroVendedor.vendedorId,
              vendedorConflitanteNome: 'N/A',
              envioConflitanteId: conflitoOutroVendedor.id,
            });
            resultadoValidacao = {
              status: 'CONFLITO_MANUAL',
              motivo: mensagens.admin,
              motivoVendedor: mensagens.vendedor,
            };
            this.logger.warn(
              `⚠ CONFLITO detectado para Pedido ${envio.numeroPedido}: Vendedor ${conflitoOutroVendedor.vendedorId} já validou.`,
            );
          } else {
            // -----------------------------------------------------------------------
            // TUDO VÁLIDO! Status final: VALIDADO
            // -----------------------------------------------------------------------
            resultadoValidacao = {
              status: 'VALIDADO',
              motivo: null,
              motivoVendedor: null,
            };
            this.logger.log(
              `✓✓✓ Pedido ${envio.numeroPedido} VALIDADO com sucesso! (CNPJ + Regras + Sem Conflito)`,
            );
          }
        }
      }

      // -----------------------------------------------------------------------
      // ETAPA 4: Armazenar resultado no envio (para posterior persistência)
      // -----------------------------------------------------------------------
      // Marcar como revalidado se o status anterior era REJEITADO ou CONFLITO_MANUAL
      const foiRevalidado = (envio.status === 'REJEITADO' || envio.status === 'CONFLITO_MANUAL') && 
                            resultadoValidacao.status === 'VALIDADO';
      
      if (foiRevalidado) {
        relatorio.revalidado++;
        this.logger.log(`🎉 REVALIDAÇÃO BEM-SUCEDIDA! Pedido ${envio.numeroPedido} mudou de ${envio.status} → VALIDADO`);
      }
      
      envio['resultado'] = resultadoValidacao;
      relatorio[resultadoValidacao.status.toLowerCase()]++;
      this.logger.log(
        `Resultado do Envio ID ${envio.id}: ${resultadoValidacao.status} - ${resultadoValidacao.motivo || 'OK'}`,
      );
    }

    // -------------------------------------------------------------------------
    // ETAPA 5: Persistir resultados no banco (se não for simulação)
    // -------------------------------------------------------------------------
    if (!ehSimulacao) {
      this.logger.log(`\n========== PERSISTINDO RESULTADOS NO BANCO ==========`);
      await this._persistirResultados(enviosPendentes);
    } else {
      this.logger.log(`\n========== MODO SIMULAÇÃO: Nenhuma alteração persistida ==========`);
    }

    // -------------------------------------------------------------------------
    // ETAPA 6: Retornar relatório consolidado
    // -------------------------------------------------------------------------
    this.logger.log(`\n========== FIM DO PROCESSAMENTO ==========`);
    this.logger.log(`Total processados: ${enviosPendentes.length}`);
    this.logger.log(`Validados: ${relatorio.validado}`);
    this.logger.log(`Rejeitados: ${relatorio.rejeitado}`);
    this.logger.log(`Conflitos Manuais: ${relatorio.conflito_manual}`);
    this.logger.log(`Em Análise (mantidos): ${relatorio.em_analise}`);
    this.logger.log(`Revalidados com sucesso: ${relatorio.revalidado}`);

    // Coletar detalhes dos envios processados para retornar ao frontend
    const detalhesEnvios = enviosPendentes.map((envio: any) => ({
      id: envio.id,
      numeroPedido: envio.numeroPedido,
      status: envio.resultado?.status || envio.status,
      motivo: envio.resultado?.motivo || envio.motivoRejeicao,
      motivoVendedor: envio.resultado?.motivoVendedor || envio.motivoRejeicaoVendedor, // Mensagem formal para vendedor
      infoConflito: envio.resultado?.infoConflito || envio.infoConflito,
      vendedor: {
        id: envio.vendedor.id,
        nome: envio.vendedor.nome,
        email: envio.vendedor.email,
      },
      optica: {
        nome: envio.vendedor.optica?.nome || 'N/A',
        cnpj: envio.vendedor.optica?.cnpj || 'N/A',
      },
      campanha: {
        id: envio.campanhaId,
        titulo: envio.requisito?.regraCartela?.campanha?.titulo || 'N/A',
      },
      requisito: {
        descricao: envio.requisito?.descricao || 'N/A',
      },
      codigoReferencia: envio.codigoReferenciaUsado || 'N/A',
      valorPontos: envio.valorPontosReaisRecebido || 0,
      dataEnvio: envio.dataEnvio,
      dataValidacao: envio.dataValidacao,
    }));

    // -------------------------------------------------------------------------
    // ETAPA 7: Salvar histórico (NOVO - Sprint 19)
    // -------------------------------------------------------------------------
    if (!ehSimulacao && adminId) {
      try {
        await this.salvarHistoricoValidacao(adminId, campanhaId, relatorio, detalhesEnvios);
        this.logger.log(`✅ Histórico de validação salvo com sucesso!`);
      } catch (error) {
        this.logger.error(`❌ Erro ao salvar histórico: ${error.message}`);
        // Não lança erro para não interromper o fluxo principal
      }
    } else if (!ehSimulacao && !adminId) {
      this.logger.warn(`⚠️ Histórico não foi salvo: adminId não fornecido`);
    }

    return {
      mensagem: ehSimulacao
        ? 'Simulação concluída. Nenhuma alteração foi persistida.'
        : 'Processamento concluído com sucesso.',
      totalProcessados: enviosPendentes.length,
      validado: relatorio.validado,
      rejeitado: relatorio.rejeitado,
      conflito_manual: relatorio.conflito_manual,
      em_analise: relatorio.em_analise,
      revalidado: relatorio.revalidado,
      detalhes: detalhesEnvios,
    };
  }

  /**
   * ============================================================================
   * HELPER: _limparCnpj
   * ============================================================================
   *
   * Normaliza um CNPJ removendo todos os caracteres não-numéricos.
   *
   * ADICIONADO: Sprint 16.4 (Tarefa 38.4)
   *
   * @param cnpj - CNPJ bruto (pode conter pontos, traços, barras)
   * @returns CNPJ limpo (apenas números) ou null se inválido
   *
   * @example
   * _limparCnpj("12.345.678/0001-90") // "12345678000190"
   * _limparCnpj("12345678000190")     // "12345678000190"
   * _limparCnpj(null)                 // null
   * _limparCnpj("")                   // null
   */
  private _limparCnpj(cnpj: string | null | undefined): string | null {
    if (!cnpj) {
      return null;
    }

    const cnpjLimpo = String(cnpj).replace(/\D/g, '');
    return cnpjLimpo.length > 0 ? cnpjLimpo : null;
  }

  /**
   * ============================================================================
   * HELPER: _buscarPedidoPlanilha (ATUALIZADO - Sprint 18)
   * ============================================================================
   *
   * Busca um pedido específico dentro das linhas da planilha,
   * verificando a coluna específica baseada no tipoPedido da campanha.
   *
   * MUDANÇA Sprint 18:
   * - Agora recebe o tipoPedido da campanha
   * - Busca APENAS na coluna específica (não em todas as colunas de pedido)
   * - Mapeia tipoPedido do enum para o campo frontend (CORRIGIDO: compatibilidade)
   *
   * Retorna:
   * - 'OK': Pedido encontrado na coluna correta
   * - 'PEDIDO_NAO_ENCONTRADO': Pedido não foi encontrado na planilha
   *
   * @param numeroPedido - Número do pedido a buscar (ex: "#100")
   * @param linhasPlanilha - Array de objetos representando linhas da planilha
   * @param mapaInvertido - Mapa invertido (campo_sistema -> nome_coluna_planilha)
   * @param tipoPedido - Tipo de pedido da campanha (OS_OP_EPS, OPTICLICK, etc)
   * @returns Objeto com status, motivo e linhasEncontradas
   */
  private _buscarPedidoPlanilha(
    numeroPedido: string,
    linhasPlanilha: any[],
    mapaInvertido: Record<string, string>,
    tipoPedido: string,
  ): {
    status: 'OK' | 'PEDIDO_NAO_ENCONTRADO';
    motivo: string | null;
    linhasEncontradas: any[];
  } {
    const linhasEncontradas: any[] = [];

    // Mapear tipoPedido do enum para o campo usado pelo frontend
    const mapeamentoTipoPedidoParaCampo: Record<string, string> = {
      'OS_OP_EPS': 'NUMERO_PEDIDO_OS',
      'OPTICLICK': 'NUMERO_PEDIDO_OPTICLICK',
      'EPSWEB': 'NUMERO_PEDIDO_ONLINE',
      'ENVELOPE_OTICA': 'NUMERO_PEDIDO_ENVELOPE',
    };

    const campoFrontend = mapeamentoTipoPedidoParaCampo[tipoPedido];

    if (!campoFrontend) {
      return {
        status: 'PEDIDO_NAO_ENCONTRADO',
        motivo: `Tipo de pedido '${tipoPedido}' não reconhecido.`,
        linhasEncontradas: [],
      };
    }

    // Buscar a coluna específica baseada no campo mapeado
    const nomeColunaEsperada = mapaInvertido[campoFrontend];

    if (!nomeColunaEsperada) {
      return {
        status: 'PEDIDO_NAO_ENCONTRADO',
        motivo: `Nenhuma coluna mapeada para ${campoFrontend} (tipo: ${tipoPedido}). Verifique se você mapeou a coluna correta do número de pedido.`,
        linhasEncontradas: [],
      };
    }

    this.logger.log(`Buscando pedido "${numeroPedido}" na coluna "${nomeColunaEsperada}" (campo: ${campoFrontend}, tipo: ${tipoPedido})`);

    // Iterar sobre as linhas da planilha
    for (const linha of linhasPlanilha) {
      const valorCelula = String(linha[nomeColunaEsperada] || '').trim();

      if (valorCelula === numeroPedido) {
        linhasEncontradas.push(linha);
      }
    }

    // Análise de resultados
    if (linhasEncontradas.length === 0) {
      return {
        status: 'PEDIDO_NAO_ENCONTRADO',
        motivo: `Pedido '${numeroPedido}' não encontrado na coluna '${nomeColunaEsperada}' (${campoFrontend} - ${tipoPedido}).`,
        linhasEncontradas: [],
      };
    }

    // Pedido encontrado
    return {
      status: 'OK',
      motivo: null,
      linhasEncontradas: linhasEncontradas,
    };
  }

  /**
   * Normaliza a lista de códigos de referência configurados no requisito.
   * Aceita formatos:
   * - String simples separada por vírgula: "COD1,COD2"
   * - JSON array: ["COD1", "COD2"]
   */
  private _normalizarCodigosReferencia(valor: string): string[] {
    if (!valor) {
      return [];
    }

    const texto = valor.trim();
    if (!texto) {
      return [];
    }

    if (texto.startsWith('[') && texto.endsWith(']')) {
      try {
        const parsed = JSON.parse(texto);
        if (Array.isArray(parsed)) {
          const codigosJson = parsed
            .map((item: any) => String(item).trim())
            .filter((codigo: string) => codigo.length > 0);
          return Array.from(new Set(codigosJson));
        }
      } catch (error) {
        this.logger.warn(`Não foi possível interpretar lista de códigos de referência: ${texto}`);
      }
    }

    const codigos = texto
      .split(',')
      .map((parte) => parte.trim())
      .filter((parte) => parte.length > 0);

    return Array.from(new Set(codigos));
  }

  /**
   * ============================================================================
   * HELPER: _aplicarRegras
   * ============================================================================
   *
   * Aplica as regras de validação (Rule Builder) do requisito ao pedido.
   * Verifica todas as condições definidas no RequisitoCartela.
   *
   * ATUALIZADO (Sprint 18 - Produtos da Campanha):
   * - Adicionado parâmetro `campanha` para validação de CODIGO_DA_REFERENCIA
   * - Campo CODIGO_DA_REFERENCIA valida contra tabela ProdutoCampanha
   *
   * @param linhasEncontradas - Linhas da planilha correspondentes ao pedido
   * @param requisito - RequisitoCartela com condições a verificar
   * @param mapaInvertido - Mapa invertido (campo_sistema -> nome_coluna_planilha)
   * @param campanha - Campanha com produtos associados
   * @param numeroPedido - Número do pedido sendo validado (para logs)
   * @param tipoPedido - Tipo do pedido (EPSWEB, OS, etc)
   * @returns Objeto com sucesso (boolean), motivo admin e motivo vendedor
   */
  private _aplicarRegras(
    linhasEncontradas: any[],
    requisito: any,
    mapaInvertido: Record<string, string>,
    campanha: any,
    numeroPedido: string = 'N/A',
    tipoPedido: string = '',
  ): { sucesso: boolean; motivo: string | null; motivoVendedor: string | null } {
    // -----------------------------------------------------------------------
    // VALIDAÇÃO PAR/UNIDADE (CRÍTICO - Sprint 19 Fix)
    // -----------------------------------------------------------------------
    // Se o requisito é do tipo PAR, DEVE ter exatamente 2 linhas na planilha
    // Se é UNIDADE, DEVE ter exatamente 1 linha
    const tipoUnidade = requisito.tipoUnidade || 'UNIDADE';
    const quantidadeEsperada = tipoUnidade === 'PAR' ? 2 : 1;
    
    if (linhasEncontradas.length !== quantidadeEsperada) {
      const campanhaTitulo = campanha?.titulo || 'N/A';
      const numeroPedidoFormatado = tipoPedido ? `${numeroPedido} (${tipoPedido})` : numeroPedido;
      
      if (tipoUnidade === 'PAR') {
        const mensagens = this._gerarMensagensDuais('PAR_DUAS_LINHAS_REQUERIDAS', {
          campanhaTitulo,
          requisitoId: requisito.id,
          numeroPedido: numeroPedidoFormatado,
          linhasEncontradas: linhasEncontradas.length,
        });
        return {
          sucesso: false,
          motivo: mensagens.admin,
          motivoVendedor: mensagens.vendedor,
        };
      } else {
        const mensagens = this._gerarMensagensDuais('UNIDADE_UMA_LINHA_REQUERIDA', {
          campanhaTitulo,
          requisitoId: requisito.id,
          numeroPedido: numeroPedidoFormatado,
          linhasEncontradas: linhasEncontradas.length,
        });
        return {
          sucesso: false,
          motivo: mensagens.admin,
          motivoVendedor: mensagens.vendedor,
        };
      }
    }

    this.logger.log(
      `✓ Validação PAR/UNIDADE: ${tipoUnidade} - ${linhasEncontradas.length} linha(s) encontrada(s) (esperado: ${quantidadeEsperada})`,
    );

    // Implementação simplificada: assumindo que todas as condições devem ser satisfeitas
    if (!requisito || !requisito.condicoes || requisito.condicoes.length === 0) {
      return { sucesso: true, motivo: null, motivoVendedor: null };
    }

    for (const condicao of requisito.condicoes) {
      const campoVerificacao = condicao.campo;
      const operador = condicao.operador;
      const valorEsperado = condicao.valor;

      // -----------------------------------------------------------------------
      // CASO ESPECIAL: CODIGO_DA_REFERENCIA (Sprint 18 - Produtos da Campanha)
      // -----------------------------------------------------------------------
      // Este campo valida o código do produto contra a tabela ProdutoCampanha
      // Os códigos são extraídos da planilha (coluna mapeada) e validados
      if (campoVerificacao === 'CODIGO_DA_REFERENCIA') {
        // Buscar nome da coluna mapeada para CODIGO_REFERENCIA
        const nomeColunaCodigo = mapaInvertido['CODIGO_REFERENCIA'];
        
        if (!nomeColunaCodigo) {
          return {
            sucesso: false,
            motivo: '[TÉCNICO] Coluna de "Código da referência" não foi mapeada pelo admin. O admin deve realizar o mapeamento correto antes de processar.',
            motivoVendedor: 'Configuração do mapeamento de colunas incompleta. Entre em contato com o administrador.',
          };
        }

        // Extrair códigos das linhas da planilha
        const codigosDaPlanilha: string[] = [];
        for (const linha of linhasEncontradas) {
          const codigoNaLinha = linha[nomeColunaCodigo];
          this.logger.debug(`DEBUG: Coluna "${nomeColunaCodigo}", Valor: "${codigoNaLinha}"`);
          if (codigoNaLinha) {
            codigosDaPlanilha.push(String(codigoNaLinha).trim());
          }
        }

        this.logger.log(`Códigos extraídos da planilha: ${codigosDaPlanilha.length > 0 ? codigosDaPlanilha.join(', ') : 'NENHUM'}`);

        if (codigosDaPlanilha.length === 0) {
          return {
            sucesso: false,
            motivo: '[TÉCNICO] Nenhum código de referência encontrado nas linhas da planilha para este pedido.',
            motivoVendedor: 'O pedido não possui código de produto válido. Verifique a planilha enviada.',
          };
        }

        // Debug: Mostrar campanha e produtos cadastrados
        const produtosCadastrados = campanha.produtosCampanha?.map((p: any) => p.codigoRef) || [];
        this.logger.debug(`Campanha ID: ${campanha?.id}, Título: "${campanha?.titulo}"`);
        this.logger.debug(`Produtos cadastrados na campanha: ${produtosCadastrados.length > 0 ? produtosCadastrados.slice(0, 10).join(', ') + (produtosCadastrados.length > 10 ? '...' : '') : 'NENHUM'}`);

        // Verificar se os códigos da planilha existem na tabela ProdutoCampanha
        const codigosNaoEncontrados = codigosDaPlanilha.filter(
          (codigo) => !campanha.produtosCampanha?.some((p: any) => p.codigoRef === codigo),
        );

        if (codigosNaoEncontrados.length > 0) {
          // Reportar o primeiro código não encontrado (ou todos concatenados na mensagem)
          const mensagens = this._gerarMensagensDuais('CODIGO_REFERENCIA_NAO_CADASTRADO', {
            campanhaTitulo: campanha?.titulo || 'N/A',
            requisitoId: requisito.id,
            numeroPedido: 'N/A',
            codigoReferencia: codigosNaoEncontrados.join(', '),
            campanhaId: campanha?.id || 'N/A',
          });
          return {
            sucesso: false,
            motivo: mensagens.admin,
            motivoVendedor: mensagens.vendedor,
          };
        }

        // Produtos encontrados - validação OK
        this.logger.log(`✓ Códigos de referência validados: ${codigosDaPlanilha.join(', ')}`);
        continue;
      }

      // -----------------------------------------------------------------------
      // CAMPOS NORMAIS (mapeados da planilha)
      // -----------------------------------------------------------------------
      const nomeColuna = mapaInvertido[campoVerificacao];

      if (!nomeColuna) {
        return {
          sucesso: false,
          motivo: `[TÉCNICO] Campo '${campoVerificacao}' não foi mapeado pelo admin na planilha. O admin deve realizar o mapeamento correto antes de processar.`,
          motivoVendedor: 'Configuração do mapeamento de colunas incompleta. Entre em contato com o administrador.',
        };
      }

      const valorReal = linhasEncontradas[0][nomeColuna];

      // Lógica de comparação baseada no operador
      let condicaoAtendida = false;

      switch (operador) {
        case 'IGUAL_A':
          condicaoAtendida = String(valorReal).trim() === String(valorEsperado).trim();
          break;
        case 'NAO_IGUAL_A':
          condicaoAtendida = String(valorReal).trim() !== String(valorEsperado).trim();
          break;
        case 'CONTEM':
          condicaoAtendida = String(valorReal).includes(String(valorEsperado));
          break;
        case 'NAO_CONTEM':
          condicaoAtendida = !String(valorReal).includes(String(valorEsperado));
          break;
        case 'MAIOR_QUE':
          condicaoAtendida = parseFloat(valorReal) > parseFloat(valorEsperado);
          break;
        case 'MENOR_QUE':
          condicaoAtendida = parseFloat(valorReal) < parseFloat(valorEsperado);
          break;
        default:
          return {
            sucesso: false,
            motivo: `[TÉCNICO] Operador '${operador}' não é reconhecido pelo sistema. Operadores válidos: IGUAL_A, NAO_IGUAL_A, CONTEM, NAO_CONTEM, MAIOR_QUE, MENOR_QUE.`,
            motivoVendedor: 'Erro na configuração da regra. Entre em contato com o administrador.',
          };
      }

      if (!condicaoAtendida) {
        const mensagens = this._gerarMensagensDuais('REGRA_NAO_SATISFEITA', {
          campanhaTitulo: campanha?.titulo || 'N/A',
          requisitoId: requisito.id,
          condicaoId: condicao.id,
          campo: campoVerificacao,
          operador,
          valorEsperado,
          valorReal,
          numeroPedido: 'N/A',
        });
        return {
          sucesso: false,
          motivo: mensagens.admin,
          motivoVendedor: mensagens.vendedor,
        };
      }
    }

    return { sucesso: true, motivo: null, motivoVendedor: null };
  }

  /**
   * ============================================================================
   * HELPER: _persistirResultados
   * ============================================================================
   *
   * Persiste os resultados da validação no banco de dados.
   * Para envios VALIDADOS, executa a lógica de recompensas de forma ATÔMICA.
   *
   * REFATORADO: Sprint 16.4 (Tarefa 38.4 Re-Refinada)
   * - REMOVIDO: Métodos antigos _executarSpillover e _verificarConclusaoCartela
   * - REINTEGRADO: Chamada atômica ao RecompensaService.processarGatilhos() dentro da transação
   *
   * @param enviosPendentes - Array de envios processados com resultado anexado
   */
  private async _persistirResultados(enviosPendentes: any[]) {
    for (const envio of enviosPendentes) {
      const resultado: ResultadoValidacao = envio['resultado'];

      // Pular envios que não têm resultado (mantidos em EM_ANALISE)
      if (!resultado) {
        continue;
      }

      if (resultado.status === 'VALIDADO') {
        // -----------------------------------------------------------------------
        // VALIDADO: Usar transação para operações atômicas (Validação + Recompensa)
        // -----------------------------------------------------------------------
        await this.prisma.$transaction(async (tx) => {
          // -----------------------------------------------------------------------
          // PASSO 1A: CALCULAR SPILLOVER (CORRIGIDO Sprint 16.5 - Tarefa 38.8)
          // -----------------------------------------------------------------------
          /**
           * Conta quantos envios VALIDADOS já existem do mesmo vendedor para o mesmo requisito.
           * Usa essa contagem para calcular em qual cartela este envio deve ser alocado.
           *
           * Lógica de Spillover:
           * - Se requisito precisa de 2 vendas por cartela:
           *   - Venda 1: countValidado=0 → numeroCartela = floor(0/2) + 1 = 1
           *   - Venda 2: countValidado=1 → numeroCartela = floor(1/2) + 1 = 1 (Cartela 1 COMPLETA!)
           *   - Venda 3: countValidado=2 → numeroCartela = floor(2/2) + 1 = 2 (Spillover!)
           *   - Venda 4: countValidado=3 → numeroCartela = floor(3/2) + 1 = 2
           *   - Venda 5: countValidado=4 → numeroCartela = floor(4/2) + 1 = 3 (Spillover!)
           *
           * Importante: Conta apenas envios VALIDADO (não EM_ANALISE nem REJEITADO)
           */
          const ordemRequisito = envio.requisito.ordem;

          const countValidado = await tx.envioVenda.count({
            where: {
              vendedorId: envio.vendedorId,
              campanhaId: envio.requisito.regraCartela.campanhaId,
              status: 'VALIDADO',
              requisito: {
                ordem: ordemRequisito,
              },
            },
          });

          const quantidadeRequisito = envio.requisito.quantidade;
          const numeroCartelaAtendida = Math.floor(countValidado / quantidadeRequisito) + 1;

          this.logger.log(
            `[SPILLOVER] Envio ${envio.id}: countValidado=${countValidado}, quantidade=${quantidadeRequisito}, numeroCartela=${numeroCartelaAtendida}`,
          );

          // -----------------------------------------------------------------------
          // PASSO 1B: ATUALIZAR STATUS DO ENVIO PARA VALIDADO (COM SPILLOVER CORRETO)
          // -----------------------------------------------------------------------
          const envioAtualizado = await tx.envioVenda.update({
            where: { id: envio.id },
            data: {
              status: 'VALIDADO',
              motivoRejeicao: null,
              motivoRejeicaoVendedor: null, // Limpa mensagem do vendedor quando validado
              dataValidacao: new Date(),
              numeroCartelaAtendida: numeroCartelaAtendida, // ✅ CORRIGIDO: Usa spillover calculado
              codigoReferenciaUsado: envio['codigoReferenciaUsado'], // NOVO Sprint 18
              valorPontosReaisRecebido: envio['valorPontosReaisRecebido'], // NOVO Sprint 18
              dataVenda: envio['dataVendaParsed'], // NOVO: Data da venda parseada e validada
            },
          });

          this.logger.log(
            `Envio ID ${envio.id} atualizado para VALIDADO (Cartela ${numeroCartelaAtendida}).`,
          );

          // -----------------------------------------------------------------------
          // PASSO 2: GATILHO DE RECOMPENSA (Dispara o motor de recompensa de forma ATÔMICA)
          // -----------------------------------------------------------------------
          this.logger.log(`Disparando gatilhos de recompensa para Envio ID ${envioAtualizado.id}...`);

          // Extrai os dados hidratados necessários para o RecompensaService
          // Atenção: Garanta que a estrutura do 'include' está correta para evitar erros aqui
          const campanha = envio.requisito.regraCartela.campanha;
          const vendedor = envio.vendedor; // Já inclui 'gerente' e 'optica' do include principal

          if (!campanha || !vendedor) {
            this.logger.error(
              `Dados incompletos para processar recompensa do Envio ID ${envio.id}. Campanha ou Vendedor ausentes.`,
            );
            // Lance um erro para quebrar a transação, pois algo está errado
            throw new Error(`Falha ao obter dados completos para recompensa do Envio ${envio.id}.`);
          }

          // Passa o 'tx' (TransactionClient) para garantir atomicidade total
          await this.recompensaService.processarGatilhos(
            tx,
            envioAtualizado, // Passa o envio JÁ ATUALIZADO para VALIDADO
            campanha,
            vendedor,
          );

          this.logger.log(`Gatilhos de recompensa processados para Envio ID ${envioAtualizado.id}.`);
        });
      } else {
        // -----------------------------------------------------------------------
        // REJEITADO ou CONFLITO_MANUAL: Atualizar status diretamente
        // -----------------------------------------------------------------------
        await this.prisma.envioVenda.update({
          where: { id: envio.id },
          data: {
            status: resultado.status,
            motivoRejeicao: resultado.motivo,
            motivoRejeicaoVendedor: resultado.motivoVendedor, // Salva mensagem formal para vendedor
          },
        });


        this.logger.log(
          `Envio ID ${envio.id} atualizado para ${resultado.status}. Motivo: ${resultado.motivo}`,
        );
      }
    }
  }

  /**
   * ==========================================================================
   * MÉTODO: obterMapeamento
   * ==========================================================================
   * 
   * Busca o mapeamento de colunas salvo no perfil do usuário.
   * 
   * @param usuarioId - ID do usuário
   * @returns Mapeamento salvo ou null se não houver
   */
  async obterMapeamento(usuarioId: string) {
    this.logger.log(`Buscando mapeamento para usuário ${usuarioId}`);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { mapeamentoPlanilhaSalvo: true },
    });

    return usuario?.mapeamentoPlanilhaSalvo || null;
  }

  /**
   * ==========================================================================
   * MÉTODO: salvarMapeamento
   * ==========================================================================
   * 
   * Salva o mapeamento de colunas no perfil do usuário.
   * 
   * @param usuarioId - ID do usuário
   * @param mapeamento - Objeto com o mapeamento de colunas
   */
  async salvarMapeamento(usuarioId: string, mapeamento: Record<string, string>) {
    this.logger.log(`Salvando mapeamento para usuário ${usuarioId}`);

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { mapeamentoPlanilhaSalvo: mapeamento },
    });

    this.logger.log(`Mapeamento salvo com sucesso para usuário ${usuarioId}`);
  }

  /**
   * ==========================================================================
   * MÉTODO: _buscarERevalidarPedidosRejeitados (DEPRECATED - Sprint 19.5)
   * ==========================================================================
   * 
   * @deprecated Esta função foi substituída pelo loop principal unificado.
   * Agora todos os status não-validados (EM_ANALISE, REJEITADO, CONFLITO_MANUAL)
   * são processados no método processarPlanilha() de forma unificada.
   * 
   * Mantida apenas para referência histórica. NÃO USAR.
   * 
   * Busca pedidos REJEITADOS de campanhas ativas e tenta revalidá-los com
   * os dados da nova planilha. Se encontrar o pedido na planilha atual com
   * dados corretos, altera o status para VALIDADO.
   * 
   * REGRA CRÍTICA: Apenas pedidos REJEITADOS podem ser revalidados.
   * Pedidos VALIDADOS não devem ser processados novamente.
   * 
   * @param linhasPlanilha - Linhas da planilha atual
   * @param mapaInvertido - Mapa invertido de colunas
   * @param campanhaId - ID da campanha sendo processada (ou "TODAS")
   * @returns Array de pedidos revalidados com sucesso
   */
  private async _buscarERevalidarPedidosRejeitados(
    linhasPlanilha: any[],
    mapaInvertido: Record<string, string>,
    campanhaId: string,
  ): Promise<any[]> {
    this.logger.log(`\n========== INICIANDO REVALIDAÇÃO DE PEDIDOS REJEITADOS ==========`);

    // Buscar campanhas ativas
    const whereFilterCampanha = campanhaId === 'TODAS' 
      ? { status: 'ATIVA' }
      : { id: campanhaId, status: 'ATIVA' };

    const campanhasAtivas = await this.prisma.campanha.findMany({
      where: whereFilterCampanha as any,
      select: {
        id: true,
        titulo: true,
        dataInicio: true,
        dataFim: true,
      },
    });

    if (campanhasAtivas.length === 0) {
      this.logger.log(`Nenhuma campanha ativa encontrada para revalidação.`);
      return [];
    }

    const campanhasAtivasIds = campanhasAtivas.map((c) => c.id);
    this.logger.log(`Campanhas ativas para revalidação: ${campanhasAtivasIds.length}`);

    // Buscar pedidos REJEITADOS dessas campanhas
    const pedidosRejeitados = await this.prisma.envioVenda.findMany({
      where: {
        status: 'REJEITADO',
        campanhaId: {
          in: campanhasAtivasIds,
        },
      },
      include: {
        vendedor: {
          include: {
            optica: {
              include: {
                matriz: true,
              },
            },
          },
        },
        campanha: {
          include: {
            produtosCampanha: true,
          },
        },
        requisito: {
          include: {
            condicoes: true,
            regraCartela: {
              include: {
                campanha: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Pedidos REJEITADOS encontrados: ${pedidosRejeitados.length}`);

    if (pedidosRejeitados.length === 0) {
      return [];
    }

    // Array para armazenar pedidos revalidados com sucesso
    const pedidosRevalidados: any[] = [];

    // Processar cada pedido rejeitado
    for (const envioRejeitado of pedidosRejeitados) {
      this.logger.log(`\n--- Tentando revalidar Pedido: ${envioRejeitado.numeroPedido} ---`);
      
      // Buscar o pedido na planilha atual
      const tipoPedidoCampanha = (envioRejeitado.requisito.regraCartela.campanha as any).tipoPedido || 'OS_OP_EPS';
      const { linhasEncontradas, status: statusBusca, motivo: motivoBusca } = this._buscarPedidoPlanilha(
        envioRejeitado.numeroPedido,
        linhasPlanilha,
        mapaInvertido,
        tipoPedidoCampanha,
      );

      if (statusBusca !== 'OK') {
        this.logger.log(`Pedido ${envioRejeitado.numeroPedido} não encontrado na planilha atual. Continua REJEITADO.`);
        continue;
      }

      this.logger.log(`✓ Pedido ${envioRejeitado.numeroPedido} encontrado na planilha! Tentando revalidar...`);

      // Aplicar as mesmas validações do processamento normal
      const linhaPlanilha = linhasEncontradas[0];
      const nomeColunaCnpj = mapaInvertido['CNPJ_OTICA'];
      const cnpjDaPlanilha = this._limparCnpj(linhaPlanilha[nomeColunaCnpj]);
      const cnpjDoVendedor = this._limparCnpj(envioRejeitado.vendedor.optica?.cnpj);

      // Validação 1: CNPJ
      let validacaoPassou = false;

      if (cnpjDaPlanilha === cnpjDoVendedor) {
        validacaoPassou = true;
      } else {
        const matriz = envioRejeitado.vendedor.optica?.matriz;
        const cnpjDaMatriz = this._limparCnpj(matriz?.cnpj);
        if (matriz && cnpjDaMatriz && cnpjDaPlanilha === cnpjDaMatriz) {
          validacaoPassou = true;
        }
      }

      if (!validacaoPassou) {
        this.logger.log(`Revalidação falhou: CNPJ divergente.`);
        continue;
      }

      // Validação 2: Regras
      // IMPORTANTE: Usar envioRejeitado.campanha (que tem produtosCampanha incluído)
      // ao invés de envioRejeitado.requisito.regraCartela.campanha (que não tem)
      const resultadoRegras = this._aplicarRegras(
        linhasEncontradas,
        envioRejeitado.requisito,
        mapaInvertido,
        envioRejeitado.campanha,
        envioRejeitado.numeroPedido,
        tipoPedidoCampanha,
      );

      if (!resultadoRegras.sucesso) {
        this.logger.log(`Revalidação falhou: Regras não satisfeitas - ${resultadoRegras.motivo}`);
        continue;
      }

      // Validação 3: Código de Referência
      const colunaCodRefPlanilha = mapaInvertido['CODIGO_REFERENCIA'];
      const codigoReferencia = String(linhaPlanilha[colunaCodRefPlanilha] || '').trim().toUpperCase();

      if (!codigoReferencia) {
        this.logger.log(`Revalidação falhou: Código de referência vazio.`);
        continue;
      }

      const produtoCampanha = envioRejeitado.campanha.produtosCampanha?.find(
        (p: any) => p.codigoRef === codigoReferencia
      );

      if (!produtoCampanha) {
        this.logger.log(`Revalidação falhou: Código '${codigoReferencia}' não cadastrado na campanha.`);
        continue;
      }

      // ✅ TODAS AS VALIDAÇÕES PASSARAM! Revalidar pedido
      this.logger.log(`🎉 REVALIDAÇÃO BEM-SUCEDIDA! Pedido ${envioRejeitado.numeroPedido} será marcado como VALIDADO.`);

      const dataValidacaoOriginal = envioRejeitado.dataValidacao;
      const motivoRejeicaoOriginal = envioRejeitado.motivoRejeicao;

      pedidosRevalidados.push({
        envioId: envioRejeitado.id,
        numeroPedido: envioRejeitado.numeroPedido,
        campanha: {
          id: envioRejeitado.campanha.id,
          titulo: envioRejeitado.campanha.titulo,
          dataInicio: envioRejeitado.campanha.dataInicio,
          dataFim: envioRejeitado.campanha.dataFim,
        },
        dataRejeicaoOriginal: dataValidacaoOriginal,
        motivoRejeicaoOriginal: motivoRejeicaoOriginal,
        codigoReferenciaUsado: codigoReferencia,
        valorPontosReaisRecebido: produtoCampanha.pontosReais,
        vendedor: {
          id: envioRejeitado.vendedor.id,
          nome: envioRejeitado.vendedor.nome,
          email: envioRejeitado.vendedor.email,
        },
        optica: {
          id: envioRejeitado.vendedor.optica?.id,
          nome: envioRejeitado.vendedor.optica?.nome,
          cnpj: envioRejeitado.vendedor.optica?.cnpj,
        },
      });
    }

    this.logger.log(`\n========== FIM DA REVALIDAÇÃO: ${pedidosRevalidados.length} pedidos revalidados ==========\n`);

    return pedidosRevalidados;
  }

  /**
   * ==========================================================================
   * MÉTODO: salvarHistoricoValidacao (NOVO - Sprint 19)
   * ==========================================================================
   * 
   * Salva um registro completo do processamento de validação no histórico.
   * Só deve ser chamado para validações REAIS (ehSimulacao = false).
   * 
   * @param adminId - ID do admin que executou a validação
   * @param campanhaId - ID da campanha (ou "TODAS")
   * @param relatorio - Objeto com contadores (validado, rejeitado, etc)
   * @param detalhes - Array completo com detalhes de todos os envios
   */
  async salvarHistoricoValidacao(
    adminId: string,
    campanhaId: string,
    relatorio: any,
    detalhes: any[],
  ) {
    this.logger.log(`Salvando histórico de validação para admin ${adminId}...`);

    await this.prisma.historicoValidacao.create({
      data: {
        adminId,
        campanhaId,
        ehSimulacao: false,
        totalProcessados: relatorio.validado + relatorio.rejeitado + relatorio.conflito_manual + relatorio.em_analise + (relatorio.revalidado || 0),
        validado: relatorio.validado,
        rejeitado: relatorio.rejeitado,
        conflito_manual: relatorio.conflito_manual,
        em_analise: relatorio.em_analise,
        revalidado: relatorio.revalidado || 0,
        detalhesJson: detalhes,
      },
    });

    this.logger.log(`✓ Histórico salvo com sucesso!`);
  }

  /**
   * ==========================================================================
   * MÉTODO: buscarHistoricoValidacoes (NOVO - Sprint 19)
   * ==========================================================================
   * 
   * Busca o histórico de validações com filtros opcionais.
   * 
   * @param filtros - Filtros opcionais (adminId, campanhaId, dataInicio, dataFim)
   * @returns Array de históricos de validação
   */
  async buscarHistoricoValidacoes(filtros?: {
    adminId?: string;
    campanhaId?: string;
    dataInicio?: Date;
    dataFim?: Date;
    limit?: number;
  }) {
    const where: any = {
      ehSimulacao: false, // Só retorna validações reais
    };

    if (filtros?.adminId) {
      where.adminId = filtros.adminId;
    }

    if (filtros?.campanhaId) {
      where.campanhaId = filtros.campanhaId;
    }

    if (filtros?.dataInicio || filtros?.dataFim) {
      where.dataHora = {};
      if (filtros.dataInicio) {
        where.dataHora.gte = filtros.dataInicio;
      }
      if (filtros.dataFim) {
        where.dataHora.lte = filtros.dataFim;
      }
    }

    const historicos = await this.prisma.historicoValidacao.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: {
        dataHora: 'desc',
      },
      take: filtros?.limit || 50,
    });

    return historicos;
  }

  /**
   * ==========================================================================
   * MÉTODO: obterEstatisticasDashboard (NOVO - Sprint 19)
   * ==========================================================================
   * 
   * Retorna estatísticas agregadas para o dashboard do admin.
   * Inclui: taxa de validação, principais motivos de rejeição, etc.
   */
  async obterEstatisticasDashboard() {
    this.logger.log(`Calculando estatísticas do dashboard...`);

    // Buscar últimos 30 dias de histórico
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);

    const historicos = await this.prisma.historicoValidacao.findMany({
      where: {
        dataHora: {
          gte: dataInicio,
        },
      },
      include: {
        admin: {
          select: {
            nome: true,
          },
        },
      },
      orderBy: {
        dataHora: 'desc',
      },
    });

    // Calcular totais
    const totais = historicos.reduce(
      (acc, h) => ({
        totalProcessados: acc.totalProcessados + h.totalProcessados,
        validado: acc.validado + h.validado,
        rejeitado: acc.rejeitado + h.rejeitado,
        conflito_manual: acc.conflito_manual + h.conflito_manual,
        em_analise: acc.em_analise + h.em_analise,
        revalidado: acc.revalidado + h.revalidado,
      }),
      { totalProcessados: 0, validado: 0, rejeitado: 0, conflito_manual: 0, em_analise: 0, revalidado: 0 },
    );

    // Taxa de validação
    const taxaValidacao = totais.totalProcessados > 0 
      ? ((totais.validado / totais.totalProcessados) * 100).toFixed(2)
      : '0.00';

    // Principais motivos de rejeição (buscar de detalhesJson)
    const motivosRejeicao: Record<string, number> = {};
    
    for (const historico of historicos) {
      const detalhes = historico.detalhesJson as any[];
      if (Array.isArray(detalhes)) {
        for (const detalhe of detalhes) {
          if (detalhe.status === 'REJEITADO' && detalhe.motivo) {
            const motivo = detalhe.motivo;
            motivosRejeicao[motivo] = (motivosRejeicao[motivo] || 0) + 1;
          }
        }
      }
    }

    // Ordenar motivos por frequência
    const topMotivosRejeicao = Object.entries(motivosRejeicao)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([motivo, count]) => ({ motivo, count }));

    // Validações por dia (últimos 30 dias)
    const validacoesPorDia = historicos.reduce((acc, h) => {
      const dia = h.dataHora.toISOString().split('T')[0];
      if (!acc[dia]) {
        acc[dia] = { validado: 0, rejeitado: 0, total: 0 };
      }
      acc[dia].validado += h.validado;
      acc[dia].rejeitado += h.rejeitado;
      acc[dia].total += h.totalProcessados;
      return acc;
    }, {} as Record<string, any>);

    return {
      totais,
      taxaValidacao: parseFloat(taxaValidacao),
      topMotivosRejeicao,
      validacoesPorDia,
      totalValidacoes: historicos.length,
    };
  }
}
