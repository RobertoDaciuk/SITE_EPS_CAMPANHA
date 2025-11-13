/**
 * ============================================================================
 * CONSTANTES GLOBAIS (NOVO - Princípio 2 e DRY)
 * ============================================================================
 * * Propósito:
 * Centralizar identificadores críticos de negócio e de infraestrutura
 * que são usados em múltiplos locais, prevenindo inconsistências e
 * violando o princípio DRY (Don't Repeat Yourself).
 * * @module Constantes
 * ============================================================================
 */

/**
 * Chave mestra para armazenar o token JWT no localStorage ou em cookies.
 * * É usada no Provedor de Autenticação e no Cliente Axios.
 * Garante que ambos usem a mesma chave, prevenindo falhas de autenticação.
 */
export const TOKEN_KEY = "@EPSCampanhas:token";

/**
 * Chave mestra para armazenar os dados do usuário no localStorage.
 * * É usada no Provedor de Autenticação.
 */
export const USUARIO_KEY = "@EPSCampanhas:usuario";

/**
 * Array de rotas públicas da aplicação.
 * * Usado pelo Provedor de Autenticação para proteger rotas.
 */
export const ROTAS_PUBLICAS = ["/login", "/registro", "/recuperar-senha"];