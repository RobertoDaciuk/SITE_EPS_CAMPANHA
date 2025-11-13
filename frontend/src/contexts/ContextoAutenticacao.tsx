/**
 * ============================================================================
 * CONTEXTO DE AUTENTICAÇÃO (NOVO - Princípio 2)
 * ============================================================================
 *
 * Propósito:
 * Define a estrutura de dados (Contexto) para o gerenciamento de
 * autenticação em toda a aplicação.
 *
 * Este arquivo define:
 * - Interface `Usuario`: O formato dos dados do usuário logado.
 * - Interface `PropsContextoAutenticacao`: As funções e estados
 * expostos pelo contexto (ex: `login`, `logout`, `usuario`).
 * - `ContextoAutenticacao`: O objeto de Contexto React.
 * - `useAuth`: O hook customizado para consumir este contexto.
 *
 * @module ContextoAutenticacao
 * ============================================================================
 */
"use client";

import { createContext, useContext } from "react";

/**
 * Interface que define a estrutura do usuário autenticado.
 * Baseado na resposta da API /autenticacao/login.
 */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: "ADMIN" | "GERENTE" | "VENDEDOR";
  optica?: {
    id: string;
    nome: string;
    cnpj: string;
    rankingVisivelParaVendedores?: boolean;
  };
}

/**
 * Interface que define as propriedades e métodos
 * fornecidos pelo Provedor de Autenticação.
 */
export interface PropsContextoAutenticacao {
  /**
   * O token JWT do usuário. Null se não autenticado.
   */
  token: string | null;

  /**
   * O objeto do usuário autenticado. Null se não autenticado.
   */
  usuario: Usuario | null;

  /**
   * Flag que indica se o usuário está autenticado.
   */
  estaAutenticado: boolean;

  /**
   * Flag que indica se o provedor ainda está carregando
   * os dados do localStorage na inicialização.
   */
  carregando: boolean;

  /**
   * Função para realizar login.
   * Armazena os dados no estado e no localStorage.
   * @param novoToken - O token JWT recebido da API.
   * @param dadosUsuario - O objeto Usuario recebido da API.
   * @param lembrar - Se true, persiste os dados (lógica de "Lembrar-me").
   */
  login: (
    novoToken: string,
    dadosUsuario: Usuario,
    lembrar: boolean,
  ) => void;

  /**
   * Função para realizar logout.
   * Limpa os dados do estado e do localStorage.
   */
  logout: () => void;
}

/**
 * Cria o Contexto de Autenticação com valores padrão.
 * Será consumido pelo `useAuth` e provido pelo `ProvedorAutenticacao`.
 */
export const ContextoAutenticacao =
  createContext<PropsContextoAutenticacao | undefined>(undefined);

/**
 * Hook customizado para facilitar o consumo do Contexto de Autenticacao.
 *
 * @returns O contexto de autenticação.
 * @throws {Error} Se usado fora de um ProvedorAutenticacao.
 */
export const useAuth = () => {
  const contexto = useContext(ContextoAutenticacao);
  if (contexto === undefined) {
    throw new Error("useAuth deve ser usado dentro de um ProvedorAutenticacao");
  }
  return contexto;
};