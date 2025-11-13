import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

/**
 * DTO para resposta do upload de arquivo
 * Retorna os headers das colunas para o frontend fazer mapeamento
 */
export class UploadStagingResponseDto {
  fileId: string;
  headers: string[];
  rowCount: number;
}

/**
 * DTO para mapeamento de colunas e processamento do arquivo
 */
export class MapColumnsDto {
  @IsString()
  @IsNotEmpty()
  fileId: string;

  @IsString()
  @IsNotEmpty()
  columnRef: string;

  @IsString()
  @IsNotEmpty()
  columnPoints: string;

  @IsString()
  @IsOptional()
  columnName?: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

/**
 * DTO para resposta do processamento/mapeamento
 */
export class ProcessStagingResponseDto {
  inserted: number;
  sessionId: string;
  preview: PreviewProductDto[];
}

/**
 * DTO para preview de produto
 */
export class PreviewProductDto {
  codigoRef: string;
  pontos: number;
  nomeProduto?: string;
}

/**
 * DTO para busca de produtos no staging
 */
export class SearchStagingQueryDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsOptional()
  q?: string;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

/**
 * DTO para resposta de busca no staging
 */
export class SearchStagingResponseDto {
  products: PreviewProductDto[];
  totalInSession: number;
}
