import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  UploadStagingResponseDto,
  MapColumnsDto,
  ProcessStagingResponseDto,
  SearchStagingQueryDto,
  SearchStagingResponseDto,
  PreviewProductDto,
} from './dto/staging.dto';

/**
 * Serviço de staging para importação de produtos em massa
 * Sprint 20 - Refatoração de Importação com Mapeamento de Colunas
 */
@Injectable()
export class ImportsService {
  private readonly uploadDir = path.join(process.cwd(), 'public', 'uploads', 'staging');

  constructor(private readonly prisma: PrismaService) {
    // Criar diretório se não existir
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * ENDPOINT 1: Upload de arquivo e extração de headers
   * POST /imports/staging/upload
   */
  async uploadFile(file: Express.Multer.File): Promise<UploadStagingResponseDto> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    // Validar extensão
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      throw new BadRequestException('Formato de arquivo não suportado. Use .xlsx, .xls ou .csv');
    }

    try {
      // Gerar ID único para o arquivo
      const fileId = uuidv4();
      const filePath = path.join(this.uploadDir, `${fileId}${ext}`);

      // Salvar arquivo temporário
      fs.writeFileSync(filePath, file.buffer);

      // Ler arquivo para extrair headers usando ExcelJS
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        fs.unlinkSync(filePath);
        throw new BadRequestException('Arquivo não contém planilhas');
      }

      // Extrair headers da primeira linha
      const firstRow = worksheet.getRow(1);
      const headers: string[] = [];
      
      firstRow.eachCell((cell, colNumber) => {
        const value = cell.value;
        if (value) {
          headers.push(String(value).trim());
        }
      });

      if (headers.length === 0) {
        fs.unlinkSync(filePath);
        throw new BadRequestException('Arquivo não contém headers válidos');
      }

      const rowCount = worksheet.rowCount - 1; // Excluindo header

      return {
        fileId,
        headers,
        rowCount: Math.max(0, rowCount),
      };
    } catch (error) {
      throw new BadRequestException(`Erro ao processar arquivo: ${error.message}`);
    }
  }

  /**
   * ENDPOINT 2: Mapear colunas e processar arquivo para staging
   * POST /imports/staging/map
   */
  async processFileToStaging(dto: MapColumnsDto): Promise<ProcessStagingResponseDto> {
    const filePath = this.getFilePath(dto.fileId);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Arquivo temporário não encontrado ou expirado');
    }

    try {
      // Ler arquivo usando ExcelJS
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('Arquivo não contém planilhas');
      }

      // Extrair headers da primeira linha
      const firstRow = worksheet.getRow(1);
      const headers: string[] = [];
      const headerMap: Map<string, number> = new Map();
      
      firstRow.eachCell((cell, colNumber) => {
        const value = String(cell.value || '').trim();
        if (value) {
          headers.push(value);
          headerMap.set(value, colNumber);
        }
      });

      // Validar se as colunas mapeadas existem
      if (!headerMap.has(dto.columnRef)) {
        throw new BadRequestException(`Coluna "${dto.columnRef}" não encontrada no arquivo`);
      }
      if (!headerMap.has(dto.columnPoints)) {
        throw new BadRequestException(`Coluna "${dto.columnPoints}" não encontrada no arquivo`);
      }

      const colRefIndex = headerMap.get(dto.columnRef);
      const colPointsIndex = headerMap.get(dto.columnPoints);
      const colNameIndex = dto.columnName ? headerMap.get(dto.columnName) : undefined;

      // Preparar dados para bulk insert
      const stagingRecords = [];
      const preview: PreviewProductDto[] = [];

      // Iterar sobre as linhas (começando da linha 2, pulando header)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Pular header

        const codigoRef = String(row.getCell(colRefIndex).value || '').trim();
        const pontosStr = String(row.getCell(colPointsIndex).value || '0').trim();
        const nomeProduto = colNameIndex ? String(row.getCell(colNameIndex).value || '').trim() : undefined;

        // Skip linhas inválidas
        if (!codigoRef || codigoRef === '') {
          return;
        }

        // Converter pontos para número
        let pontos = 0;
        try {
          pontos = parseFloat(pontosStr.replace(',', '.'));
          if (isNaN(pontos)) {
            pontos = 0;
          }
        } catch {
          pontos = 0;
        }

        const record = {
          sessionId: dto.sessionId,
          codigoRef,
          pontosReais: pontos,
          nomeProduto: nomeProduto || null,
          metadata: null,
        };

        stagingRecords.push(record);

        // Adicionar aos primeiros 5 para preview
        if (preview.length < 5) {
          preview.push({
            codigoRef,
            pontos,
            nomeProduto,
          });
        }
      });

      if (stagingRecords.length === 0) {
        throw new BadRequestException('Nenhum registro válido encontrado no arquivo');
      }

      // Bulk insert no banco usando batches para melhor performance
      const batchSize = 1000;
      for (let i = 0; i < stagingRecords.length; i += batchSize) {
        const batch = stagingRecords.slice(i, i + batchSize);
        await this.prisma.productImportStaging.createMany({
          data: batch,
          skipDuplicates: false,
        });
      }

      // Limpar arquivo temporário após processamento
      fs.unlinkSync(filePath);

      return {
        inserted: stagingRecords.length,
        sessionId: dto.sessionId,
        preview,
      };
    } catch (error) {
      // Limpar arquivo em caso de erro
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException(`Erro ao processar arquivo: ${error.message}`);
    }
  }

  /**
   * ENDPOINT 3: Buscar produtos no staging
   * GET /imports/staging/search?sessionId=X&q=Y&limit=50
   */
  async searchStaging(query: SearchStagingQueryDto): Promise<SearchStagingResponseDto> {
    const limit = query.limit || 50;

    // Construir WHERE clause
    const where: any = {
      sessionId: query.sessionId,
    };

    if (query.q && query.q.trim() !== '') {
      const searchTerm = query.q.trim();
      where.OR = [
        { codigoRef: { contains: searchTerm, mode: 'insensitive' } },
      ];
      
      // Se existe nomeProduto, adicionar na busca
      if (query.q) {
        where.OR.push({ nomeProduto: { contains: searchTerm, mode: 'insensitive' } });
      }
    }

    // Buscar produtos
    const products = await this.prisma.productImportStaging.findMany({
      where,
      take: limit,
      orderBy: { codigoRef: 'asc' },
    });

    // Contar total na sessão
    const totalInSession = await this.prisma.productImportStaging.count({
      where: { sessionId: query.sessionId },
    });

    return {
      products: products.map(p => ({
        codigoRef: p.codigoRef,
        pontos: Number(p.pontosReais),
        nomeProduto: p.nomeProduto,
      })),
      totalInSession,
    };
  }

  /**
   * Limpar produtos de uma sessão específica
   */
  async clearSession(sessionId: string): Promise<void> {
    await this.prisma.productImportStaging.deleteMany({
      where: { sessionId },
    });
  }

  /**
   * Limpar arquivos temporários antigos (pode ser executado via CRON)
   */
  async cleanupOldFiles(): Promise<void> {
    const files = fs.readdirSync(this.uploadDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const file of files) {
      const filePath = path.join(this.uploadDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Limpar registros de staging antigos (pode ser executado via CRON)
   */
  async cleanupOldStagingRecords(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await this.prisma.productImportStaging.deleteMany({
      where: {
        criadoEm: {
          lt: yesterday,
        },
      },
    });
  }

  /**
   * Helper: obter path do arquivo temporário
   */
  private getFilePath(fileId: string): string {
    const files = fs.readdirSync(this.uploadDir);
    const file = files.find(f => f.startsWith(fileId));
    
    if (!file) {
      throw new NotFoundException('Arquivo não encontrado');
    }
    
    return path.join(this.uploadDir, file);
  }
}
