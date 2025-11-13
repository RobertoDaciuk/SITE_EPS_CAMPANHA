/**
 * ====================================================================
 * SERVIÇO: PerfilService (REFATORADO - Atomicidade)
 * ====================================================================
 *
 * Serviço de perfil pessoal para autoatendimento do usuário autenticado.
 *
 * CORREÇÃO (Princípio 5.1 - Atomicidade):
 * - O método `atualizarSenha` agora usa `prisma.$transaction` para garantir
 * que a atualização da senha seja atômica.
 *
 * Princípios de Segurança (Data Tenancy):
 * - Toda operação utiliza o usuarioId extraído do JWT (Princípio 5.5).
 * - Nenhuma operação permite alterar dados de outros usuários.
 * - Campos sensíveis (senhaHash) nunca são retornados.
 *
 * Versão: 4.1 (Sprint 17.2 - Tarefa 40.1)
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';
import { AtualizarSenhaDto } from './dto/atualizar-senha.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Serviço de perfil pessoal para autoatendimento do usuário autenticado.
 */
@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ====================================================================
   * MÉTODO: Consultar Próprio Perfil
   * ====================================================================
   *
   * Retorna os dados públicos e seguros do perfil do usuário autenticado.
   *
   * @param usuarioId - ID do usuário obtido via JWT (req.user.id)
   * @returns Objeto com os dados públicos do perfil
   */
  async meuPerfil(usuarioId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        // ====================================
        // CAMPOS DE IDENTIFICAÇÃO
        // ====================================
        id: true,
        nome: true,
        email: true,
        cpf: true,
        avatarUrl: true,

        // ====================================
        // CAMPOS DE AUTORIZAÇÃO
        // ====================================
        papel: true,
        status: true,

    // ====================================
    // CAMPOS DE GAMIFICAÇÃO
    // ====================================
    nivel: true,
    // Campos de saldo/ranking de gamificação foram descontinuados e não são retornados

        // ====================================
        // CAMPOS DE CONTATO
        // ====================================
        whatsapp: true,

        // ====================================
        // CAMPOS DE PREFERÊNCIAS
        // ====================================
        mapeamentoPlanilhaSalvo: true,

        // ====================================
        // CAMPOS DE AUDITORIA
        // ====================================
        criadoEm: true,
        atualizadoEm: true,

        // ====================================
        // DADOS DA ÓTICA VINCULADA (NOVO)
        // ====================================
        optica: {
          select: {
            nome: true,
            cnpj: true,
          },
        },
      },
    });
  }

  /**
   * ====================================================================
   * MÉTODO: Atualizar Próprio Perfil
   * ====================================================================
   *
   * Atualiza os dados do perfil do usuário autenticado.
   *
   * @param usuarioId - ID do usuário obtido via JWT (req.user.id)
   * @param dto - Dados a serem atualizados (AtualizarPerfilDto)
   * @returns Perfil atualizado (mesmos campos do meuPerfil)
   */
  async atualizarMeuPerfil(usuarioId: string, dto: AtualizarPerfilDto) {
    // ====================================
    // CONSTRUIR OBJETO DE ATUALIZAÇÃO
    // ====================================
    const data: Prisma.UsuarioUpdateInput = {};

    if (dto.nome !== undefined) {
      data.nome = dto.nome;
    }

    if (dto.cpf !== undefined) {
      data.cpf = dto.cpf;
    }

    if (dto.whatsapp !== undefined) {
      data.whatsapp = dto.whatsapp;
    }

    if (dto.mapeamentoPlanilhaSalvo !== undefined) {
      data.mapeamentoPlanilhaSalvo = dto.mapeamentoPlanilhaSalvo;
    }

    // ====================================
    // EXECUTAR ATUALIZAÇÃO NO BANCO
    // ====================================
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: data,
      select: {
        // ====================================
        // RETORNAR OS MESMOS CAMPOS DO meuPerfil
        // ====================================
        id: true,
        nome: true,
        email: true,
        cpf: true,
        avatarUrl: true,
        papel: true,
        status: true,
  nivel: true,
        whatsapp: true,
        mapeamentoPlanilhaSalvo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });
  }

  /**
   * ====================================================================
   * MÉTODO: Alterar Própria Senha (ATÔMICO)
   * ====================================================================
   *
   * Permite ao usuário alterar sua própria senha.
   *
   * @param usuarioId - ID do usuário obtido via JWT (req.user.id)
   * @param dto - Objeto contendo senhaAtual e novaSenha (AtualizarSenhaDto)
   * @returns Perfil atualizado (sem senhaHash)
   *
   * @throws UnauthorizedException - Se a senha atual estiver incorreta
   */
  async atualizarSenha(usuarioId: string, dto: AtualizarSenhaDto) {
    // ====================================
    // BUSCAR USUÁRIO COM SENHA ATUAL (FORA DA TRANSAÇÃO)
    // ====================================
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { senhaHash: true },
    });

    // ====================================
    // VALIDAR SENHA ATUAL (FORA DA TRANSAÇÃO)
    // ====================================
    const senhaValida = await bcrypt.compare(
      dto.senhaAtual,
      usuario.senhaHash,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('A senha atual está incorreta.');
    }

    // ====================================
    // HASHEAR NOVA SENHA
    // ====================================
    const novaSenhaHash = await bcrypt.hash(dto.novaSenha, 10);

    // ====================================
    // ATUALIZAR SENHA NO BANCO (DENTRO DA TRANSAÇÃO - Princípio 5.1)
    // ====================================
    return this.prisma.$transaction(async (tx) => {
      // 1. Atualizar senha (e outras futuras operações de escrita, ex: log de auditoria)
      const perfilAtualizado = await tx.usuario.update({
        where: { id: usuarioId },
        data: { senhaHash: novaSenhaHash },
        select: {
          // Retornar apenas campos seguros (sem senhaHash)
          id: true,
          nome: true,
          email: true,
          cpf: true,
          avatarUrl: true,
          papel: true,
          status: true,
          nivel: true,
          whatsapp: true,
          mapeamentoPlanilhaSalvo: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      });

      // 2. Se necessário, adicionar log de auditoria aqui dentro da transação (tx.logAutenticacao.create)

      return perfilAtualizado;
    });
  }
}