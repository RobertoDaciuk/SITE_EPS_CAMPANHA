/**
 * ============================================================================
 * AUTENTICACAO CONTROLLER - Rotas HTTP de Autenticação (REFATORADO)
 * ============================================================================
 *
 * REFATORAÇÃO (Sprint 18.2 - Segurança Avançada):
 * - NOVO: Decorator @Public() em todas as rotas (após Guards globais) 
 * - NOVO: Rate Limiting específico em /resetar-senha (3 tentativas/min) 
 * - NOVO: Injeção de @Request() para auditoria (IP, User-Agent) 
 * - MELHORADO: Documentação TSDoc sobre segurança 
 *
 * Descrição:
 * Controlador responsável por expor endpoints HTTP para registro e login
 * de usuários. Todas as rotas deste controller são PÚBLICAS (não requerem
 * autenticação JWT), mas são protegidas por Rate Limiting.
 *
 * Base URL: /api/autenticacao
 *
 * Rotas Públicas (marcadas com @Public()): 
 * - POST /api/autenticacao/registrar (10 req/min - global) 
 * - POST /api/autenticacao/login (10 req/min - global) 
 * - POST /api/autenticacao/resetar-senha (3 req/min - específico) 
 *
 * Segurança: 
 * - Registro: Cria usuário com status PENDENTE (não pode logar até aprovação) 
 * - Login: Valida status antes de gerar token (apenas ATIVO pode logar) 
 * - Senhas: Sempre criptografadas com bcrypt antes de salvar 
 * - Tokens: Assinados com JWT_SECRET, expiram conforme JWT_EXPIRES_IN 
 * - Rate Limiting: ThrottlerGuard global (10 req/min) + específico em reset (3 req/min) 
 * - Auditoria: Todas as tentativas registradas em LogAutenticacao 
 *
 * @module AutenticacaoModule
 * ============================================================================
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { AutenticacaoService } from './autenticacao.service';
import { RegistrarUsuarioDto } from './dto/registrar-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { ResetarSenhaDto } from './dto/resetar-senha.dto';
import { Public } from '../comum/decorators/public.decorator';

/**
 * Controller de autenticação.
 * * Base URL: /autenticacao
 * * Todas as rotas são públicas (marcadas com @Public()). 
 */
@Controller('autenticacao')
export class AutenticacaoController {
  /**
   * Construtor do AutenticacaoController.
   * * @param autenticacaoService - Serviço de autenticação
   */
  constructor(private readonly autenticacaoService: AutenticacaoService) {}

  /**
   * POST /autenticacao/registrar
   * * Rota pública para auto-registro de vendedores. 
   * * NOVO (Vulnerabilidade #2 e #11): 
   * - Decorator @Public() para permitir acesso sem JWT 
   * - Necessário após configuração de Guards globais 
   * * NOVO (Vulnerabilidade #9): 
   * - Injeção de @Request() para passar objeto req ao service 
   * - Service extrai IP e User-Agent para auditoria 
   * * Fluxo: 
   * 1. Vendedor preenche formulário com seus dados 
   * 2. Frontend valida CNPJ da ótica (rota pública de óticas) 
   * 3. Frontend envia dados + oticaId para esta rota 
   * 4. Backend cria usuário com status PENDENTE e papel VENDEDOR 
   * 5. Admin precisa aprovar (alterar status para ATIVO) 
   * 6. Apenas após aprovação, vendedor pode fazer login 
   * * Segurança: 
   * - Rate Limiting: 10 requisições por minuto (ThrottlerGuard global) 
   * - Validação de DTO: class-validator valida todos os campos 
   * - CPF sanitizado: Remove pontuação antes de salvar 
   * - Senha criptografada: bcrypt com 10 salt rounds 
   * - Status PENDENTE: Vendedor não pode logar até aprovação 
   * - Auditoria: Tentativas registradas em LogAutenticacao 
   * * @param dados - DTO com dados do novo vendedor 
   * @param req - Objeto Request (para extrair IP e User-Agent) 
   * @returns Mensagem de sucesso 
   * @throws ConflictException - Se email ou CPF já cadastrado 
   * @throws BadRequestException - Se dados inválidos (validação de DTO) 
   * * @example
   * POST /autenticacao/registrar
   * Body:
   * {
   * "nome": "João Silva",
   * "email": "joao@example.com",
   * "cpf": "123.456.789-00",
   * "senha": "Senha@123",
   * "oticaId": "uuid-da-otica"
   * }
   * * Response 201:
   * {
   * "mensagem": "Cadastro realizado com sucesso! Aguarde aprovação...",
   * "usuario": {
   * "id": "uuid",
   * "nome": "João Silva",
   * "email": "joao@example.com"
   * }
   * }
   */
  @Public()
  @Post('registrar')
  @HttpCode(HttpStatus.CREATED)
  async registrar(
    @Body() dados: RegistrarUsuarioDto,
    @Request() req: any,
  ) {
    return this.autenticacaoService.registrar(dados, req);
  }

  /**
   * POST /autenticacao/login
   * * Rota pública para login de qualquer tipo de usuário. 
   * * NOVO (Vulnerabilidade #2 e #11): 
   * - Decorator @Public() para permitir acesso sem JWT 
   * * NOVO (Vulnerabilidade #5): 
   * - Timing attack mitigado no service (bcrypt.compare sempre executado) 
   * * NOVO (Vulnerabilidade #9): 
   * - Injeção de @Request() para auditoria 
   * * Fluxo: 
   * 1. Usuário envia email e senha 
   * 2. Service busca usuário pelo email 
   * 3. Service compara senha (bcrypt.compare SEMPRE executado) 
   * 4. Service verifica status (deve ser ATIVO) 
   * 5. Service gera token JWT se válido 
   * 6. Service registra log de auditoria 
   * 7. Retorna token e dados do usuário 
   * * Segurança: 
   * - Rate Limiting: 10 requisições por minuto (ThrottlerGuard global) 
   * - Timing attack: Mitigado (tempo constante de resposta) 
   * - Mensagens genéricas: Previne enumeração de usuários 
   * - Status ATIVO: Apenas usuários aprovados podem logar 
   * - Auditoria: Todas as tentativas registradas (sucesso e falha) 
   * * @param dados - DTO com email e senha 
   * @param req - Objeto Request (para extrair IP e User-Agent) 
   * @returns Token JWT e dados do usuário 
   * @throws UnauthorizedException - Se credenciais inválidas ou status não ATIVO 
   * * @example
   * POST /autenticacao/login
   * Body:
   * {
   * "email": "joao@example.com",
   * "senha": "Senha@123"
   * }
   * * Response 200:
   * {
   * "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   * "usuario": {
   * "id": "uuid",
   * "nome": "João Silva",
   * "email": "joao@example.com",
   * "papel": "VENDEDOR",
   * "otica": {
   * "id": "uuid",
   * "nome": "Ótica Exemplo"
   * }
   * }
   * }
   * * Response 401 (credenciais inválidas):
   * {
   * "statusCode": 401,
   * "message": "Credenciais inválidas."
   * }
   * * Response 401 (status não ATIVO):
   * {
   * "statusCode": 401,
   * "message": "Sua conta ainda não foi aprovada pelo administrador."
   * }
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dados: LoginDto,
    @Request() req: any,
  ) {
    return this.autenticacaoService.login(dados, req);
  }

  /**
   * POST /autenticacao/resetar-senha
   * * Rota pública para reset de senha usando token temporário. 
   * * NOVO (Vulnerabilidade #2 e #11): 
   * - Decorator @Public() para permitir acesso sem JWT 
   * * NOVO (Vulnerabilidade #7): 
   * - Rate Limiting específico: 3 requisições por minuto 
   * - Previne brute force de tokens 
   * - Sobrescreve limite global (10 req/min) 
   * * NOVO (Vulnerabilidade #9): 
   * - Injeção de @Request() para auditoria 
   * * Fluxo: 
   * 1. Admin gera token via POST /usuarios/:id/iniciar-reset-senha 
   * 2. Admin entrega token original ao usuário (email, WhatsApp, etc.) 
   * 3. Usuário acessa esta rota pública 
   * 4. Usuário fornece token + nova senha 
   * 5. Backend valida token, expiração e atualiza senha 
   * 6. Backend descarta token (uso único) 
   * 7. Backend registra log de auditoria 
   * * Segurança: 
   * - Rate Limiting: 3 requisições por minuto (específico) 
   * - Previne brute force de tokens (tentativas ilimitadas) 
   * - Mais restritivo que limite global (10 req/min) 
   * - Token hash: Token original NUNCA armazenado (apenas hash SHA-256) 
   * - Uso único: Token descartado após uso bem-sucedido 
   * - Expiração: Token expira em 1 hora (configurável) 
   * - Auditoria: Tentativas inválidas registradas 
   * * @param dados - DTO com token e nova senha 
   * @param req - Objeto Request (para extrair IP e User-Agent) 
   * @returns Mensagem de sucesso 
   * @throws NotFoundException - Se token inválido ou expirado 
   * @throws BadRequestException - Se nova senha inválida (validação de DTO) 
   * * @example
   * POST /autenticacao/resetar-senha
   * Body:
   * {
   * "token": "abc123def456...",
   * "novaSenha": "NovaSenha@123"
   * }
   * * Response 200:
   * {
   * "mensagem": "Senha resetada com sucesso! Você já pode fazer login..."
   * }
   * * Response 404 (token inválido):
   * {
   * "statusCode": 404,
   * "message": "Token de reset inválido ou expirado..."
   * }
   * * Response 429 (rate limit excedido):
   * {
   * "statusCode": 429,
   * "message": "ThrottlerException: Too Many Requests"
   * }
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resetar-senha')
  @HttpCode(HttpStatus.OK)
  async resetarSenha(
    @Body() dados: ResetarSenhaDto,
    @Request() req: any,
  ) {
    return this.autenticacaoService.resetarSenha(dados, req);
  }

  /**
   * POST /autenticacao/validar-token-reset
   *
   * Rota pública para validar token de reset de senha ANTES de efetivamente resetar.
   *
   * REFATORAÇÃO (Fase 2 - 100% Absoluto):
   * - NOVO: Endpoint para validação intermediária de token
   * - CORREÇÃO: Frontend chamava este endpoint que não existia
   *
   * Fluxo:
   * 1. Usuário recebe token do admin
   * 2. Usuário insere email + token no frontend
   * 3. Frontend chama este endpoint para validar (Step1 do wizard)
   * 4. Se válido, frontend exibe Step2 para nova senha
   * 5. Frontend chama /resetar-senha para efetivar mudança
   *
   * Segurança:
   * - Rate Limiting: 3 requisições por minuto (mesmo de /resetar-senha)
   * - Previne brute force de tokens
   * - Não altera senha (apenas valida)
   * - Token permanece válido após validação
   *
   * @param dados - DTO com email e token
   * @returns Mensagem de sucesso se token válido
   * @throws NotFoundException - Se token inválido ou expirado
   *
   * @example
   * POST /autenticacao/validar-token-reset
   * Body:
   * {
   *   "email": "joao@example.com",
   *   "token": "abc123def456..."
   * }
   *
   * Response 200:
   * {
   *   "mensagem": "Token válido. Você pode prosseguir para redefinir sua senha."
   * }
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('validar-token-reset')
  @HttpCode(HttpStatus.OK)
  async validarTokenReset(
    @Body() dados: { email: string; token: string },
  ) {
    return this.autenticacaoService.validarTokenReset(dados);
  }
}