/**
 * ============================================================================
 * MÓDULO: FINANCEIRO (Sistema de Lotes de Pagamento)
 * ============================================================================
 *
 * Módulo dedicado à gestão de pagamentos em lote com arquitetura de 3 fases:
 * 1. Preview/Visualização (Query - Read-only)
 * 2. Geração de Lote (Command - Cria relatórios PENDENTES)
 * 3. Processamento de Lote (Command - Transaction atômica)
 *
 * GARANTIAS:
 * - Segregação Query/Command (CQRS)
 * - Atomicidade transacional
 * - Auditabilidade completa
 * - Idempotência
 * - Reversibilidade
 *
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';
import { FinanceiroController } from './financeiro.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceiroController],
  providers: [FinanceiroService],
  exports: [FinanceiroService],
})
export class FinanceiroModule {}
