/**
 * ============================================================================
 * APP MODULE - Módulo Raiz da Aplicação EPS Campanhas (REFATORADO - Segurança)
 * ============================================================================
 *
 * Descrição:
 * Este é o módulo raiz (root module) da aplicação NestJS. Ele orquestra
 * todos os módulos de feature (usuários, campanhas, autenticação, etc.) e
 * configura serviços globais necessários para o funcionamento da aplicação.
 *
 * REFATORAÇÃO (Sprint 18.2 - Segurança Avançada):
 * - NOVO: ThrottlerModule configurado globalmente (Rate Limiting)
 * - NOVO: JwtAuthGuard configurado como APP_GUARD (Secure by Default)
 * - CORRIGIDO Vulnerabilidade #2: Todas as rotas protegidas por padrão
 * - CORRIGIDO Vulnerabilidade #3: Rate Limiting ativo em todas as rotas
 * - MELHORADO: Documentação TSDoc sobre configuração de segurança
 *
 * Responsabilidades:
 * - Carregar variáveis de ambiente do arquivo .env (via ConfigModule)
 * - Importar o PrismaModule para conexão com banco de dados
 * - Importar módulos de features (OticaModule, AutenticacaoModule, etc.)
 * - Configurar middlewares, guards e interceptors globais
 * - Definir providers globais (ex: serviços de email, cache, etc.)
 * - Configurar Rate Limiting (Throttler) para prevenir abuso
 * - Configurar Guards de autenticação globais (Secure by Default)
 *
 * Segurança (NOVO):
 * - Throttler: Limita requisições para prevenir brute force e DoS
 * - 10 requisições por minuto por IP (padrão global)
 * - Rotas específicas podem sobrescrever com @Throttle()
 * - JwtAuthGuard: Protege TODAS as rotas por padrão (Secure by Default)
 * - Rotas públicas usam decorator @Public() para bypass
 * - Garante que nenhum endpoint fique desprotegido por esquecimento
 *
 * @module AppModule
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { AutenticacaoModule } from './modulos/autenticacao/autenticacao.module';
import { UsuarioModule } from './modulos/usuarios/usuario.module';
import { OticaModule } from './modulos/oticas/otica.module';
import { PerfilModule } from './modulos/perfil/perfil.module';
import { CampanhaModule } from './modulos/campanhas/campanha.module';
import { RankingModule } from './modulos/ranking/ranking.module';
import { DashboardModule } from './modulos/dashboard/dashboard.module';
import { EnvioVendaModule } from './modulos/envio-venda/envio-venda.module';
import { ValidacaoModule } from './modulos/validacao/validacao.module';
// Recompensa module removed from active scope
import { NotificacaoModule } from './modulos/notificacoes/notificacao.module';
import { RelatorioFinanceiroModule } from './modulos/relatorio-financeiro/relatorio-financeiro.module';
import { ConfiguracaoModule } from './modulos/configuracao/configuracao.module';
import { UploadModule } from './modulos/upload/upload.module';
import { FinanceiroModule } from './modulos/financeiro/financeiro.module';
import { ImportsModule } from './modulos/imports/imports.module';

import { JwtAuthGuard } from './modulos/comum/guards/jwt-auth.guard';

/**
 * AppModule - Módulo raiz da aplicação.
 * * Configura todos os módulos de feature, serviços globais e guards de segurança.
 */
@Module({
  imports: [
    /**
     * ConfigModule: Carrega variáveis de ambiente do arquivo .env.
     * * isGlobal: true permite acessar ConfigService em qualquer módulo
     * sem precisar importar ConfigModule explicitamente.
     */
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    /**
     * ThrottlerModule: Configura Rate Limiting global (NOVO - Vulnerabilidade #3).
     * * Previne ataques de:
     * - Brute Force: Tentativas ilimitadas de adivinhação de senhas
     * - DoS (Denial of Service): Sobrecarga do servidor com requisições
     * - Spam: Múltiplos registros/envios em curto período
     * * Configuração Padrão:
     * - ttl: 60000ms (1 minuto) - Janela de tempo para contagem de requisições
     * - limit: 10 - Máximo de 10 requisições por minuto por IP
     * * Rotas Específicas podem Sobrescrever:
     * @Throttle({ default: { limit: 3, ttl: 60000 } })
     * * Rotas podem Desabilitar:
     * @SkipThrottle()
     */
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    /**
     * PrismaModule: Provê PrismaService para acesso ao banco de dados.
     */
    PrismaModule,

    /**
     * Módulos de Feature (Domínio de Negócio)
     */
    AutenticacaoModule,
    UsuarioModule,
    OticaModule,
    PerfilModule,
  CampanhaModule,
  RankingModule,
    DashboardModule,
    EnvioVendaModule,
  ValidacaoModule,
    NotificacaoModule,
    RelatorioFinanceiroModule,
    ConfiguracaoModule,
    UploadModule,
    FinanceiroModule,
    ImportsModule,
    // ValoresReferenciaModule - REMOVIDO Sprint 18: Substituído por ProdutoCampanha
  ],

  controllers: [],

  /**
   * Providers: Serviços e Guards globais.
   * * NOVO (Sprint 18.2 - Segurança Avançada):
   * - ThrottlerGuard: Aplica Rate Limiting em TODAS as rotas
   * - JwtAuthGuard: Aplica autenticação JWT em TODAS as rotas (Secure by Default)
   */
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}