/**
 * ============================================================================
 * CAMPANHA MODULE - Módulo de Campanhas
 * ============================================================================
 * 
 * Descrição:
 * Módulo que encapsula toda a funcionalidade de gerenciamento de campanhas.
 * 
 * Componentes:
 * - CampanhaController: Rotas HTTP
 * - CampanhaService: Lógica de negócio
 * 
 * Dependências:
 * - PrismaModule: Acesso ao banco de dados (importado globalmente no AppModule)
 * - Guards/Decorators: Usados diretamente (não precisam ser importados aqui)
 * 
 * @module CampanhasModule
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { CampanhaController } from './campanha.controller';
import { CampanhaService } from './campanha.service';

/**
 * Módulo de campanhas.
 * 
 * Agrupa controller e service para gerenciamento de campanhas.
 */
@Module({
  /**
   * Controllers: Expõem rotas HTTP.
   */
  controllers: [CampanhaController],

  /**
   * Providers: Serviços disponíveis para injeção de dependência.
   */
  providers: [CampanhaService],

  /**
   * Exports: Serviços exportados para outros módulos (se necessário).
   * 
   * Por enquanto, não exportamos nada (campanhas são autocontidas).
   * No futuro, se outros módulos precisarem acessar CampanhaService,
   * adicione aqui: exports: [CampanhaService]
   */
})
export class CampanhaModule {}
