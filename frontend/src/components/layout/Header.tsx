"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Menu, Sun, Moon, Bell, User } from "lucide-react";

/**
 * Header - Barra superior fixa
 * 
 * Funcionalidades:
 * - Botão de menu (mobile)
 * - Toggle de tema (light/dark)
 * - Notificações
 * - Menu de usuário
 * 
 * @param setSidebarOpen - Função para abrir a sidebar mobile
 */
interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Evita hidratação incorreta
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-background/80 backdrop-blur-lg border-b border-border px-6">
      <div className="h-full flex items-center justify-between">
        {/* ========================================
            LADO ESQUERDO - Botão Menu (Mobile)
            ======================================== */}
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors duration-200 group"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6 transition-transform duration-200 group-hover:scale-110" />
          </button>

          {/* Título da Página removido para evitar redundância visual */}
        </div>

        {/* ========================================
            LADO DIREITO - Controles
            ======================================== */}
        <div className="flex items-center space-x-2">
          {/* Botão de Tema */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-accent transition-colors duration-200 group"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
              ) : (
                <Moon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
              )}
            </button>
          )}

          {/* Botão de Notificações */}
          <div className="relative group">
            <button
              className="relative p-2 rounded-lg hover:bg-accent transition-colors duration-200 group/btn"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5 transition-transform duration-200 group-hover/btn:scale-110 group-hover/btn:rotate-12" />
              {/* Badge de notificações não lidas */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
            </button>
            {/* Dropdown de notificações recentes */}
            <div className="absolute right-0 mt-0 w-80 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-50">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-sm">Notificações Recentes</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Nenhuma notificação no momento
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Perfil */}
          <button
            onClick={() => router.push("/perfil")}
            className="p-2 rounded-lg hover:bg-accent transition-colors duration-200 group"
            aria-label="Perfil do usuário"
          >
            <User className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
          </button>
        </div>
      </div>
    </header>
  );
}