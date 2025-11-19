import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/uploads/:path*`,
      },
    ];
  },
  
  /**
   * Configuração de imagens externas (Next.js Image Optimization)
   * 
   * CORREÇÃO (Sprint 20.5): Configurado para permitir imagens do backend local
   * - dangerouslyAllowSVG: permite SVG (opcional)
   * - unoptimized: desabilita otimização para evitar erros com localhost
   * - remotePatterns: lista de domínios permitidos
   */
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**', // Permite qualquer domínio HTTPS (para produção)
        pathname: '/uploads/**',
      },
    ],
    // Desabilita otimização de imagens em desenvolvimento para evitar bloqueio de IPs privados
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
