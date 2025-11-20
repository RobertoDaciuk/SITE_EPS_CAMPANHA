/**
 * ============================================================================
 * IMAGE URL HELPER - Construtor de URLs de Imagens
 * ============================================================================
 *
 * Descrição:
 * Helper para construir URLs de imagens compatíveis com rewrites do Next.js.
 *
 * SOLUÇÃO DEFINITIVA PARA PRODUÇÃO:
 * - Em produção, usa URLs relativas (/uploads/...) que são servidas via rewrites
 * - Next.js faz proxy das imagens do backend automaticamente
 * - Elimina problema de localhost/IPs privados bloqueados em produção
 * - Funciona tanto em desenvolvimento quanto em produção na nuvem
 *
 * Fluxo:
 * 1. Backend retorna: /uploads/campanhas/file-xxx.jpg
 * 2. Frontend usa: /uploads/campanhas/file-xxx.jpg (URL relativa)
 * 3. Next.js reescreve para: http://backend-api/uploads/campanhas/file-xxx.jpg
 *
 * @module ImageUrlHelper
 * ============================================================================
 */

/**
 * Constrói URL de imagem compatível com rewrites do Next.js.
 *
 * COMPORTAMENTO:
 * - URLs relativas (/uploads/...) são mantidas como relativas
 * - Next.js rewrites automaticamente para o backend
 * - URLs absolutas externas são mantidas como estão
 *
 * @param imagePath - Caminho da imagem (relativo ou absoluto)
 * @returns URL da imagem ou string vazia se não houver imagem
 *
 * @example
 * // URL relativa (será servida via rewrite)
 * getImageUrl('/uploads/campanhas/file-123.jpg')
 * // => '/uploads/campanhas/file-123.jpg'
 *
 * @example
 * // URL absoluta externa (mantém como está)
 * getImageUrl('http://example.com/image.jpg')
 * // => 'http://example.com/image.jpg'
 *
 * @example
 * // Sem imagem
 * getImageUrl(null)
 * // => ''
 */
export function getImageUrl(imagePath?: string | null): string {
  if (!imagePath) {
    return '';
  }

  // Se já é URL absoluta (começa com http:// ou https://), retorna como está
  // (útil para imagens externas, CDNs, etc)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Se é caminho relativo (começa com /), mantém como relativo
  // O Next.js rewrites vai fazer o proxy automaticamente
  if (imagePath.startsWith('/')) {
    return imagePath;
  }

  // Se não tem barra no início, adiciona (para rewrites funcionarem)
  return `/${imagePath}`;
}
