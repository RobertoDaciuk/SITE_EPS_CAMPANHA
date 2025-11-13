/**
 * ============================================================================
 * CARD: ALTERAR SENHA (Design Aprimorado) - UX Magnífico
 * ============================================================================
 *
 * Propósito:
 * Formulário para atualização da senha do usuário.
 *
 * Design:
 * - Campos maiores e mais espaçados para melhor UX
 * - Totalmente compatível com tema dark e light
 * - Feedback visual aprimorado com ícones e cores
 * - Transições suaves e estados de carregamento
 *
 * @module Perfil
 * ============================================================================
 */
"use client";

import { useState } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Key, Loader2, Shield, AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Schema de validação (Zod) para o formulário de alteração de senha.
 *
 */
const senhaSchema = z
  .object({
    senhaAtual: z
      .string()
      .min(1, "A senha atual é obrigatória."),
    novaSenha: z
      .string()
      .min(8, "A nova senha deve ter no mínimo 8 caracteres.")
      // REGEX HARMONIZADA: Garante 1 maiúscula, 1 minúscula, 1 número, e 1 dos caracteres especiais [@$!%*?&#]
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
        "Deve conter pelo menos 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial (@$!%*?&#).",
      ),
    confirmarNovaSenha: z.string(),
  })
  .refine((data) => data.novaSenha === data.confirmarNovaSenha, {
    message: "As novas senhas não coincidem.",
    path: ["confirmarNovaSenha"], // Indica qual campo recebe o erro
  });

type SenhaFormData = z.infer<typeof senhaSchema>;

/**
 * Card de Alteração de Senha.
 */
export function AlterarSenhaCard() {
  // Estado de carregamento do submit
  const [estaSalvando, setEstaSalvando] = useState(false);

  // Configuração do React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SenhaFormData>({
    resolver: zodResolver(senhaSchema),
    defaultValues: {
      senhaAtual: "",
      novaSenha: "",
      confirmarNovaSenha: "",
    },
  });

  /**
   * Handler para submissão do formulário.
   */
  const onSubmit = async (dados: SenhaFormData) => {
    setEstaSalvando(true);
    toast.loading("Atualizando senha...", { id: "senha-toast" });

    try {
      // Envia dados para o endpoint PATCH
      await api.patch("/perfil/minha-senha", {
        senhaAtual: dados.senhaAtual,
        novaSenha: dados.novaSenha,
      });

      toast.success("Senha atualizada com sucesso!", { id: "senha-toast" });
      reset(); // Limpa o formulário
    } catch (erro: any) {
      console.error("Erro ao atualizar senha:", erro);
      const msgErro =
        erro.response?.data?.message ?? "Falha ao atualizar senha.";
      
      // Tratamento de array de erros do DTO (se o ValidationPipe retornar array)
      if (Array.isArray(msgErro)) {
        toast.error(msgErro.join(", "), { id: "senha-toast" });
      } else {
        toast.error(msgErro, { id: "senha-toast" });
      }
    } finally {
      setEstaSalvando(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-gradient-to-br from-card/95 via-card/90 to-card/95 
                 backdrop-blur-xl border border-border/30 rounded-3xl 
                 shadow-2xl shadow-warning/5 hover:shadow-warning/10
                 transition-all duration-500 overflow-hidden h-fit"
    >
      {/* Cabeçalho do Card com gradiente sutil */}
      <div className="relative p-6 md:p-8 border-b border-border/30 bg-gradient-to-r from-warning/5 via-transparent to-warning/5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-warning/10 border border-warning/20 backdrop-blur-sm">
            <Shield className="w-6 h-6 text-warning" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-foreground tracking-tight">
              Alterar Senha
            </h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Recomendamos o uso de uma senha forte e única.
            </p>
          </div>
        </div>
      </div>

      {/* Corpo do Formulário */}
      <div className="p-6 md:p-8 space-y-6">
        {/* Campo Senha Atual */}
        <div className="space-y-2.5">
          <label
            htmlFor="senhaAtual"
            className="block text-sm font-bold text-foreground tracking-wide uppercase"
          >
            Senha Atual
          </label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-warning/10 to-warning/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-warning transition-colors duration-300 z-10" />
            <input
              id="senhaAtual"
              type="password"
              {...register("senhaAtual")}
              disabled={estaSalvando}
              placeholder="Digite sua senha atual"
              className={`relative w-full h-14 pl-14 pr-4 text-base font-medium
                         bg-background/60 dark:bg-background/40
                         border-2 rounded-xl
                         text-foreground placeholder:text-muted-foreground/50
                         transition-all duration-300
                         focus:outline-none focus:ring-4 focus:ring-warning/20
                         disabled:opacity-60 disabled:cursor-not-allowed
                         ${errors.senhaAtual 
                           ? "border-destructive focus:border-destructive" 
                           : "border-border/50 focus:border-warning hover:border-border"
                         }`}
            />
          </div>
          {errors.senhaAtual && (
            <div className="flex items-center gap-2 text-destructive animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm font-medium">
                {errors.senhaAtual.message}
              </p>
            </div>
          )}
        </div>

        {/* Campo Nova Senha */}
        <div className="space-y-2.5">
          <label
            htmlFor="novaSenha"
            className="block text-sm font-bold text-foreground tracking-wide uppercase"
          >
            Nova Senha
          </label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-success/10 to-success/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <Key className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-success transition-colors duration-300 z-10" />
            <input
              id="novaSenha"
              type="password"
              {...register("novaSenha")}
              disabled={estaSalvando}
              placeholder="Digite sua nova senha"
              className={`relative w-full h-14 pl-14 pr-4 text-base font-medium
                         bg-background/60 dark:bg-background/40
                         border-2 rounded-xl
                         text-foreground placeholder:text-muted-foreground/50
                         transition-all duration-300
                         focus:outline-none focus:ring-4 focus:ring-success/20
                         disabled:opacity-60 disabled:cursor-not-allowed
                         ${errors.novaSenha 
                           ? "border-destructive focus:border-destructive" 
                           : "border-border/50 focus:border-success hover:border-border"
                         }`}
            />
          </div>
          {errors.novaSenha && (
            <div className="flex items-start gap-2 text-destructive animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium leading-relaxed">
                {errors.novaSenha.message}
              </p>
            </div>
          )}
        </div>

        {/* Campo Confirmar Nova Senha */}
        <div className="space-y-2.5">
          <label
            htmlFor="confirmarNovaSenha"
            className="block text-sm font-bold text-foreground tracking-wide uppercase"
          >
            Confirmar Nova Senha
          </label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-success/10 to-success/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <CheckCircle2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-success transition-colors duration-300 z-10" />
            <input
              id="confirmarNovaSenha"
              type="password"
              {...register("confirmarNovaSenha")}
              disabled={estaSalvando}
              placeholder="Confirme sua nova senha"
              className={`relative w-full h-14 pl-14 pr-4 text-base font-medium
                         bg-background/60 dark:bg-background/40
                         border-2 rounded-xl
                         text-foreground placeholder:text-muted-foreground/50
                         transition-all duration-300
                         focus:outline-none focus:ring-4 focus:ring-success/20
                         disabled:opacity-60 disabled:cursor-not-allowed
                         ${errors.confirmarNovaSenha 
                           ? "border-destructive focus:border-destructive" 
                           : "border-border/50 focus:border-success hover:border-border"
                         }`}
            />
          </div>
          {errors.confirmarNovaSenha && (
            <div className="flex items-center gap-2 text-destructive animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm font-medium">
                {errors.confirmarNovaSenha.message}
              </p>
            </div>
          )}
        </div>

        {/* Requisitos de Senha */}
        <div className="p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">
            Requisitos da Senha:
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <span>Mínimo de <strong className="text-foreground">8 caracteres</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <span>Pelo menos <strong className="text-foreground">1 letra maiúscula</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <span>Pelo menos <strong className="text-foreground">1 letra minúscula</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <span>Pelo menos <strong className="text-foreground">1 número</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <span>Pelo menos <strong className="text-foreground">1 caractere especial</strong> (@$!%*?&#)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Rodapé do Card */}
      <div className="p-6 md:p-8 pt-6 border-t border-border/30 bg-gradient-to-r from-warning/5 via-transparent to-warning/5">
        <button
          type="submit"
          disabled={estaSalvando}
          className="group relative w-full px-8 py-3.5 rounded-xl font-bold text-sm
                     bg-gradient-to-r from-warning to-warning/90
                     text-warning-foreground
                     shadow-lg shadow-warning/25 hover:shadow-xl hover:shadow-warning/40
                     transform hover:scale-[1.02] active:scale-[0.98]
                     transition-all duration-300
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                     overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-warning/90 to-warning opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative flex items-center justify-center gap-2.5">
            {estaSalvando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Alterando...</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Alterar Senha</span>
              </>
            )}
          </span>
        </button>
      </div>
    </form>
  );
}