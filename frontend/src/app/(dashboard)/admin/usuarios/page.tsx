"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/ContextoAutenticacao";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import {
  Users, UserPlus, Search, Filter, X, Crown, Shield, User,
  CheckCircle, Clock, Ban, Edit, Trash2, Key, Award,
  Store, Phone, Mail, Loader2, AlertCircle, TrendingUp, LogIn
} from "lucide-react";
import CriarEditarUsuarioModal from "@/components/admin/usuarios/CriarEditarUsuarioModal";
import ResetSenhaModal from "@/components/admin/usuarios/ResetSenhaModal";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf?: string | null;
  whatsapp?: string | null;
  avatarUrl?: string | null;
  papel: "ADMIN" | "GERENTE" | "VENDEDOR";
  status: "PENDENTE" | "ATIVO" | "BLOQUEADO";
  nivel?: "BRONZE" | "PRATA" | "OURO" | "DIAMANTE";
  
  opticaId?: string | null;
  optica?: { id: string; nome: string; } | null;
  gerenteId?: string | null;
  gerente?: { id: string; nome: string; } | null;
}

interface Otica {
  id: string;
  nome: string;
}

export default function AdminUsuariosPage() {
  const router = useRouter();
  const { usuario, carregando: isAuthLoading } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [oticas, setOticas] = useState<Otica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroPapel, setFiltroPapel] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroOtica, setFiltroOtica] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<Usuario | null>(null);
  const [usuarioParaResetar, setUsuarioParaResetar] = useState<Usuario | null>(null);

  useEffect(() => {
    if (!isAuthLoading && (!usuario || usuario.papel !== "ADMIN")) {
      router.push("/");
      toast.error("Acesso negado");
    }
  }, [isAuthLoading, usuario, router]);

  useEffect(() => {
    if (usuario?.papel === "ADMIN") {
      fetchOticas();
      fetchUsuarios();
    }
  }, [usuario]);

  const fetchOticas = async () => {
    try {
      const res = await api.get("/oticas");
      setOticas(res.data);
    } catch (error) {
      console.error("Erro ao carregar óticas:", error);
    }
  };

  const fetchUsuarios = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filtroNome) params.append("nomeOuEmail", filtroNome);
      if (filtroPapel) params.append("papel", filtroPapel);
      if (filtroStatus) params.append("status", filtroStatus);
      if (filtroOtica) params.append("opticaId", filtroOtica);
      const res = await api.get(`/usuarios?${params.toString()}`);
      setUsuarios(res.data);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  }, [filtroNome, filtroPapel, filtroStatus, filtroOtica]);

  useEffect(() => {
    if (usuario?.papel === "ADMIN") {
      fetchUsuarios();
    }
  }, [usuario, fetchUsuarios]);

  const limparFiltros = () => {
    setFiltroNome("");
    setFiltroPapel("");
    setFiltroStatus("");
    setFiltroOtica("");
  };

  const abrirModalCriar = () => {
    setUsuarioParaEditar(null);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (usuario: Usuario) => {
    setUsuarioParaEditar(usuario);
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setUsuarioParaEditar(null);
  };

  const abrirModalReset = (usuario: Usuario) => {
    setUsuarioParaResetar(usuario);
    setIsResetModalOpen(true);
  };

  const fecharModalReset = () => {
    setIsResetModalOpen(false);
    setUsuarioParaResetar(null);
  };

  const handleDeletar = async (usuario: Usuario) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário ${usuario.nome}?`)) {
      return;
    }

    try {
      await api.delete(`/usuarios/${usuario.id}`);
      toast.success("Usuário deletado com sucesso!");
      fetchUsuarios();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao deletar usuário");
    }
  };

  const handlePersonificar = async (usuario: Usuario) => {
    if (!confirm(`Deseja entrar como ${usuario.nome}?`)) {
      return;
    }

    try {
      const response = await api.post(`/usuarios/${usuario.id}/personificar`);
      const { token } = response.data;
      
      // Salva o token e recarrega a página
      localStorage.setItem("eps_campanhas_token", token);
      toast.success(`Agora você está logado como ${usuario.nome}`);
      
      // Redireciona baseado no papel do usuário
      setTimeout(() => {
        if (usuario.papel === "ADMIN") {
          window.location.href = "/admin/dashboard";
        } else if (usuario.papel === "GERENTE") {
          window.location.href = "/gerente/dashboard";
        } else {
          window.location.href = "/dashboard";
        }
      }, 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao personificar usuário");
    }
  };

  const getPapelIcon = (papel: string) => {
    if (papel === "ADMIN") return <Crown className="w-4 h-4" />;
    if (papel === "GERENTE") return <Shield className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const getPapelColor = (papel: string) => {
    if (papel === "ADMIN") return "bg-purple-100 text-purple-700 border-purple-200";
    if (papel === "GERENTE") return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-green-100 text-green-700 border-green-200";
  };

  const getStatusIcon = (status: string) => {
    if (status === "ATIVO") return <CheckCircle className="w-4 h-4" />;
    if (status === "PENDENTE") return <Clock className="w-4 h-4" />;
    return <Ban className="w-4 h-4" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "ATIVO") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "PENDENTE") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const getNivelColor = (nivel?: string) => {
    if (nivel === "DIAMANTE") return "text-cyan-400";
    if (nivel === "OURO") return "text-yellow-400";
    if (nivel === "PRATA") return "text-gray-400";
    return "text-orange-400";
  };

  

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!usuario || usuario.papel !== "ADMIN") return null;

  const stats = {
    total: usuarios.length,
    ativos: usuarios.filter(u => u.status === "ATIVO").length,
    pendentes: usuarios.filter(u => u.status === "PENDENTE").length,
    bloqueados: usuarios.filter(u => u.status === "BLOQUEADO").length,
  };

  return (
    <div className="flex-1 space-y-8 pb-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl p-8 md:p-10 bg-gradient-to-br from-purple/10 via-purple/5 to-transparent border border-purple/20 backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple/10 rounded-full blur-3xl -z-10" />
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple to-purple/90 shadow-lg shadow-purple/30">
              <Users className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black">Gerenciamento de Usuários</h1>
              <p className="text-muted-foreground mt-2">Gerencie todos os usuários da plataforma</p>
            </div>
          </div>
          <button onClick={abrirModalCriar} className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple to-purple/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Novo Usuário
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "from-blue-500 to-cyan-500" },
          { label: "Ativos", value: stats.ativos, icon: CheckCircle, color: "from-emerald-500 to-green-500" },
          { label: "Pendentes", value: stats.pendentes, icon: Clock, color: "from-amber-500 to-orange-500" },
          { label: "Bloqueados", value: stats.bloqueados, icon: Ban, color: "from-red-500 to-pink-500" },
        ].map((stat, idx) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-card/70 backdrop-blur-lg border border-border/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-black">{stat.value}</p>
            <p className="text-sm text-muted-foreground font-medium mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card/70 backdrop-blur-lg border border-border/20 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border/20">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5" />
              <span className="font-bold">Filtros Avançados</span>
              {(filtroNome || filtroPapel || filtroStatus || filtroOtica) && (
                <span className="px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold">Ativos</span>
              )}
            </div>
            <motion.div animate={{ rotate: showFilters ? 180 : 0 }}>
              <Search className="w-5 h-5" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <input type="text" placeholder="Buscar por nome ou email..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} className="px-4 py-3 rounded-xl border-2 border-border/50 bg-background/60 focus:border-primary focus:outline-none" />
                <select value={filtroPapel} onChange={(e) => setFiltroPapel(e.target.value)} className="px-4 py-3 rounded-xl border-2 border-border/50 bg-background/60 focus:border-primary focus:outline-none">
                  <option value="">Todos os Papéis</option>
                  <option value="ADMIN">Admin</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="VENDEDOR">Vendedor</option>
                </select>
                <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="px-4 py-3 rounded-xl border-2 border-border/50 bg-background/60 focus:border-primary focus:outline-none">
                  <option value="">Todos os Status</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="BLOQUEADO">Bloqueado</option>
                </select>
                <select value={filtroOtica} onChange={(e) => setFiltroOtica(e.target.value)} className="px-4 py-3 rounded-xl border-2 border-border/50 bg-background/60 focus:border-primary focus:outline-none">
                  <option value="">Todas as Óticas</option>
                  {oticas.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
                {(filtroNome || filtroPapel || filtroStatus || filtroOtica) && (
                  <button onClick={limparFiltros} className="px-4 py-3 rounded-xl border-2 border-border/50 hover:bg-destructive/10 hover:border-destructive flex items-center justify-center gap-2">
                    <X className="w-4 h-4" />
                    Limpar
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-xl font-bold">Nenhum usuário encontrado</p>
              <p className="text-muted-foreground">Tente ajustar os filtros</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Usuário</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Contato</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Papel</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Ótica</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Gamificação</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {usuarios.map((u, idx) => (
                  <motion.tr key={u.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-bold">
                          {u.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{u.nome}</p>
                          <p className="text-xs text-muted-foreground">{u.cpf || "CPF não informado"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {u.email}
                        </div>
                        {u.whatsapp && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {u.whatsapp}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getPapelColor(u.papel)}`}>
                        {getPapelIcon(u.papel)}
                        {u.papel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(u.status)}`}>
                        {getStatusIcon(u.status)}
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.optica ? (
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{u.optica.nome}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem ótica</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.papel === "VENDEDOR" && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Award className={`w-4 h-4 ${getNivelColor(u.nivel)}`} />
                            <span className={`text-xs font-bold ${getNivelColor(u.nivel)}`}>{u.nivel}</span>
                          </div>
                  
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handlePersonificar(u)}
                          className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 transition-colors"
                          title="Entrar como este usuário"
                        >
                          <LogIn className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => abrirModalEditar(u)}
                          className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          title="Editar usuário"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => abrirModalReset(u)}
                          className="p-2 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors"
                          title="Resetar senha"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletar(u)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                          title="Deletar usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Modal de Criar/Editar Usuário */}
      <CriarEditarUsuarioModal
        isOpen={isModalOpen}
        onClose={fecharModal}
        onSuccess={() => {
          fecharModal();
          fetchUsuarios();
        }}
        userToEdit={usuarioParaEditar}
      />

      {/* Modal de Reset de Senha */}
      <ResetSenhaModal
        isOpen={isResetModalOpen}
        onClose={fecharModalReset}
        usuario={usuarioParaResetar}
      />
    </div>
  );
}
