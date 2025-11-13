/**
 * ============================================================================
 * LAYOUT RAIZ (Corrigido)
 * ============================================================================
 *
 * CORREÇÃO (Princípio 2):
 * - Importado `ProvedorAutenticacao` (PT-BR) em vez de `AuthProvider`.
 *
 * @module RootLayout
 * ============================================================================
 */
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
// CORRIGIDO: Importa o provedor com nome em PT-BR (Princípio 2)
import { ProvedorAutenticacao } from "@/contexts/ProvedorAutenticacao";
import { Toaster } from "react-hot-toast";

// ==========================================
// CONFIGURAÇÃO DAS FONTES
// ==========================================

/**
 * Fonte Principal - Inter
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Fonte Mono - JetBrains Mono
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// ==========================================
// METADADOS DA APLICAÇÃO
// ==========================================

export const metadata: Metadata = {
  title: "EPS Campanhas - Plataforma SaaS de Gestão de Campanhas",
  description:
    "Gerencie suas campanhas de marketing de forma eficiente e inteligente com a plataforma EPS Campanhas.",
  keywords: ["campanhas", "marketing", "gestão", "saas", "automação"],
  authors: [{ name: "EPS Campanhas Team" }],
};

// ==========================================
// CONFIGURAÇÕES DE VIEWPORT
// ==========================================

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

// ==========================================
// LAYOUT RAIZ
// ==========================================

/**
 * Componente RootLayout.
 * Define a estrutura HTML base e envolve a aplicação
 * com todos os provedores de contexto necessários.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {/* ========================================
          HIERARQUIA DE PROVEDORES
          ========================================
          
          1. ThemeProvider: Gerencia tema (light/dark)
          2. ProvedorAutenticacao: Gerencia autenticação
          3. Children: Conteúdo da aplicação
          4. Toaster: Sistema de notificações
        */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* CORRIGIDO: Usa o provedor com nome em PT-BR (Princípio 2) */}
          <ProvedorAutenticacao>
            {/* Conteúdo Principal da Aplicação */}
            {children}

            {/* Sistema de Notificações Toast
            */}
            <Toaster
              position="top-right"
              reverseOrder={false}
              gutter={8}
              toastOptions={{
                duration: 4000,
                style: {
                  background: "hsl(var(--card))",
                  color: "hsl(var(--card-foreground))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  padding: "16px",
                  fontSize: "14px",
                },
                success: {
                  iconTheme: {
                    primary: "hsl(var(--success))",
                    secondary: "hsl(var(--success-foreground))",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "hsl(var(--destructive))",
                    secondary: "hsl(var(--destructive-foreground))",
                  },
                },
              }}
            />
          </ProvedorAutenticacao>
        </ThemeProvider>
      </body>
    </html>
  );
}