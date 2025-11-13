/**
 * ============================================================================
 * IMAGE URL HELPER - Construtor de URLs de Imagens
 * ============================================================================
 *
 * Descrição:
 * Helper para construir URLs absolutas de imagens a partir de caminhos relativos
 * retornados pela API.
 *
 * Motivação:
 * - Backend retorna URLs relativas: /uploads/campanhas/file-xxx.jpg
 * - Frontend precisa acessar via backend: http://localhost:3000/uploads/...
 * - Rewrites do Next.js não funcionam bem com Turbopack em dev mode
 *
 * @module ImageUrlHelper
 * ============================================================================
 */

/**
 * URL base da API backend (sem /api no final para arquivos estáticos)
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

/**
 * Constrói URL absoluta para imagem a partir de caminho relativo ou absoluto.
 *
 * @param imagePath - Caminho da imagem (relativo ou absoluto)
 * @returns URL completa da imagem ou string vazia se não houver imagem
 *
 * @example
 * getImageUrl('/uploads/campanhas/file-123.jpg')
 * // => 'http://localhost:3000/uploads/campanhas/file-123.jpg'
 *
 * @example
 * getImageUrl('http://example.com/image.jpg')
 * // => 'http://example.com/image.jpg'
 *
 * @example
 * getImageUrl(null)
 * // => ''
 */
export function getImageUrl(imagePath?: string | null): string {
  if (!imagePath) {
    return '';
  }

  // Se já é URL absoluta (começa com http:// ou https://), retorna como está
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Se é caminho relativo (começa com /), constrói URL absoluta
  if (imagePath.startsWith('/')) {
    return `${API_BASE_URL}${imagePath}`;
  }

  // Se não tem barra no início, adiciona
  return `${API_BASE_URL}/${imagePath}`;
}
