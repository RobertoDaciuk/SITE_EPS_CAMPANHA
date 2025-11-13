'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, Edit, Trash2, Plus, Calendar } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { formatarDataBR } from '@/lib/timezone';

interface Alteracao {
  campo: string;
  tipo?: 'adicao' | 'remocao' | 'atualizacao';
  valor?: any;
  valorAnterior?: any;
  valorNovo?: any;
}

interface RegistroHistorico {
  id: string;
  dataHora: string;
  tipo: 'CRIACAO' | 'EDICAO' | 'EXCLUSAO';
  alteracoes: Alteracao[] | any;
  observacoes?: string;
  admin: {
    id: string;
    nome: string;
    email: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campanhaId: string;
  tituloCampanha: string;
}

/**
 * Modal de Histórico de Alterações da Campanha
 * 
 * Mostra linha do tempo completa de todas as alterações realizadas
 * por admins na campanha, incluindo criação, edições e exclusão.
 */
export default function HistoricoModal({ isOpen, onClose, campanhaId, tituloCampanha }: Props) {
  const [historico, setHistorico] = useState<RegistroHistorico[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && campanhaId) {
      carregarHistorico();
    }
  }, [isOpen, campanhaId]);

  const carregarHistorico = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/campanhas/${campanhaId}/historico`);
      setHistorico(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico da campanha');
    } finally {
      setIsLoading(false);
    }
  };

  const formatarAlteracoes = (alteracoes: any): string[] => {
    if (!alteracoes) return [];

    // Se for objeto de criação
    if (alteracoes.titulo && alteracoes.totalCartelas !== undefined) {
      return [
        `📝 Título: "${alteracoes.titulo}"`,
        `🎯 ${alteracoes.totalCartelas} cartela(s) criada(s)`,
        `📦 ${alteracoes.totalProdutos} produto(s) cadastrado(s)`,
        `⚡ ${alteracoes.totalEventos} evento(s) especial(is)`,
      ];
    }

    // Se for array de alterações
    if (Array.isArray(alteracoes)) {
      return alteracoes.map((alt: Alteracao) => {
        if (alt.tipo === 'adicao') {
          return `➕ ${alt.campo}: Adicionado`;
        } else if (alt.tipo === 'remocao') {
          return `➖ ${alt.campo}: Removido`;
        } else if (alt.tipo === 'atualizacao') {
          return `✏️ ${alt.campo}: Atualizado`;
        } else if (alt.valorAnterior !== undefined && alt.valorNovo !== undefined) {
          return `📝 ${alt.campo}: ${JSON.stringify(alt.valorAnterior)} → ${JSON.stringify(alt.valorNovo)}`;
        }
        return `🔄 ${alt.campo} modificado`;
      });
    }

    return ['Alterações realizadas'];
  };

  const getIconeTipo = (tipo: string) => {
    switch (tipo) {
      case 'CRIACAO':
        return <Plus className="w-5 h-5 text-green-500" />;
      case 'EDICAO':
        return <Edit className="w-5 h-5 text-blue-500" />;
      case 'EXCLUSAO':
        return <Trash2 className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCorTipo = (tipo: string) => {
    switch (tipo) {
      case 'CRIACAO':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      case 'EDICAO':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'EXCLUSAO':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
    }
  };

  const getTituloTipo = (tipo: string) => {
    switch (tipo) {
      case 'CRIACAO':
        return 'Campanha Criada';
      case 'EDICAO':
        return 'Campanha Editada';
      case 'EXCLUSAO':
        return 'Campanha Excluída';
      default:
        return 'Ação Realizada';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed inset-4 md:inset-10 lg:inset-20 z-50 overflow-hidden"
          >
            <div className="w-full h-full bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <Clock className="w-7 h-7 text-purple-500" />
                      Histórico de Alterações
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {tituloCampanha}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  // Loading State
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-gray-600 dark:text-gray-400">Carregando histórico...</p>
                    </div>
                  </div>
                ) : historico.length === 0 ? (
                  // Empty State
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto">
                        <Clock className="w-10 h-10 text-purple-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Nenhum registro encontrado
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Esta campanha ainda não possui histórico de alterações.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Timeline
                  <div className="max-w-4xl mx-auto">
                    <div className="relative">
                      {/* Linha vertical */}
                      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-blue-500 to-purple-500" />

                      {/* Registros */}
                      <div className="space-y-6">
                        {historico.map((registro, index) => (
                          <motion.div
                            key={registro.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative pl-20"
                          >
                            {/* Ícone na timeline */}
                            <div className="absolute left-5 top-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-purple-500 flex items-center justify-center shadow-lg">
                              {getIconeTipo(registro.tipo)}
                            </div>

                            {/* Card do registro */}
                            <div className={`glass-card rounded-xl p-5 border ${getCorTipo(registro.tipo)} hover:scale-[1.02] transition-transform`}>
                              {/* Header do card */}
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                    {getTituloTipo(registro.tipo)}
                                  </h3>
                                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      {formatarDataBR(registro.dataHora, 'dd/MM/yyyy HH:mm')}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <User className="w-4 h-4" />
                                      {registro.admin.nome}
                                    </div>
                                  </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCorTipo(registro.tipo)}`}>
                                  {registro.tipo}
                                </span>
                              </div>

                              {/* Alterações */}
                              <div className="space-y-2">
                                {formatarAlteracoes(registro.alteracoes).map((alteracao, idx) => (
                                  <div
                                    key={idx}
                                    className="text-sm text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 px-3 py-2 rounded-lg"
                                  >
                                    {alteracao}
                                  </div>
                                ))}
                              </div>

                              {/* Observações */}
                              {registro.observacoes && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                    💬 {registro.observacoes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {historico.length > 0 ? `${historico.length} registro(s) encontrado(s)` : 'Sem registros'}
                </p>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold hover:from-purple-600 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/30"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
