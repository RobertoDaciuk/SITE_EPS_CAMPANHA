import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';
import {
  UploadStagingResponseDto,
  MapColumnsDto,
  ProcessStagingResponseDto,
  SearchStagingQueryDto,
  SearchStagingResponseDto,
} from './dto/staging.dto';
import { JwtAuthGuard } from '../comum/guards/jwt-auth.guard';

/**
 * Controller para gerenciar staging de importação de produtos
 * Sprint 20 - Refatoração de Importação com Mapeamento de Colunas
 */
@Controller('imports/staging')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  /**
   * ENDPOINT 1: Upload de arquivo e extração de headers
   * POST /imports/staging/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadStagingResponseDto> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }
    return this.importsService.uploadFile(file);
  }

  /**
   * ENDPOINT 2: Mapear colunas e processar arquivo para staging
   * POST /imports/staging/map
   */
  @Post('map')
  async mapColumns(@Body() dto: MapColumnsDto): Promise<ProcessStagingResponseDto> {
    return this.importsService.processFileToStaging(dto);
  }

  /**
   * ENDPOINT 3: Buscar produtos no staging
   * GET /imports/staging/search?sessionId=X&q=Y&limit=50
   */
  @Get('search')
  async searchStaging(@Query() query: SearchStagingQueryDto): Promise<SearchStagingResponseDto> {
    return this.importsService.searchStaging(query);
  }
}
