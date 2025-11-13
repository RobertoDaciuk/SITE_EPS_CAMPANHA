/**
 * ============================================================================
 * MAIN.TS - Ponto de Entrada da Aplicação EPS Campanhas
 * ============================================================================
 * * Descrição:
 * Este é o arquivo de bootstrap (ignição) da aplicação NestJS. Ele é
 * responsável por criar a instância da aplicação, configurar middlewares
 * globais, habilitar recursos como CORS e validação, e iniciar o servidor
 * HTTP na porta especificada.
 * * Fluxo de Inicialização:
 * 1. NestFactory cria a aplicação a partir do AppModule
 * 2. ConfigService é obtido para ler variáveis de ambiente
 * 3. Middlewares e configurações globais são aplicados
 * 4. Servidor HTTP inicia e escuta na porta definida
 * 5. Logs de inicialização são exibidos no console
 * * Configurações Globais Aplicadas:
 * - CORS (Cross-Origin Resource Sharing)
 * - Validação automática de DTOs (class-validator)
 * - Prefixo global de rotas (/api)
 * - Parsing automático de JSON
 * - Logs estruturados
 * * @module Main
 * ============================================================================
 */

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import type { Request, Response, NextFunction } from 'express';

/**
 * Função de bootstrap (inicialização) da aplicação.
 * * @async
 * @returns {Promise<void>} Promise que resolve quando o servidor está rodando
 */
async function bootstrap(): Promise<void> {
  /**
   * Logger dedicado para eventos de inicialização.
   */
  const logger = new Logger('Bootstrap');

  try {
    logger.log('🚀 Iniciando aplicação EPS Campanhas...');

    /**
     * Cria a instância da aplicação NestJS a partir do AppModule.
     */
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    logger.log('✅ Instância da aplicação criada com sucesso');

    // =========================================================================
    // CONFIGURAÇÃO: Servir Arquivos Estáticos
    // =========================================================================

    /**
     * Serve arquivos estáticos da pasta public
     * Arquivos em public/uploads/campanhas/ ficam acessíveis em /uploads/campanhas/
     * 
     * Exemplo:
     * - Arquivo físico: public/uploads/campanhas/imagem.jpg
     * - URL de acesso: http://localhost:3000/uploads/campanhas/imagem.jpg
     */
    const staticPath = join(process.cwd(), 'public');
    logger.log(`📁 Pasta de estáticos resolvida para: ${staticPath}`);

    app.use('/uploads', (req: Request, _res: Response, next: NextFunction) => {
      logger.verbose(`📂 [Static] ${req.method} ${req.originalUrl}`);
      next();
    });

    app.useStaticAssets(staticPath, {
      setHeaders(res: Response) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      },
    });

    logger.log('✅ Arquivos estáticos configurados (pasta public/)');

    // =========================================================================
    // CONFIGURAÇÃO: Serviço de Variáveis de Ambiente
    // =========================================================================

    /**
     * Obtém o ConfigService da aplicação para ler variáveis do .env.
     */
    const configService = app.get(ConfigService);

    // =========================================================================
    // CONFIGURAÇÃO: Porta do Servidor
    // =========================================================================

    /**
     * Porta em que o servidor HTTP irá escutar requisições.
     */
    const porta = configService.get<number>('PORT') || 3000;

    // =========================================================================
    // CONFIGURAÇÃO: CORS (Cross-Origin Resource Sharing)
    // =========================================================================

    /**
     * Habilita CORS para permitir requisições do frontend Next.js.
     */
    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN') || 'http://localhost:3001',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    logger.log('✅ CORS habilitado');

    // =========================================================================
    // CONFIGURAÇÃO: Prefixo Global de Rotas
    // =========================================================================

    /**
     * Define prefixo global "/api" para todas as rotas.
     */
    app.setGlobalPrefix('api');

    logger.log('✅ Prefixo global "/api" configurado');

    // =========================================================================
    // CONFIGURAÇÃO: Validação Automática de DTOs
    // =========================================================================

    /**
     * Habilita validação automática de dados de entrada usando class-validator.
     */
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Remove propriedades extras (previne mass assignment)
        forbidNonWhitelisted: true, // Lança erro se receber propriedades extras
        transform: true, // Transforma payloads em DTOs tipados
        transformOptions: {
          enableImplicitConversion: true, // Converte tipos automaticamente
        },
      }),
    );

    logger.log('✅ Validação automática de DTOs habilitada');

    // =========================================================================
    // INICIALIZAÇÃO: Iniciar Servidor HTTP
    // =========================================================================

    /**
     * Inicia o servidor HTTP e escuta requisições na porta definida.
     */
    await app.listen(porta);

    // =========================================================================
    // LOGS: Informações de Inicialização
    // =========================================================================

    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('🎉 Servidor EPS Campanhas está rodando!');
    logger.log(`🌐 URL: http://localhost:${porta}/api`);
    logger.log(`📦 Ambiente: ${configService.get<string>('NODE_ENV') || 'development'}`);
    logger.log(`🗄️  Banco: PostgreSQL (Prisma conectado)`);
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (erro) {
    // =========================================================================
    // TRATAMENTO DE ERROS: Falha na Inicialização
    // =========================================================================

    logger.error('❌ Erro crítico ao inicializar a aplicação:', erro);
    
    /**
     * Encerra o processo com código de erro (1).
     */
    process.exit(1);
  }
}

/**
 * Executa a função de bootstrap.
 */
bootstrap();