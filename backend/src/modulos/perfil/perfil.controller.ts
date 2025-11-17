import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PerfilService } from './perfil.service';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';
import { AtualizarSenhaDto } from './dto/atualizar-senha.dto';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { PapeisGuard } from '../comum/guards/papeis.guard';
import { Papeis } from '../comum/decorators/papeis.decorator';

/**
 * Controller protegido, todas as rotas exigem identificação JWT.
 * Usuário acessa apenas seu próprio perfil.
 */
@UseGuards(JwtAuthGuard)
@Controller('perfil')
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  /** Helper para extrair usuarioId do token JWT */
  private getUsuarioId(req): string {
    return req.user.id;
  }

  /**
   * Consulta os dados do próprio perfil (GET /api/perfil/meu)
   */
  @Get('meu')
  @HttpCode(HttpStatus.OK)
  async meuPerfil(@Req() req) {
    return await this.perfilService.meuPerfil(this.getUsuarioId(req));
  }

  /**
   * Atualiza dados do próprio perfil (PATCH /api/perfil/meu)
   */
  @Patch('meu')
  @HttpCode(HttpStatus.OK)
  async atualizarMeuPerfil(@Req() req, @Body() dto: AtualizarPerfilDto) {
    return await this.perfilService.atualizarMeuPerfil(
      this.getUsuarioId(req),
      dto,
    );
  }

  /**
   * Troca a senha do usuário logado (PATCH /api/perfil/minha-senha)
   */
  @Patch('minha-senha')
  @HttpCode(HttpStatus.OK)
  async atualizarMinhaSenha(@Req() req, @Body() dto: AtualizarSenhaDto) {
    return await this.perfilService.atualizarSenha(
      this.getUsuarioId(req),
      dto,
    );
  }

  /**
   * Retorna a visão 360º da equipe do gerente logado (GET /api/perfil/minha-equipe)
   */
  @Get('minha-equipe')
  @UseGuards(PapeisGuard)
  @Papeis('GERENTE')
  @HttpCode(HttpStatus.OK)
  async minhaEquipe(@Req() req) {
    return await this.perfilService.minhaEquipeGerente(this.getUsuarioId(req));
  }
}
