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

import { Edit, Power, History, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  return (
    <div className="glass rounded-xl p-4 hover:border-primary/30 transition-all">
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
          <div className="flex items-center gap-2 text-2xl font-bold text-primary">
            <DollarSign className="w-6 h-6" />
            {(() => {
              const valor = Number((referencia as any).pontosReais);
              const display = Number.isFinite(valor) ? valor.toFixed(2) : '0.00';
              return <>R$ {display}</>;
            })()}
          </div>

          {/* Metadados */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              Atualizado em{' '}
              {format(new Date(referencia.atualizadoEm), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </span>
            {historicoCount > 0 && (
              <span className="flex items-center gap-1">
                <History className="w-3 h-3" />
                {historicoCount} {historicoCount === 1 ? 'alteração' : 'alterações'}
              </span>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* AÇÕES */}
        {/* =================================================================== */}
        <div className="flex items-center gap-2">
          {/* Botão Editar */}
          <button
            onClick={() => onEditar(referencia)}
            className="btn-secondary flex items-center gap-2"
            title="Editar valor"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Editar</span>
          </button>

          {/* Botão Ativar/Desativar */}
          <button
            onClick={() => onToggleAtivo(referencia.id, referencia.ativo)}
            className={`btn-secondary flex items-center gap-2 ${
              referencia.ativo ? 'hover:bg-red-500/10' : 'hover:bg-green-500/10'
            }`}
            title={referencia.ativo ? 'Desativar' : 'Ativar'}
          >
            <Power
              className={`w-4 h-4 ${referencia.ativo ? 'text-red-500' : 'text-green-500'}`}
            />
            <span className="hidden sm:inline">{referencia.ativo ? 'Desativar' : 'Ativar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
