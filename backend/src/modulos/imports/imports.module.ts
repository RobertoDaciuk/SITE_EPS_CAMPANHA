import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Módulo de importação de produtos com staging
 * Sprint 20 - Refatoração de Importação com Mapeamento de Colunas
 */
@Module({
  imports: [PrismaModule],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
