/**
 * ============================================================================
 * PROVEDOR DE AUTENTICAÇÃO (Refatorado - DRY)
 * ============================================================================
 * * Propósito:
 * Gerencia o estado de autenticação global da aplicação (token, usuário).
 * Lida com a persistência de dados no localStorage e a proteção de rotas.
 * * REFATORAÇÃO (Q.I. 170):
 * - NOVO: Importa TOKEN_KEY, USUARIO_KEY e ROTAS_PUBLICAS de constantes.ts (Princípio 2 / DRY).
 * - CORRIGIDO: router.push("/dashboard") alterado para router.push("/").
 * * @module ProvedorAutenticacao
 * ============================================================================
 */
"use client";

import { ReactNode, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ContextoAutenticacao, Usuario } from "./ContextoAutenticacao";
import api from "@/lib/axios";
import { TOKEN_KEY, USUARIO_KEY, ROTAS_PUBLICAS } from "@/lib/constantes"; // Importação Corrigida (Princípio 2)

/**
 * Props do ProvedorAutenticacao.
 */
interface ProvedorAutenticacaoProps {
  children: ReactNode;
}

/**
 * Provedor de Autenticação (Refatorado).
 */
export function ProvedorAutenticacao({ children }: ProvedorAutenticacaoProps) {
  const router = useRouter();
  const pathname = usePathname();

  // ========================================
  // ESTADOS
  // ========================================

  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // ========================================
  // FUNÇÕES DE AUTENTICAÇÃO (LÓGICA CORRIGIDA)
  // ========================================

  /**
   * Função de login.
   * * @param novoToken - Token JWT retornado pelo backend
   * @param dadosUsuario - Dados do usuário retornados pelo backend
   * @param lembrar - Flag "Lembrar-me" vinda da página de login
   */
  const login = useCallback(
    (novoToken: string, dadosUsuario: Usuario, lembrar: boolean) => {
      localStorage.setItem(TOKEN_KEY, novoToken);
      localStorage.setItem(USUARIO_KEY, JSON.stringify(dadosUsuario));

      // Atualizar estados
      setToken(novoToken);
      setUsuario(dadosUsuario);

      // Injetar token no header do Axios
      api.defaults.headers.common["Authorization"] = `Bearer ${novoToken}`;

      // Redirecionar para a rota raiz "/"
      router.push("/");
    },
    [router],
  );

  /**
   * Função de logout.
   */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);

    setToken(null);
    setUsuario(null);

    delete api.defaults.headers.common["Authorization"];

    router.push("/login");
  }, [router]);

  /**
   * Função para atualizar os dados do usuário no estado e localStorage.
   */
  const atualizarUsuario = useCallback((dadosParciais: Partial<Usuario>) => {
    setUsuario((usuarioAtual) => {
      if (!usuarioAtual) return null;
      const novoUsuario = { ...usuarioAtual, ...dadosParciais };
      localStorage.setItem(USUARIO_KEY, JSON.stringify(novoUsuario));
      return novoUsuario;
    });
  }, []);

  // ========================================
  // CARREGAMENTO INICIAL
  // ========================================

  useEffect(() => {
    const carregarAuth = () => {
      try {
        const tokenArmazenado = localStorage.getItem(TOKEN_KEY);
        const usuarioArmazenado = localStorage.getItem(USUARIO_KEY);

        if (tokenArmazenado && usuarioArmazenado) {
          const dadosUsuario = JSON.parse(usuarioArmazenado);
          setToken(tokenArmazenado);
          setUsuario(dadosUsuario);
          api.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${tokenArmazenado}`;
        }
      } catch (erro) {
        console.error(
          "[ProvedorAutenticacao] Erro ao carregar autenticação:",
          erro,
        );
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USUARIO_KEY);
      } finally {
        setCarregando(false);
      }
    };

    carregarAuth();
  }, []);

  // ========================================
  // PROTEÇÃO DE ROTAS
  // ========================================

  useEffect(() => {
    if (carregando) {
      return;
    }

    const rotaPublica = ROTAS_PUBLICAS.includes(pathname);

    // Se não autenticado e rota não é pública, redirecionar para login
    if (!token && !rotaPublica && pathname !== "/login") {
      router.push("/login");
      return;
    }

    // Se autenticado e está na rota de login, redirecionar para a raiz
    if (token && pathname === "/login") {
      // Redirecionar para a rota raiz "/"
      router.push("/");
    }
  }, [pathname, carregando, token, router]);

  // ========================================
  // RENDER
  // ========================================

  if (carregando) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  /**
   * Fornece contexto de autenticação para toda a aplicação.
   */
  return (
    <ContextoAutenticacao.Provider
      value={{
        token,
        usuario,
        estaAutenticado: !!token,
        carregando,
        login,
        logout,
        atualizarUsuario,
      }}
    >
      {children}
    </ContextoAutenticacao.Provider>
  );
}