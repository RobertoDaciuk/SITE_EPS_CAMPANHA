import { Module } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { GerenteMatrizGuard } from './guards/gerente-matriz.guard'; // Importado
import { PrismaService } from '../../prisma/prisma.service'; // Importado para o GerenteMatrizGuard

/**
 * Módulo dedicado ao ranking e suas APIs.
 * Exporta RankingService para ser usado em outros módulos.
 */
@Module({
  controllers: [RankingController],
  providers: [
    RankingService,
    GerenteMatrizGuard, // Adicionado para injeção no controller
    PrismaService, // Garante que PrismaService esteja disponível para Guards e Services deste módulo
  ],
  exports: [RankingService],
})
export class RankingModule {}