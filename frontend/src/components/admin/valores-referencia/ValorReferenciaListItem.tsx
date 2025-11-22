/**
 * ============================================================================
 * COMPONENTE: ValorReferenciaListItem
 * ============================================================================
 *
 * Item de lista para exibir um valor de referência com ações (editar, ativar/desativar).
 *
 * Features:
 * - Exibe código, valor em R$, status
 * - Botão de editar
 * - Toggle ativo/inativo
 * - Badge de status
 * - Exibe data de última atualização
 * - Exibe quantidade de alterações no histórico
 * - Responsivo
 *
 * @module ValorReferenciaListItem
 * ============================================================================
 */

import { useState } from 'react';
import { Edit, Power, History, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import ButtonWithLoading from '@/components/ui/ButtonWithLoading';

interface HistoricoAlteracao {
  data: string;
  valorAnterior: number;
  valorNovo: number;
  usuario?: string;
}

interface ValorReferencia {
  id: string;
  codigoReferencia: string;
  pontosReais: number;
  ativo: boolean;
  historicoAlteracoes?: HistoricoAlteracao[];
  criadoEm: string;
  atualizadoEm: string;
}

interface ValorReferenciaListItemProps {
  referencia: ValorReferencia;
  onEditar: (ref: ValorReferencia) => void;
  onToggleAtivo: (id: string, ativoAtual: boolean) => void;
}

export default function ValorReferenciaListItem({
  referencia,
  onEditar,
  onToggleAtivo,
}: ValorReferenciaListItemProps) {
  const historicoCount = referencia.historicoAlteracoes?.length || 0;
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggleAtivo(referencia.id, referencia.ativo);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="glass rounded-xl p-4 hover:border-primary/30 transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* =================================================================== */}
        {/* INFORMAÇÕES PRINCIPAIS */}
        {/* =================================================================== */}
        <div className="flex-1 space-y-2">
          {/* Código e Badge de Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-semibold">{referencia.codigoReferencia}</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                referencia.ativo
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}
            >
              {referencia.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          {/* Valor em R$ */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-2xl font-bold text-primary cursor-default"
          >
            <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
              <DollarSign className="w-6 h-6" />
            </motion.div>
            {(() => {
              const valor = Number((referencia as any).pontosReais);
              const display = Number.isFinite(valor) ? valor.toFixed(2) : '0.00';
              return <>R$ {display}</>;
            })()}
          </motion.div>

          {/* Metadados */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              Atualizado em{' '}
              {format(new Date(referencia.atualizadoEm), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </span>
            {historicoCount > 0 && (
              <motion.span
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1 cursor-default"
              >
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                  <History className="w-3 h-3" />
                </motion.div>
                {historicoCount} {historicoCount === 1 ? 'alteração' : 'alterações'}
              </motion.span>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* AÇÕES */}
        {/* =================================================================== */}
        <div className="flex items-center gap-2">
          {/* Botão Editar */}
          <ButtonWithLoading
            icon={Edit}
            onClick={() => onEditar(referencia)}
            variant="ghost"
            size="sm"
            className="btn-secondary"
            title="Editar valor"
          >
            <span className="hidden sm:inline">Editar</span>
          </ButtonWithLoading>

          {/* Botão Ativar/Desativar */}
          <ButtonWithLoading
            icon={Power}
            onClick={handleToggle}
            isLoading={isToggling}
            variant={referencia.ativo ? 'danger' : 'success'}
            size="sm"
            className={`btn-secondary ${
              referencia.ativo ? 'hover:bg-red-500/10' : 'hover:bg-green-500/10'
            }`}
            title={referencia.ativo ? 'Desativar' : 'Ativar'}
          >
            <span className="hidden sm:inline">{referencia.ativo ? 'Desativar' : 'Ativar'}</span>
          </ButtonWithLoading>
        </div>
      </div>
    </motion.div>
  );
}
