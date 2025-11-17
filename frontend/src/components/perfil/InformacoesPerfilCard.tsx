/**
 * ============================================================================
 * CARD: INFORMAÇÕES DO PERFIL (Design Aprimorado) - UX Magnífico
 * ============================================================================
 *
 * Propósito:
 * Formulário para visualização e atualização dos dados cadastrais
 * do usuário (nome, whatsapp).
 *
 * Design:
 * - Campos maiores e mais espaçados para melhor UX
 * - Totalmente compatível com tema dark e light
 * - Email não editável com aviso claro sobre contato com a equipe EPS
 * - Transições suaves e feedback visual aprimorado
 *
 * @module Perfil
 * ============================================================================
 */
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/ContextoAutenticacao";
import useSWR, { mutate } from "swr";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Mail, Phone, Calendar, Loader2, AlertCircle, Save } from "lucide-react";

/**
 * Schema de validação (Zod) para o formulário de perfil.
 * CORRIGIDO: Removido 'email' e ajustada regex 'whatsapp'.
 */
const perfilSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  // CORRIGIDO: O email não é enviado para atualização.
  whatsapp: z
    .string()
    .transform((val) => (val === null || val === "" ? undefined : val))
    .optional()
    .refine(
      (val) =>
        val === undefined ||
        // CORRIGIDO: Regex para 12 ou 13 dígitos (DDD + Numero)
        /^\d{11,12}$/.test(val.replace(/\D/g, "")),
      "WhatsApp deve conter 12 ou 13 dígitos (Ex: 41987654321).",
    ),
  dataNascimento: z
    .string()
    .transform((val) => (val === null || val === "" ? undefined : val))
    .optional()
    .refine(
      (val) => val === undefined || !isNaN(Date.parse(val)),
      "Data de nascimento inválida.",
    ),
});

// Define o tipo dos dados do formulário baseado no schema
type PerfilFormData = z.infer<typeof perfilSchema>;

/**
 * Interface para os dados completos do SWR (incluindo email)
 */
interface DadosPerfilSWR {
  nome: string;
  email: string;
  whatsapp?: string;
  dataNascimento?: string;
}

/**
 * Fetcher SWR para buscar dados do perfil.
 */
const fetcherPerfil = async (url: string): Promise<DadosPerfilSWR> => {
  const res = await api.get(url);
  return res.data;
};

/**
 * Card de Informações do Perfil.
 */
export function InformacoesPerfilCard() {
  const { usuario } = useAuth(); // Para dados iniciais e fallback

  const [estaSalvando, setEstaSalvando] = useState(false);

  // Busca de dados com SWR
  const { data: dadosPerfil, error: erroPerfil } = useSWR(
    "/perfil/meu",
    fetcherPerfil,
    {
      fallbackData: usuario as DadosPerfilSWR | undefined,
      revalidateOnFocus: true,
    },
  );

  // Configuração do React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    // Usamos getValues para ler o email (que não faz parte do schema)
    getValues,
  } = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nome: "",
      whatsapp: "",
      dataNascimento: "",
    },
  });

  // Efeito para popular o formulário quando os dados do SWR chegam
  useEffect(() => {
    if (dadosPerfil) {
      // Reseta o formulário apenas com os dados do schema
      reset({
        nome: dadosPerfil.nome,
        whatsapp: dadosPerfil.whatsapp ?? "",
        dataNascimento: dadosPerfil.dataNascimento ?? "",
      });
    }
  }, [dadosPerfil, reset]);

  /**
   * Handler para submissão do formulário.
   */
  const onSubmit: SubmitHandler<PerfilFormData> = async (dados) => {
    setEstaSalvando(true);
    toast.loading("Salvando alterações...", { id: "perfil-toast" });

    try {
      // 'dados' agora contém APENAS 'nome' e 'whatsapp' (definido pelo schema)
      const response = await api.patch("/perfil/meu", dados);

      // Atualiza o cache do SWR localmente
      mutate("/perfil/meu", response.data, false);

      toast.success("Perfil atualizado com sucesso!", { id: "perfil-toast" });
      reset(response.data);
    } catch (erro: any) {
      console.error("Erro ao atualizar perfil:", erro);
      const msgErro =
        erro.response?.data?.message ?? "Falha ao atualizar perfil.";

      if (Array.isArray(msgErro)) {
        toast.error(msgErro.join(", "), { id: "perfil-toast" });
      } else {
        toast.error(msgErro, { id: "perfil-toast" });
      }
    } finally {
      setEstaSalvando(false);
    }
  };

  // Estado de Carregamento
  if (erroPerfil) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-xl">
        <h4 className="font-semibold">Erro ao carregar perfil</h4>
        <p className="text-sm">{erroPerfil.message}</p>
      </div>
    );
  }

  if (!dadosPerfil) {
    // Skeleton
    return (
      <div className="bg-card/70 backdrop-blur-lg border border-border/20 rounded-2xl p-6 shadow-lg shadow-black/5 animate-pulse">
        <div className="h-6 bg-muted-foreground/20 rounded-md w-1/3 mb-4"></div>
        <div className="space-y-4">
          <div className="h-10 bg-muted-foreground/20 rounded-md w-full"></div>
          <div className="h-10 bg-muted-foreground/20 rounded-md w-full"></div>
          <div className="h-10 bg-muted-foreground/20 rounded-md w-full"></div>
          <div className="h-10 bg-muted-foreground/20 rounded-md w-1/4 mt-4"></div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-gradient-to-br from-card/95 via-card/90 to-card/95 
                 backdrop-blur-xl border border-border/30 rounded-3xl 
                 shadow-2xl shadow-primary/5 hover:shadow-primary/10
                 transition-all duration-500 overflow-hidden"
    >
      {/* Cabeçalho do Card com gradiente sutil */}
      <div className="relative p-6 md:p-8 border-b border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-foreground tracking-tight">
              Informações Pessoais
            </h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Gerencie seus dados cadastrais e mantenha seu perfil atualizado.
            </p>
          </div>
        </div>
      </div>

      {/* Corpo do Formulário */}
      <div className="p-6 md:p-8 space-y-7">
        {/* Campo Nome */}
        <div className="space-y-2.5">
          <label
            htmlFor="nome"
            className="block text-sm font-bold text-foreground tracking-wide uppercase"
          >
            Nome Completo
          </label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary-light/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors duration-300 z-10" />
            <input
              id="nome"
              type="text"
              {...register("nome")}
              disabled={estaSalvando}
              className={`relative w-full h-14 pl-14 pr-4 text-base font-medium
                         bg-background/60 dark:bg-background/40
                         border-2 rounded-xl
                         text-foreground placeholder:text-muted-foreground/50
                         transition-all duration-300
                         focus:outline-none focus:ring-4 focus:ring-primary/20
                         disabled:opacity-60 disabled:cursor-not-allowed
                         ${errors.nome 
                           ? "border-destructive focus:border-destructive" 
                           : "border-border/50 focus:border-primary hover:border-border"
                         }`}
              placeholder="Digite seu nome completo"
            />
          </div>
          {errors.nome && (
            <div className="flex items-center gap-2 text-destructive animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm font-medium">
                {errors.nome.message}
              </p>
            </div>
          )}
        </div>

        {/* Campo Email (Somente Leitura) */}
        <div className="space-y-2.5">
          <label
            htmlFor="email"
            className="block text-sm font-bold text-foreground tracking-wide uppercase"
          >
            Email (Login)
          </label>
          <div className="relative group">
            <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
            <input
              id="email"
              type="email"
              value={dadosPerfil.email}
              disabled={true}
              className="relative w-full h-14 pl-14 pr-4 text-base font-medium
                         bg-muted/30 dark:bg-muted/20
                         border-2 border-dashed border-border/40 rounded-xl
                         text-muted-foreground cursor-not-allowed
                         transition-all duration-300"
              readOnly
            />
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Email não pode ser alterado
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Caso precise alterar seu email, entre em contato com a equipe da <span className="font-bold text-primary">EPS</span> para assistência.
              </p>
            </div>
          </div>
        </div>

        {/* Campo WhatsApp */}
        <div className="space-y-2.5">
          <label
            htmlFor="whatsapp"
            className="block text-sm font-bold text-foreground tracking-wide uppercase"
          >
            WhatsApp <span className="text-muted-foreground font-normal text-xs">(Opcional)</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-success/10 to-success/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-success transition-colors duration-300 z-10" />
            <input
              id="whatsapp"
              type="tel"
              placeholder="Ex: 41987654321"
              {...register("whatsapp")}
              disabled={estaSalvando}
              className={`relative w-full h-14 pl-14 pr-4 text-base font-medium
                         bg-background/60 dark:bg-background/40
                         border-2 rounded-xl
                         text-foreground placeholder:text-muted-foreground/50
                         transition-all duration-300
                         focus:outline-none focus:ring-4 focus:ring-success/20
                         disabled:opacity-60 disabled:cursor-not-allowed
                         ${errors.whatsapp
                           ? "border-destructive focus:border-destructive"
                           : "border-border/50 focus:border-success hover:border-border"
                         }`}
            />
          </div>
          {errors.whatsapp && (
            <div className="flex items-center gap-2 text-destructive animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm font-medium">
                {errors.whatsapp.message}
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed pl-1">
            Digite apenas números com DDD. Exemplo: <span className="font-mono font-semibold text-foreground">41987654321</span>
          </p>
        </div>

        {/* Campo Data de Nascimento */}
        <div className="space-y-2.5">
          <label
            htmlFor="dataNascimento"
            className="block text-sm font-bold text-foreground tracking-wide uppercase"
          >
            Data de Nascimento <span className="text-muted-foreground font-normal text-xs">(Opcional)</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-400/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <Calendar className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-blue-500 transition-colors duration-300 z-10" />
            <input
              id="dataNascimento"
              type="date"
              {...register("dataNascimento")}
              disabled={estaSalvando}
              className={`relative w-full h-14 pl-14 pr-4 text-base font-medium
                         bg-background/60 dark:bg-background/40
                         border-2 rounded-xl
                         text-foreground placeholder:text-muted-foreground/50
                         transition-all duration-300
                         focus:outline-none focus:ring-4 focus:ring-blue-500/20
                         disabled:opacity-60 disabled:cursor-not-allowed
                         ${errors.dataNascimento
                           ? "border-destructive focus:border-destructive"
                           : "border-border/50 focus:border-blue-500 hover:border-border"
                         }`}
            />
          </div>
          {errors.dataNascimento && (
            <div className="flex items-center gap-2 text-destructive animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm font-medium">
                {errors.dataNascimento.message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé do Card */}
      <div className="p-6 md:p-8 pt-6 border-t border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Suas informações estão seguras e protegidas
          </p>
          <button
            type="submit"
            disabled={estaSalvando}
            className="group relative px-8 py-3.5 rounded-xl font-bold text-sm
                       bg-gradient-to-r from-primary to-primary-light
                       text-primary-foreground
                       shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40
                       transform hover:scale-[1.02] active:scale-[0.98]
                       transition-all duration-300
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                       overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-light to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center gap-2.5">
              {estaSalvando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}