import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  /**
   * Rewrites: Proxy de imagens do backend
   * 
   * Em desenvolvimento e produção, o Next.js faz proxy das imagens do backend.
   * Isso resolve o problema de localhost em produção.
   * 
   * Exemplo:
   * - Frontend: http://seudominio.com/uploads/campanhas/file-123.jpg
   * - Backend:  http://backend-api.com/uploads/campanhas/file-123.jpg
   */
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';
    
    return [
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
  
  /**
   * Configuração de imagens (Next.js Image Optimization)
   * 
   * SOLUÇÃO DEFINITIVA PARA PRODUÇÃO:
   * - Usa URLs relativas (/uploads/...) que são servidas via rewrites
   * - Não depende de localhost ou IPs privados
   * - Funciona tanto em dev quanto em produção
   * - Mantém otimização de imagens do Next.js
   */
  images: {
    remotePatterns: [
      // Permite imagens servidas pelo próprio domínio (via rewrites)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**', // Permite qualquer domínio HTTPS em produção
        pathname: '/uploads/**',
      },
    ],
    // Mantém otimização habilitada
    unoptimized: false,
  },
};

export default nextConfig;
