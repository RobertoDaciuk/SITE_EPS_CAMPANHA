import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { PapeisGuard } from '../comum/guards/papeis.guard';
import { Papeis } from '../comum/decorators/papeis.decorator';
import { ArmazenamentoService } from './armazenamento.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Gera nome único para arquivo baseado em timestamp.
 */
const gerarNomeArquivo = (req: any, file: Express.Multer.File, callback: any) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = extname(file.originalname);
  callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
};

/**
 * Configuração de storage para imagens de campanha.
 */
const storageImagem = diskStorage({
  destination: './public/uploads/campanhas',
  filename: gerarNomeArquivo,
});

/**
 * Configuração de storage para planilhas de produtos.
 */
const storagePlanilha = diskStorage({
  destination: './public/uploads/campanhas/planilhas',
  filename: gerarNomeArquivo,
});

/**
 * Controller para upload de avatar, protegido por autenticação JWT.
 */
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private readonly armazenamentoService: ArmazenamentoService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Endpoint para upload de avatar. Atualiza o campo avatarUrl do usuário.
   * @param file Arquivo enviado
   * @param req Request com JWT (req.user.id)
   * @returns avatarUrl atualizado
   */
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    ) file: Express.Multer.File,
    @Req() req,
  ) {
    const usuarioId = req.user.id;
    const url = await this.armazenamentoService.uploadAvatar(file.buffer, file.mimetype, usuarioId);
    await this.prisma.usuario.update({ where: { id: usuarioId }, data: { avatarUrl: url } });
    return { avatarUrl: url };
  }

  /**
   * ============================================================================
   * NOVOS ENDPOINTS (Sprint 18 - Produtos da Campanha)
   * ============================================================================
   */

  /**
   * Upload de imagem de campanha.
   * 
   * POST /api/upload/imagem-campanha
   * 
   * Aceita: .jpg, .jpeg, .png, .webp
   * Máximo: 5MB
   * Acesso: ADMIN apenas
   * 
   * @param file - Arquivo enviado via multipart/form-data
   * @returns URL do arquivo salvo
   */
  @Post('imagem-campanha')
  @UseGuards(PapeisGuard)
  @Papeis('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: storageImagem,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
          return callback(
            new BadRequestException('Apenas imagens são permitidas (jpg, jpeg, png, webp)'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  uploadImagemCampanha(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    // Retorna URL relativa para o frontend
    const url = `/uploads/campanhas/${file.filename}`;
    
    // Log para debug
    console.log('📸 Imagem de campanha salva:', {
      filename: file.filename,
      size: file.size,
      path: file.path,
      url,
    });
    
    return { url, filename: file.filename };
  }

  /**
   * Upload de planilha de produtos.
   * 
   * POST /api/upload/planilha-produtos
   * 
   * Aceita: .xlsx, .xls, .csv
   * Máximo: 10MB
   * Acesso: ADMIN apenas
   * 
   * @param file - Arquivo enviado via multipart/form-data
   * @returns URL do arquivo salvo
   */
  @Post('planilha-produtos')
  @UseGuards(PapeisGuard)
  @Papeis('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: storagePlanilha,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
          return callback(
            new BadRequestException('Apenas planilhas são permitidas (xlsx, xls, csv)'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  uploadPlanilhaProdutos(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    // Retorna URL relativa para o frontend
    const url = `/uploads/campanhas/planilhas/${file.filename}`;
    return { url, filename: file.filename };
  }
}
