/**
 * ============================================================================
 * AUTENTICACAO MODULE - Módulo de Autenticação e Registro (REFATORADO)
 * ============================================================================
 *
 * REFATORAÇÃO (Sprint 18.2 - Segurança Avançada):
 * - CORRIGIDO Vulnerabilidade #1: JWT_SECRET sem fallback inseguro
 * - NOVO: Validação obrigatória de JWT_SECRET (lança erro se ausente)
 * - NOVO: Validação de JWT_EXPIRES_IN (fallback seguro para 7d)
 * - MELHORADO: Documentação TSDoc sobre configuração crítica de segurança
 *
 * Descrição:
 * Módulo responsável por toda a lógica de autenticação e registro de usuários.
 * Configura JWT, Passport e expõe rotas públicas de login/registro/reset.
 *
 * Dependências:
 * - PassportModule: Framework de autenticação
 * - JwtModule: Geração e validação de tokens JWT
 * - UsuarioModule: Acesso ao UsuarioService para operações de usuário
 *
 * Segurança Crítica:
 * - JWT_SECRET: DEVE estar configurado no .env, caso contrário sistema aborta
 * - JWT_EXPIRES_IN: Tempo de expiração dos tokens (padrão: 7 dias)
 * - Tokens são assinados com HS256 (HMAC-SHA256)
 *
 * @module AutenticacaoModule
 * ============================================================================
 */

import { Module, forwardRef } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AutenticacaoController } from './autenticacao.controller';
import { AutenticacaoService } from './autenticacao.service';
import { JwtStrategy } from './estrategias/jwt.strategy';
import { UsuarioModule } from '../usuarios/usuario.module';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Módulo de autenticação e registro de usuários.
 * * Configura:
 * - Passport com estratégia JWT
 * - JwtModule com validação obrigatória de JWT_SECRET
 * - Rotas públicas de autenticação (login, registro, reset)
 */
@Module({
  imports: [
    /**
     * PassportModule: Registra o framework Passport.js.
     * * defaultStrategy: Define 'jwt' como estratégia padrão para
     * AuthGuard('jwt') usado nos Guards.
     */
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    /**
     * JwtModule: Registra o módulo JWT com configuração assíncrona.
     * * REFATORAÇÃO (Vulnerabilidade #1):
     * - REMOVIDO: Fallback inseguro 'default-secret'
     * - ADICIONADO: Validação obrigatória de JWT_SECRET
     * * useFactory: Função assíncrona que recebe ConfigService e retorna
     * configuração do JWT. Executada durante inicialização do módulo.
     */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        /**
         * Extrai JWT_SECRET do .env.
         */
        const jwtSecret = configService.get<string>('JWT_SECRET');

        /**
         * VALIDAÇÃO CRÍTICA (NOVO - Vulnerabilidade #1):
         * * Se JWT_SECRET ausente, lança erro e aborta sistema.
         * Previne execução com chave insegura.
         */
        if (!jwtSecret) {
          throw new Error(
            '\n\nERRO CRÍTICO: JWT_SECRET não configurado no .env\n' +
            'Configure JWT_SECRET antes de iniciar o sistema.\n'
          );
        }

        /**
         * Extrai JWT_EXPIRES_IN do .env.
         * * Fallback seguro: '7d' (7 dias)
         */
        const jwtExpiresIn = configService.get<string>('JWT_EXPIRES_IN', '7d');

        /**
         * Retorna configuração do JwtModule.
         */
        
        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: jwtExpiresIn as any,
          },
        };
      },
    }),

    /**
     * UsuarioModule: Importa UsuarioService para operações de usuário.
     */
    forwardRef(() => UsuarioModule),

    /**
     * PrismaModule: Importa PrismaService para acesso ao banco.
     */
    PrismaModule,
  ],

  /**
   * Controllers: Expõe rotas HTTP de autenticação.
   */
  controllers: [AutenticacaoController],

  /**
   * Providers: Serviços e estratégias do módulo.
   */
  providers: [AutenticacaoService, JwtStrategy],

  /**
   * Exports: Serviços disponíveis para outros módulos.
   */
  exports: [AutenticacaoService, JwtModule],
})
export class AutenticacaoModule {}