/**
 * ============================================================================
 * AXIOS CLIENT - Cliente HTTP Configurado (REFATORADO - DRY)
 * ============================================================================
 *
 * REFATORAÇÃO (Sprint 18.3 - DRY):
 * - CORRIGIDO Vulnerabilidade #13/DRY: Chave localStorage unificada (TOKEN_KEY)
 * - AGORA: Busca token importando TOKEN_KEY de constantes.ts (fonte única da verdade).
 * - RESULTADO: Interceptor agora encontra e injeta token corretamente.
 *
 * Descrição:
 * Instância do Axios pré-configurada para comunicação com a API backend.
 * Inclui interceptors para injeção automática de token JWT e tratamento
 * de erros de autenticação.
 *
 * Interceptors:
 * - Request: Injeta token JWT no header Authorization (se disponível)
 * - Response: Trata erros de autenticação (401) e redireciona para login
 *
 * Integração com AuthProvider:
 * - Ambos usam a mesma chave TOKEN_KEY, garantindo sincronia.
 *
 * @module AxiosClient
 * ============================================================================
 */

import axios from "axios";
import { TOKEN_KEY, USUARIO_KEY } from "./constantes"; // Importação das chaves únicas (CORRIGIDO - DRY)

/**
 * Instância do Axios pré-configurada para a API.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  timeout: 30000, // 30 segundos
  headers: {
    "Content-Type": "application/json",
  },
  // Habilite se for usar cookies para autenticação
  // withCredentials: true,
});

// ==========================================
// INTERCEPTORS DE REQUISIÇÃO
// ==========================================

/**
 * Interceptor para adicionar token de autenticação
 * automaticamente em todas as requisições.
 *
 * Funcionamento:
 * 1. Antes de enviar requisição, verifica se token existe no localStorage
 * 2. Se token existe: Adiciona header Authorization: Bearer <token>
 * 3. Se token não existe: Envia requisição sem header (rota pública)
 */
api.interceptors.request.use(
  (config) => {
    /**
     * Verifica se está executando no navegador.
     */
    if (typeof window !== "undefined") {
      /**
       * Busca token no localStorage usando a MESMA chave do AuthProvider (TOKEN_KEY).
       */
      const token = localStorage.getItem(TOKEN_KEY);

      /**
       * Se token existe, adiciona header Authorization.
       */
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    /**
     * Retorna config modificado.
     */
    return config;
  },
  (error) => {
    /**
     * Se erro antes de enviar requisição (ex: config inválida),
     * rejeita Promise para tratamento no componente.
     */
    return Promise.reject(error);
  }
);

// ==========================================
// INTERCEPTORS DE RESPOSTA
// ==========================================

/**
 * Interceptor para tratar respostas da API.
 *
 * Funcionamento:
 * 1. Se resposta bem-sucedida (2xx): Retorna response normalmente
 * 2. Se erro 401 (Unauthorized): Remove token e redireciona para login
 * 3. Se outro erro: Repassa erro para tratamento no componente
 *
 * Tratamento de 401 Unauthorized:
 * - Indica que token JWT é inválido, expirado ou ausente
 * - Remove token do localStorage (força re-login)
 * - Redireciona para página de login
 */
api.interceptors.response.use(
  (response) => {
    /**
     * Se resposta bem-sucedida (status 2xx), retorna response normalmente.
     */
    return response;
  },
  (error) => {
    /**
     * Trata erro 401 Unauthorized (token inválido/expirado).
     */
    if (error.response?.status === 401) {
      /**
       * Verifica se está executando no navegador.
       */
      if (typeof window !== "undefined") {
        /**
         * Remove token e dados do usuário do localStorage para limpar sessão inválida.
         */
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USUARIO_KEY);

        /**
         * Redireciona para página de login APENAS se não estiver já na página de login
         * ou em outras rotas de autenticação (registro, recuperar-senha).
         * Isso previne recarregamento da página quando há erro de credenciais incorretas.
         */
        const rotasAuth = ["/login", "/registro", "/recuperar-senha"];
        const estaEmRotaAuth = rotasAuth.some(rota => window.location.pathname.startsWith(rota));
        
        if (!estaEmRotaAuth) {
          window.location.href = "/login";
        }
      }
    }

    /**
     * Repassa erro para tratamento no componente.
     */
    return Promise.reject(error);
  }
);

/**
 * Exporta instância configurada do Axios.
 */
export default api;