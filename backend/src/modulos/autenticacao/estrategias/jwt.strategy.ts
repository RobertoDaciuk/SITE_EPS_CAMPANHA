/**
 * ============================================================================
 * JWT STRATEGY - Estratégia de Autenticação JWT com Passport
 * ============================================================================
 * * Descrição:
 * Esta classe implementa a estratégia JWT do Passport.js para validar
 * tokens JWT em rotas protegidas. Ela extrai o token do header Authorization,
 * verifica a assinatura e decodifica o payload.
 * * ATUALIZAÇÃO (Sprint 18.3 - Tipagem Robusta):
 * - O tipo do campo 'papel' no payload foi atualizado para usar o enum
 * PapelUsuario do Prisma Client para garantir tipagem estrita.
 * * Como Funciona:
 * 1. Cliente envia requisição com header: Authorization: Bearer <token>
 * 2. ExtractJwt extrai o token do header
 * 3. Passport verifica a assinatura do token usando JWT_SECRET
 * 4. Se válido, o método validate() é chamado com o payload decodificado
 * 5. O retorno de validate() é injetado em request.user
 * 6. O controller pode acessar os dados do usuário via @Request()
 * * @module AutenticacaoModule
 * ============================================================================
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PapelUsuario } from '@prisma/client'; // Importação do Enum PapelUsuario

/**
 * Interface para o payload do JWT após decodificação.
 * * O campo 'papel' usa o enum PapelUsuario para garantir que o valor
 * decodificado seja tipado corretamente.
 */
interface JwtPayload {
  sub: string; // ID do usuário (Subject)
  email: string; // Email do usuário
  papel: PapelUsuario; // Papel do usuário (ADMIN, GERENTE, VENDEDOR)
  iat?: number; // Issued At (timestamp de emissão)
  exp?: number; // Expiration (timestamp de expiração)
}

/**
 * Estratégia JWT para validação de tokens.
 * * Estende PassportStrategy com a estratégia 'jwt' do passport-jwt.
 * Esta classe é registrada automaticamente pelo Passport quando o
 * módulo é inicializado.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Construtor da estratégia JWT.
   * * Configura como o token será extraído e validado:
   * - jwtFromRequest: Extrai token do header Authorization (Bearer token)
   * - ignoreExpiration: false - Rejeita tokens expirados
   * - secretOrKey: Chave secreta para verificar assinatura (do .env)
   * * @param configService - Serviço de configuração para ler JWT_SECRET
   */
  constructor(private readonly configService: ConfigService) {
    super({
      /**
       * Define como extrair o token JWT da requisição.
       */
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      /**
       * Define se tokens expirados devem ser aceitos.
       */
      ignoreExpiration: false,

      /**
       * Chave secreta usada para verificar a assinatura do token.
       * * Lida do arquivo .env (variável JWT_SECRET).
       */
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Método de validação do payload do token JWT.
   * * O retorno deste método é injetado automaticamente em request.user
   * em todas as rotas protegidas com @UseGuards(JwtAuthGuard).
   * * @param payload - Payload decodificado do token JWT (tipado com PapelUsuario)
   * @returns Dados do usuário que serão injetados em request.user
   */
  async validate(payload: JwtPayload) {
    /**
     * Retorna o objeto do usuário que será anexado ao Request (req.user).
     * * Aqui, renomeamos 'sub' para 'id' para facilitar o uso nos controllers
     * e services, mantendo o tipo PapelUsuario.
     */
    return {
      id: payload.sub, // Renomeia 'sub' para 'id' para facilitar uso
      email: payload.email,
      papel: payload.papel,
    };
  }
}