/**
 * ============================================================================
 * Serviço interno: RecompensaService (Gatilho de recompensas gamificadas)
 * ============================================================================
 * Este serviço opera dentro de transações Prisma para garantir atomicidade:
 * - Não possui controller/rota pública.
 * - Deve ser injetado e chamado de outros módulos internos (ex: ValidacaoService).
 * - Recebe obrigatoriamente o Prisma Transaction Client (tx: PrismaTx) para
 *   operar toda a lógica atômica (livro-razão, financeiro, pontos, notificação).
 * - Utiliza o modelo CartelaConcluida como "trava" para garantir idempotência
 *   do pagamento de cartelas (P2002 = já existe, sem duplicidade).
 *
 * VERSÃO 7.0 - Sistema de Saldo e Pagamentos:
 * - MUDANÇA CRÍTICA: Multiplicador calculado POR ENVIO (baseado em dataEnvio)
 * - MUDANÇA CRÍTICA: Adiciona ao saldo do vendedor/gerente (não cria RelatorioFinanceiro)
 * - MUDANÇA CRÍTICA: Comissão do gerente sobre valor ORIGINAL (sem multiplicador)
 * ============================================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PrismaClient, Usuario, Campanha, EnvioVenda } from '@prisma/client';

// Tipo de client transacional para uso seguro do tx:
type PrismaTx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>;

@Injectable()
export class RecompensaService {
  private readonly logger = new Logger(RecompensaService.name);

  /**
   * ============================================================================
   * PROCESSAR GATILHOS DE RECOMPENSA (REFATORADO - V7.1 - FIX RECURSIVO)
   * ============================================================================
   *
   * Processa todos os gatilhos financeiros e de pontuação quando uma cartela
   * é completada, garantindo atomicidade total via Prisma Transaction Client.
   *
   * CORREÇÃO CRÍTICA (Sprint 19.6 - Bug de Pontos Pendentes):
   * Implementa análise RECURSIVA de cartelas subsequentes após transbordamento.
   * Quando C1 completa e transborda para C2, agora verifica se C2 também está
   * completa e dispara recompensas em cascata (C2→C3→C4...).
   *
   * Fluxo CORRIGIDO:
   * 1. Cria notificação de venda aprovada
   * 2. Verifica se cartela ATUAL está completa
   * 3. SE completa:
   *    a. Tenta criar registro no livro-razão (idempotência via P2002)
   *    b. Aplica recompensas (adiciona ao saldo)
   *    c. Cria próxima cartela N+1 se necessário
   *    d. ✅ NOVO: Analisa RECURSIVAMENTE cartelas subsequentes
   *
   * @param tx - Prisma Transaction Client para garantir atomicidade
   * @param envioValidado - Envio de venda que foi validado
   * @param campanha - Campanha à qual o envio pertence
   * @param vendedor - Vendedor que completou a cartela (inclui gerente se houver)
   * @returns Promise<void>
   *
   * @throws {Error} Se operação falhar (causa rollback da transação principal)
   *
   * @example
   * await this.recompensaService.processarGatilhos(tx, envio, campanha, vendedor);
   */
  public async processarGatilhos(
    tx: Prisma.TransactionClient,
    envioValidado: EnvioVenda,
    campanha: Campanha,
    vendedor: Usuario & { gerente: Usuario | null }
  ): Promise<void> {
    // Gatilho 1 — Notificação simples (venda validada)
    await tx.notificacao.create({
      data: {
        mensagem: `Sua venda '${envioValidado.numeroPedido}' foi APROVADA.`,
        usuarioId: vendedor.id,
      },
    });

    // Gatilho 2 — Análise recursiva de completude de cartelas
    // ✅ NOVO: Processa cartela atual E todas as subsequentes que possam ter sido completadas por transbordamento
    await this._analisarCartelasRecursivamente(
      tx,
      campanha,
      vendedor,
      envioValidado.numeroCartelaAtendida!
    );
  }

  /**
   * ============================================================================
   * ANÁLISE RECURSIVA DE CARTELAS (REFATORADO - V7.2 - FIX CASCADING FAILURE)
   * ============================================================================
   *
   * Método crítico que implementa a "máquina de estados" de progressão atômica.
   * Analisa uma cartela e, se completa, dispara recompensas e analisa a próxima.
   *
   * CORREÇÃO CRÍTICA (Sprint 19.7 - Falha em Cascata):
   * A versão V7.1 tinha um bug fatal: quando encontrava uma cartela já processada
   * (P2002), fazia `return` e parava a recursão. Isso quebrava o processamento
   * de C2, C3, C4... em cascata.
   *
   * SOLUÇÃO DOS BUGS:
   * - Bug A (Pontos Pendentes C2/C3): Idempotência não para mais a recursão
   * - Bug B (C4 não criada): Recursão continua independente de idempotência
   * - Bug C (Falha em Cascata): Separação entre "já processada" e "continuar"
   *
   * Fluxo Recursivo CORRIGIDO:
   * 1. Verifica se cartela ATUAL está completa para este vendedor
   * 2. SE NÃO completa: Para recursão (aguarda mais pedidos) ← ÚNICO PONTO DE PARADA
   * 3. SE completa:
   *    a. [AÇÃO 1] Tenta criar registro no livro-razão (idempotência via P2002)
   *    b. [AÇÃO 2] Aplica recompensas APENAS se não foi processada antes
   *    c. [AÇÃO 3] Cria cartela N+1 (SEMPRE, independente de idempotência)
   *    d. [AÇÃO 6] Chama recursão para N+1 (SEMPRE, independente de idempotência)
   *
   * CHAVE DA CORREÇÃO: Idempotência (P2002) marca flag `jaProcessada`, mas NÃO
   * interrompe o fluxo. A recursão SEMPRE continua se a cartela está completa.
   *
   * @param tx - Prisma Transaction Client
   * @param campanha - Campanha
   * @param vendedor - Vendedor (com gerente) ← vendedorId passado corretamente
   * @param numeroCartela - Número da cartela a analisar
   * @returns Promise<void>
   *
   * @private
   */
  private async _analisarCartelasRecursivamente(
    tx: Prisma.TransactionClient,
    campanha: Campanha,
    vendedor: Usuario & { gerente: Usuario | null },
    numeroCartela: number
  ): Promise<void> {
    this.logger.log(
      `\n[RECURSÃO C${numeroCartela}] 🔍 Analisando cartela ${numeroCartela} (Vendedor: ${vendedor.nome}, ID: ${vendedor.id})`
    );

    // ========================================
    // PASSO 1: Verificar se cartela está completa
    // ========================================
    const estaCompleta = await this._verificarCartelaCompleta(
      tx,
      numeroCartela,
      vendedor.id,
      campanha.id
    );

    if (!estaCompleta) {
      this.logger.log(
        `[RECURSÃO C${numeroCartela}] ⏸️  Cartela ${numeroCartela} NÃO está completa. Parando recursão (aguardando mais pedidos).`
      );
      return; // ← ÚNICO PONTO DE PARADA: Cartela incompleta
    }

    this.logger.log(
      `[RECURSÃO C${numeroCartela}] ✅ Cartela ${numeroCartela} está COMPLETA! Iniciando processamento atômico...`
    );

    // ========================================
    // AÇÃO 1: Criar registro no livro-razão (idempotência)
    // ========================================
    let jaProcessada = false; // ← Flag para controlar se já foi paga

    const cartelaJaConcluida = await tx.cartelaConcluida.findUnique({
      where: {
        vendedorId_campanhaId_numeroCartela: {
          vendedorId: vendedor.id,
          campanhaId: campanha.id,
          numeroCartela,
        },
      },
    });

    if (cartelaJaConcluida) {
      jaProcessada = true;
      this.logger.log(
        `[RECURSÃO C${numeroCartela}] ℹ️ Cartela ${numeroCartela} já possui registro no livro-razão (id=${cartelaJaConcluida.id}).`
      );
    } else {
      await tx.cartelaConcluida.create({
        data: {
          vendedorId: vendedor.id,
          campanhaId: campanha.id,
          numeroCartela,
        },
      });
      this.logger.log(
        `[RECURSÃO C${numeroCartela}] 📝 Registro criado no livro-razão (CartelaConcluida).`
      );
    }

    // ========================================
    // AÇÃO 2: Aplicar recompensas (APENAS se não foi processada)
    // ========================================
    if (!jaProcessada) {
      this.logger.log(
        `[RECURSÃO C${numeroCartela}] 💰 Aplicando recompensas para Cartela ${numeroCartela}...`
      );
      await this._aplicarRecompensas(tx, campanha, vendedor, numeroCartela);
      this.logger.log(
        `[RECURSÃO C${numeroCartela}] ✅ Recompensas aplicadas (pontos adicionados ao saldo).`
      );
    } else {
      this.logger.log(
        `[RECURSÃO C${numeroCartela}] ⏭️  Pulando recompensas (já foram aplicadas anteriormente).`
      );
    }

    // ========================================
    // AÇÃO 3: Criar próxima cartela N+1 (SEMPRE, independente de idempotência)
    // ========================================
    this.logger.log(
      `[RECURSÃO C${numeroCartela}] 🔧 Garantindo que estrutura da Cartela ${numeroCartela + 1} existe...`
    );
    await this._criarProximaCartelaSeNecessario(tx, campanha.id, numeroCartela);

    // ========================================
    // AÇÃO 6: RECURSÃO - Analisar próxima cartela (SEMPRE, independente de idempotência)
    // ========================================
    const proximaCartela = numeroCartela + 1;
    this.logger.log(
      `[RECURSÃO C${numeroCartela}] 🔄 Disparando análise recursiva para Cartela ${proximaCartela}...`
    );
    
    // ✅ PROVA DE ESCOPO: vendedor.id está sendo passado (via objeto vendedor)
    await this._analisarCartelasRecursivamente(tx, campanha, vendedor, proximaCartela);
    
    this.logger.log(
      `[RECURSÃO C${numeroCartela}] ✅ Análise recursiva concluída para ramificação C${numeroCartela}.`
    );
  }

  /**
   * Verifica se uma cartela está completa (todos os requisitos atendidos).
   *
   * Busca as regras da cartela e verifica se o vendedor já validou a
   * quantidade necessária de vendas para cada requisito.
   *
   * @param tx - Prisma Transaction Client
   * @param numeroCartela - Número da cartela (1, 2, 3, ...)
   * @param vendedorId - ID do vendedor
   * @param campanhaId - ID da campanha
   * @returns true se todos os requisitos foram atendidos, false caso contrário
   *
   * @private
   */
  private async _verificarCartelaCompleta(
    tx: Prisma.TransactionClient,
    numeroCartela: number,
    vendedorId: string,
    campanhaId: string
  ): Promise<boolean> {
    const regraCartela = await tx.regraCartela.findFirst({
      where: { campanhaId, numeroCartela },
      include: { requisitos: true },
    });

    if (!regraCartela) {
      this.logger.warn(
        `[VERIFICAR C${numeroCartela}] Cartela não encontrada para campanha ${campanhaId}.`
      );
      return false;
    }

    if (regraCartela.requisitos.length === 0) {
      this.logger.warn(
        `[VERIFICAR C${numeroCartela}] Cartela ${numeroCartela} não possui requisitos. Considerando como incompleta.`
      );
      return false;
    }

    const enviosValidos = await tx.envioVenda.findMany({
      where: {
        vendedorId,
        campanhaId,
        status: 'VALIDADO',
        numeroCartelaAtendida: numeroCartela,
      },
      select: {
        id: true,
        requisito: {
          select: {
            ordem: true,
          },
        },
      },
    });

    const contagemPorOrdem = new Map<number, number>();
    for (const envio of enviosValidos) {
      const ordem = envio.requisito?.ordem;
      if (typeof ordem !== 'number') {
        this.logger.warn(
          `[VERIFICAR C${numeroCartela}] Envio ${envio.id} sem ordem associada ao requisito. Ignorando no cálculo.`
        );
        continue;
      }
      contagemPorOrdem.set(ordem, (contagemPorOrdem.get(ordem) ?? 0) + 1);
    }

    const todasRequisitosAtendidos = regraCartela.requisitos.every((req) => {
      const quantidadeValidada = contagemPorOrdem.get(req.ordem) ?? 0;
      const requisitoAtendido = quantidadeValidada >= req.quantidade;
      if (!requisitoAtendido) {
        this.logger.log(
          `[VERIFICAR C${numeroCartela}] Requisito ordem=${req.ordem} incompleto: ${quantidadeValidada}/${req.quantidade}.`
        );
      }
      return requisitoAtendido;
    });

    if (todasRequisitosAtendidos) {
      this.logger.log(
        `[VERIFICAR C${numeroCartela}] ✅ Todos os requisitos atendidos para o vendedor ${vendedorId}.`
      );
    }

    return todasRequisitosAtendidos;
  }

  /**
   * ============================================================================
   * APLICAR RECOMPENSAS (REFATORADO COMPLETO - V7.0)
   * ============================================================================
   *
   * MUDANÇAS CRÍTICAS:
   * 1. Calcula multiplicador POR ENVIO (baseado em dataEnvio vs período do evento)
   * 2. Adiciona valores ao SALDO do vendedor (não cria RelatorioFinanceiro)
   * 3. Comissão do gerente calculada sobre valor ORIGINAL (sem multiplicador)
   * 4. Marca envios como pontosAdicionadosAoSaldo = true
   * 5. NÃO marca como pontosLiquidados (financeiro fará isso)
   *
   * FLUXO:
   * 1. Buscar envios da cartela não processados (pontosAdicionadosAoSaldo = false)
   * 2. Para cada envio, buscar evento ativo DURANTE dataEnvio
   * 3. Calcular multiplicador e valor final por envio
   * 4. Atualizar envios com multiplicadorAplicado e valorFinalComEvento
   * 5. Somar valores originais (para comissão do gerente)
   * 6. Somar valores finais (para saldo do vendedor)
   * 7. Atualizar saldo do vendedor
   * 8. Atualizar saldo do gerente (comissão sobre valor original)
   * 9. Marcar envios como pontosAdicionadosAoSaldo = true
   * 10. Criar notificação de cartela completa
   *
   * @param tx - Prisma Transaction Client
   * @param campanha - Campanha com valores de recompensa
   * @param vendedor - Vendedor que completou a cartela (inclui gerente se houver)
   * @param numeroCartela - Número da cartela completada
   * @returns Promise<void>
   *
   * @private
   */
  private async _aplicarRecompensas(
    tx: Prisma.TransactionClient,
    campanha: Campanha,
    vendedor: Usuario & { gerente: Usuario | null },
    numeroCartela: number,
  ) {
    this.logger.log(
      `\n========== APLICANDO RECOMPENSAS - CARTELA ${numeroCartela} ==========`
    );
    this.logger.log(`Vendedor: ${vendedor.nome} (ID: ${vendedor.id})`);
    this.logger.log(`Campanha: ${campanha.titulo} (ID: ${campanha.id})`);

    // ========================================================================
    // PASSO 1: Buscar envios da cartela NÃO processados
    // ========================================================================
    const enviosDaCartela = await tx.envioVenda.findMany({
      where: {
        vendedorId: vendedor.id,
        campanhaId: campanha.id,
        numeroCartelaAtendida: numeroCartela,
        status: 'VALIDADO',
        pontosAdicionadosAoSaldo: false, // ✅ NOVO: Apenas não processados
      },
    });

    if (enviosDaCartela.length === 0) {
      this.logger.warn(
        `Nenhum envio não processado encontrado para Cartela ${numeroCartela}. Pulando recompensas.`
      );
      return;
    }

    this.logger.log(
      `Encontrados ${enviosDaCartela.length} envios não processados nesta cartela.`
    );

    // ========================================================================
    // PASSO 2: Calcular multiplicador POR ENVIO
    // ========================================================================
    type EnvioComCalculo = {
      id: string;
      numeroPedido: string;
      dataEnvio: Date;
      valorOriginal: number;
      multiplicador: number;
      valorFinal: number;
      nomeEvento: string | null;
    };

    const enviosComCalculo: EnvioComCalculo[] = [];

    for (const envio of enviosDaCartela) {
      const valorOriginal = envio.valorPontosReaisRecebido
        ? (typeof envio.valorPontosReaisRecebido === 'object' && 'toNumber' in envio.valorPontosReaisRecebido
            ? (envio.valorPontosReaisRecebido as any).toNumber()
            : Number(envio.valorPontosReaisRecebido))
        : 0;

      this.logger.log(
        `\n--- Processando Envio: ${envio.numeroPedido} ---`
      );
      this.logger.log(`  Data Envio: ${envio.dataEnvio.toISOString()}`);
      this.logger.log(`  Valor Original: R$ ${valorOriginal.toFixed(2)}`);

      // Buscar evento ativo DURANTE o envio
      const eventoAtivo = await tx.eventoEspecial.findFirst({
        where: {
          campanhaId: campanha.id,
          ativo: true,
          dataInicio: { lte: envio.dataEnvio }, // ✅ CORRIGIDO: Usa dataEnvio
          dataFim: { gte: envio.dataEnvio },     // ✅ CORRIGIDO: Usa dataEnvio
        },
      });

      let multiplicador = 1.0;
      let nomeEvento: string | null = null;

      if (eventoAtivo) {
        multiplicador = eventoAtivo.multiplicador
          ? (typeof eventoAtivo.multiplicador === 'object' && 'toNumber' in eventoAtivo.multiplicador
              ? (eventoAtivo.multiplicador as any).toNumber()
              : Number(eventoAtivo.multiplicador))
          : 1.0;
        nomeEvento = eventoAtivo.nome;
        this.logger.log(
          `  ✅ Evento Ativo: "${eventoAtivo.nome}" (${multiplicador}x)`
        );
      } else {
        this.logger.log(`  ❌ Nenhum evento ativo durante o envio`);
      }

      const valorFinal = valorOriginal * multiplicador;

      this.logger.log(`  Multiplicador: ${multiplicador}x`);
      this.logger.log(`  Valor Final: R$ ${valorFinal.toFixed(2)}`);

      enviosComCalculo.push({
        id: envio.id,
        numeroPedido: envio.numeroPedido,
        dataEnvio: envio.dataEnvio,
        valorOriginal,
        multiplicador,
        valorFinal,
        nomeEvento,
      });
    }

    // ========================================================================
    // PASSO 3: Atualizar envios com multiplicador e valor final
    // ========================================================================
    this.logger.log(`\n--- Atualizando ${enviosComCalculo.length} envios com valores calculados ---`);

    for (const envioCalc of enviosComCalculo) {
      await tx.envioVenda.update({
        where: { id: envioCalc.id },
        data: {
          multiplicadorAplicado: envioCalc.multiplicador,
          valorFinalComEvento: envioCalc.valorFinal,
          pontosAdicionadosAoSaldo: true, // ✅ Marca como processado
        },
      });
      this.logger.log(
        `  ✓ Envio ${envioCalc.numeroPedido}: multiplicador=${envioCalc.multiplicador}x, valorFinal=R$ ${envioCalc.valorFinal.toFixed(2)}`
      );
    }

    // ========================================================================
    // PASSO 4: Calcular totais
    // ========================================================================
    const valorTotalOriginal = enviosComCalculo.reduce(
      (acc, e) => acc + e.valorOriginal,
      0
    );
    const valorTotalFinal = enviosComCalculo.reduce(
      (acc, e) => acc + e.valorFinal,
      0
    );

    this.logger.log(`\n--- TOTAIS ---`);
    this.logger.log(`  Valor Total Original: R$ ${valorTotalOriginal.toFixed(2)}`);
    this.logger.log(`  Valor Total Final (com eventos): R$ ${valorTotalFinal.toFixed(2)}`);
    this.logger.log(`  Ganho por Eventos: R$ ${(valorTotalFinal - valorTotalOriginal).toFixed(2)}`);

    // ========================================================================
    // PASSO 5: Atualizar saldo do VENDEDOR
    // ========================================================================
    const saldoAnteriorVendedor = await tx.usuario.findUnique({
      where: { id: vendedor.id },
      select: { saldoPontos: true },
    });

    const saldoAnteriorVendedorNum = saldoAnteriorVendedor?.saldoPontos
      ? (typeof saldoAnteriorVendedor.saldoPontos === 'object' && 'toNumber' in saldoAnteriorVendedor.saldoPontos
          ? (saldoAnteriorVendedor.saldoPontos as any).toNumber()
          : Number(saldoAnteriorVendedor.saldoPontos))
      : 0;

    await tx.usuario.update({
      where: { id: vendedor.id },
      data: {
        saldoPontos: { increment: valorTotalFinal }, // ✅ Adiciona ao saldo
      },
    });

    this.logger.log(`\n--- SALDO VENDEDOR ---`);
    this.logger.log(`  Saldo Anterior: R$ ${saldoAnteriorVendedorNum.toFixed(2)}`);
    this.logger.log(`  Incremento: R$ ${valorTotalFinal.toFixed(2)}`);
    this.logger.log(`  Saldo Novo: R$ ${(saldoAnteriorVendedorNum + valorTotalFinal).toFixed(2)}`);

    // ========================================================================
    // PASSO 6: Atualizar saldo do GERENTE (comissão sobre valor ORIGINAL)
    // ========================================================================
    const percentual = campanha.percentualGerente
      ? (typeof campanha.percentualGerente === 'object' && 'toNumber' in campanha.percentualGerente
          ? (campanha.percentualGerente as any).toNumber()
          : Number(campanha.percentualGerente))
      : 0;

    if (percentual > 0 && vendedor.gerente) {
      const valorComissaoGerente = valorTotalOriginal * percentual; // ✅ Sobre valor ORIGINAL (percentual já está em formato decimal 0.1 = 10%)

      const saldoAnteriorGerente = await tx.usuario.findUnique({
        where: { id: vendedor.gerente.id },
        select: { saldoPontos: true },
      });

      const saldoAnteriorGerenteNum = saldoAnteriorGerente?.saldoPontos
        ? (typeof saldoAnteriorGerente.saldoPontos === 'object' && 'toNumber' in saldoAnteriorGerente.saldoPontos
            ? (saldoAnteriorGerente.saldoPontos as any).toNumber()
            : Number(saldoAnteriorGerente.saldoPontos))
        : 0;

      await tx.usuario.update({
        where: { id: vendedor.gerente.id },
        data: {
          saldoPontos: { increment: valorComissaoGerente },
        },
      });

      this.logger.log(`\n--- SALDO GERENTE ---`);
      this.logger.log(`  Gerente: ${vendedor.gerente.nome} (ID: ${vendedor.gerente.id})`);
      this.logger.log(`  Percentual: ${(percentual * 100).toFixed(0)}%`);
      this.logger.log(`  Base de Cálculo: R$ ${valorTotalOriginal.toFixed(2)} (ORIGINAL, sem multiplicador)`);
      this.logger.log(`  Comissão: R$ ${valorComissaoGerente.toFixed(2)}`);
      this.logger.log(`  Saldo Anterior: R$ ${saldoAnteriorGerenteNum.toFixed(2)}`);
      this.logger.log(`  Saldo Novo: R$ ${(saldoAnteriorGerenteNum + valorComissaoGerente).toFixed(2)}`);
    } else {
      this.logger.log(`\n--- SEM COMISSÃO PARA GERENTE ---`);
      if (!vendedor.gerente) {
        this.logger.log(`  Motivo: Vendedor não possui gerente associado`);
      } else {
        this.logger.log(`  Motivo: Percentual de comissão = ${(percentual * 100).toFixed(0)}%`);
      }
    }

    // ========================================================================
    // PASSO 7: Notificação de cartela completa
    // ========================================================================
    const eventosAplicados = enviosComCalculo
      .filter((e) => e.nomeEvento)
      .map((e) => e.nomeEvento)
      .filter((v, i, a) => a.indexOf(v) === i); // Unique

    const mensagemEventos = eventosAplicados.length > 0
      ? ` Eventos aplicados: ${eventosAplicados.join(', ')}.`
      : '';

    await tx.notificacao.create({
      data: {
        mensagem: `🎉 Parabéns! Você completou a Cartela ${numeroCartela} da campanha '${campanha.titulo}'. R$ ${valorTotalFinal.toFixed(2)} adicionados ao seu saldo!${mensagemEventos}`,
        usuarioId: vendedor.id,
      },
    });

    this.logger.log(`\n✅ Recompensas aplicadas com sucesso!`);
    this.logger.log(`========== FIM DA APLICAÇÃO DE RECOMPENSAS ==========\n`);
  }

  /**
   * ============================================================================
   * CRIAR PRÓXIMA CARTELA (Modo Auto-Replicante - Spillover)
   * ============================================================================
   *
   * Cria automaticamente a próxima cartela (N+1) se não existir.
   * Replica todos os requisitos e condições da cartela anterior.
   *
   * Este é o coração do sistema de Spillover Auto-Replicante:
   * - Quando uma cartela é completada, verifica se a próxima existe
   * - Se não existir, cria automaticamente
   * - Copia TODOS os requisitos mantendo a mesma ordem (crítico!)
   * - Copia TODAS as condições de validação
   * - Permite que o spillover funcione infinitamente (Cartela 1 → 2 → 3 → ...)
   *
   * @param tx - Prisma Transaction Client para garantir atomicidade
   * @param campanhaId - ID da campanha
   * @param numeroCartelaCompleta - Número da cartela que acabou de ser completada
   * @returns Promise<void>
   *
   * @private
   */
  private async _criarProximaCartelaSeNecessario(
    tx: Prisma.TransactionClient,
    campanhaId: string,
    numeroCartelaCompleta: number
  ): Promise<void> {
    const proximoNumero = numeroCartelaCompleta + 1;

    // ========================================
    // PASSO 1: Verificar se a próxima cartela já existe
    // ========================================
    const cartelaExistente = await tx.regraCartela.findFirst({
      where: {
        campanhaId,
        numeroCartela: proximoNumero
      },
    });

    if (cartelaExistente) {
      this.logger.log(
        `[AUTO-REPLICANTE] Cartela ${proximoNumero} já existe (ID: ${cartelaExistente.id}). Nenhuma criação necessária.`
      );
      return; // Já existe, não precisa criar
    }

    // ========================================
    // PASSO 2: Buscar a cartela anterior (completa) com todos os requisitos
    // ========================================
    const cartelaAnterior = await tx.regraCartela.findFirst({
      where: {
        campanhaId,
        numeroCartela: numeroCartelaCompleta
      },
      include: {
        requisitos: {
          include: {
            condicoes: true,
          },
        },
      },
    });

    if (!cartelaAnterior) {
      this.logger.error(
        `[AUTO-REPLICANTE] ❌ ERRO: Cartela ${numeroCartelaCompleta} não encontrada para replicação. Abortando criação.`
      );
      return;
    }

    if (cartelaAnterior.requisitos.length === 0) {
      this.logger.warn(
        `[AUTO-REPLICANTE] ⚠️ Cartela ${numeroCartelaCompleta} não possui requisitos. Não é possível replicar.`
      );
      return;
    }

    // ========================================
    // PASSO 3: Criar a nova cartela
    // ========================================
    this.logger.log(
      `[AUTO-REPLICANTE] 🔄 Criando automaticamente Cartela ${proximoNumero} (replicando ${cartelaAnterior.requisitos.length} requisitos)...`
    );

    const novaCartela = await tx.regraCartela.create({
      data: {
        numeroCartela: proximoNumero,
        descricao: cartelaAnterior.descricao
          ? `${cartelaAnterior.descricao} (Auto-Replicante)`
          : `Cartela ${proximoNumero} (Auto-Replicante)`,
        campanhaId,
      },
    });

    // ========================================
    // PASSO 4: Replicar todos os requisitos da cartela anterior
    // ========================================
    let requisitosReplicados = 0;
    let condicoesReplicadas = 0;

    for (const requisitoAnterior of cartelaAnterior.requisitos) {
      // Criar novo requisito com mesmas propriedades
      const novoRequisito = await tx.requisitoCartela.create({
        data: {
          descricao: requisitoAnterior.descricao,
          quantidade: requisitoAnterior.quantidade,
          tipoUnidade: requisitoAnterior.tipoUnidade,
          ordem: requisitoAnterior.ordem, // ✅ CRÍTICO: Mantém a mesma ordem (spillover)
          regraCartelaId: novaCartela.id,
        },
      });

      requisitosReplicados++;

      // ========================================
      // PASSO 5: Replicar todas as condições do requisito
      // ========================================
      for (const condicaoAnterior of requisitoAnterior.condicoes) {
        await tx.condicaoRequisito.create({
          data: {
            campo: condicaoAnterior.campo,
            operador: condicaoAnterior.operador,
            valor: condicaoAnterior.valor,
            requisitoId: novoRequisito.id,
          },
        });

        condicoesReplicadas++;
      }
    }

    // ========================================
    // LOG DE SUCESSO
    // ========================================
    this.logger.log(
      `[AUTO-REPLICANTE] ✅ Cartela ${proximoNumero} criada com sucesso!`
    );
    this.logger.log(
      `[AUTO-REPLICANTE]    → ${requisitosReplicados} requisitos replicados`
    );
    this.logger.log(
      `[AUTO-REPLICANTE]    → ${condicoesReplicadas} condições replicadas`
    );
    this.logger.log(
      `[AUTO-REPLICANTE]    → ID da nova cartela: ${novaCartela.id}`
    );
  }
}
