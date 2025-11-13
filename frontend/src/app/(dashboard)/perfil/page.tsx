/**
 * ============================================================================
 * PÁGINA DE PERFIL (Design Aprimorado) - UX Magnífico
 * ============================================================================
 *
 * Propósito:
 * Página principal para o gerenciamento de perfil do usuário.
 * Renderiza os componentes para alterar informações pessoais e senha.
 *
 * Design:
 * - Layout moderno e responsivo
 * - Animações suaves com Framer Motion
 * - Totalmente compatível com tema dark e light
 * - Cabeçalho aprimorado com gradiente e ícones
 *
 * @module PerfilPage
 * ============================================================================
 */
"use client";

import { useAuth } from "@/contexts/ContextoAutenticacao";
import { AlterarSenhaCard } from "@/components/perfil/AlterarSenhaCard";
import { InformacoesPerfilCard } from "@/components/perfil/InformacoesPerfilCard";
import { InfoOticaCard } from "@/components/perfil/InfoOticaCard";
import { motion } from "framer-motion";
import { UserCircle2, Sparkles } from "lucide-react";

/**
 * Página de gerenciamento de perfil do usuário.
 */
export default function PerfilPage() {
  const { usuario } = useAuth();

  const nomeUsuario = usuario?.nome.split(" ")[0] ?? "Usuário";

  return (
    <div className="flex-1 space-y-8 pb-8">
      {/* Cabeçalho Premium */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl p-8 md:p-10
                   bg-gradient-to-br from-primary/10 via-primary/5 to-transparent
                   border border-primary/20 backdrop-blur-sm"
      >
        {/* Decoração de fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-light/10 rounded-full blur-3xl -z-10" />
        
        <div className="relative flex items-start gap-6">
          {/* Avatar/Ícone */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="hidden sm:flex items-center justify-center w-20 h-20 rounded-2xl
                       bg-gradient-to-br from-primary to-primary-light
                       shadow-lg shadow-primary/30"
          >
            <UserCircle2 className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          {/* Texto */}
          <div className="flex-1 space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                Perfil de <span className="text-gradient">{nomeUsuario}</span>
              </h1>
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl"
            >
              Gerencie suas informações pessoais e configurações de segurança com facilidade.
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Grid de Cards Responsivo */}
      <div className="space-y-8">
        {/* Linha 1: Informações Pessoais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
        >
          <InformacoesPerfilCard />
        </motion.div>

        {/* Linha 2: Info Ótica e Alterar Senha - Lado a Lado em Telas Grandes */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
        >
          {/* Informações da Ótica (apenas para VENDEDOR e GERENTE) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <InfoOticaCard />
          </motion.div>
          
          {/* Alterar Senha */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <AlterarSenhaCard />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}