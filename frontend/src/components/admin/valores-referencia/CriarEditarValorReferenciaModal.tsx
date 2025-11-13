/**
 * ============================================================================
 * COMPONENTE: CriarEditarValorReferenciaModal
 * ============================================================================
 *
 * Modal para criação ou edição de valores de referência.
 *
 * Features:
 * - Modo criação (referencia = null) ou edição (referencia definida)
 * - Formulário com validação
 * - Campo código de referência (apenas criação)
 * - Campo valor em pontos (R$)
 * - Toggle ativo/inativo
 * - Exibe histórico de alterações (apenas edição)
 * - Loading states
 * - Responsivo
 *
 * @module CriarEditarValorReferenciaModal
 * ============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, DollarSign, History, AlertCircle } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
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

interface CriarEditarValorReferenciaModalProps {
  referencia: ValorReferencia | null;
  onClose: (sucesso?: boolean) => void;
}

export default function CriarEditarValorReferenciaModal({
  referencia,
  onClose,
}: CriarEditarValorReferenciaModalProps) {
  const isEdicao = !!referencia;

  // ==========================================================================
  // ESTADOS
  // ==========================================================================

  const [codigoReferencia, setCodigoReferencia] = useState(referencia?.codigoReferencia || '');
  const [pontosReais, setPontosReais] = useState(
    referencia?.pontosReais?.toString() || ''
  );
  const [ativo, setAtivo] = useState(referencia?.ativo ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);

  // ==========================================================================
  // VALIDAÇÃO
  // ==========================================================================

  const isValid =
    codigoReferencia.trim() !== '' &&
    pontosReais.trim() !== '' &&
    !isNaN(parseFloat(pontosReais)) &&
    parseFloat(pontosReais) >= 0;

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        codigoReferencia: codigoReferencia.trim(),
        pontosReais: parseFloat(pontosReais),
        ativo,
      };

      if (isEdicao) {
        await api.patch(`/valores-referencia/${referencia.id}`, {
          pontosReais: payload.pontosReais,
          ativo: payload.ativo,
        });
        toast.success('Valor atualizado com sucesso!');
      } else {
        await api.post('/valores-referencia', payload);
        toast.success('Código criado com sucesso!');
      }

      onClose(true);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(
        error.response?.data?.mensagem ||
          `Erro ao ${isEdicao ? 'atualizar' : 'criar'} valor de referência`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* =================================================================== */}
        {/* HEADER */}
        {/* =================================================================== */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isEdicao ? 'Editar Valor de Referência' : 'Novo Código de Referência'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isEdicao
                  ? 'Atualize o valor em pontos (R$) deste código'
                  : 'Crie um novo código e defina seu valor'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onClose(false)}
            className="btn-ghost p-2 rounded-lg"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =================================================================== */}
        {/* FORMULÁRIO */}
        {/* =================================================================== */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Código de Referência */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Código de Referência <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={codigoReferencia}
              onChange={(e) => setCodigoReferencia(e.target.value.toUpperCase())}
              placeholder="Ex: REF001, PROD-ABC"
              className="input w-full"
              disabled={isEdicao || isSubmitting}
              required
            />
            {isEdicao && (
              <p className="text-xs text-muted-foreground mt-1">
                O código não pode ser alterado após a criação
              </p>
            )}
          </div>

          {/* Valor em Pontos (R$) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Valor em Pontos (R$) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pontosReais}
                onChange={(e) => setPontosReais(e.target.value)}
                placeholder="0.00"
                className="input w-full pl-10"
                disabled={isSubmitting}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Este valor será pago ao vendedor quando este código for validado
            </p>
          </div>

          {/* Status Ativo */}
          <div className="flex items-center justify-between p-4 glass rounded-xl">
            <div>
              <p className="font-medium">Status do Código</p>
              <p className="text-sm text-muted-foreground">
                Códigos inativos não podem ser usados em novas validações
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="sr-only peer"
                disabled={isSubmitting}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Histórico de Alterações (apenas edição) */}
          {isEdicao && referencia.historicoAlteracoes && referencia.historicoAlteracoes.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowHistorico(!showHistorico)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <History className="w-4 h-4" />
                {showHistorico ? 'Ocultar' : 'Ver'} Histórico de Alterações (
                {referencia.historicoAlteracoes.length})
              </button>

              {showHistorico && (
                <div className="glass rounded-xl p-4 space-y-3 max-h-60 overflow-y-auto">
                  {referencia.historicoAlteracoes.map((alteracao, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div className="flex-1 text-sm">
                        <p className="font-medium">
                          {(() => {
                            const anterior = (alteracao as any).valorAnterior ?? (alteracao as any).valor ?? null;
                            const novo = (alteracao as any).valorNovo ?? (alteracao as any).valor ?? null;
                            const anteriorNum = anterior !== null ? Number(anterior) : null;
                            const novoNum = novo !== null ? Number(novo) : null;
                            const anteriorFmt = anteriorNum !== null && Number.isFinite(anteriorNum) ? `R$ ${anteriorNum.toFixed(2)}` : '—';
                            const novoFmt = novoNum !== null && Number.isFinite(novoNum) ? `R$ ${novoNum.toFixed(2)}` : '—';
                            return (
                              <>
                                {anteriorFmt} → {novoFmt}
                              </>
                            );
                          })()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date((alteracao as any).dataAlteracao ?? (alteracao as any).data), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                          {((alteracao as any).usuario || (alteracao as any).alteradoPor) && ` • ${((alteracao as any).usuario || (alteracao as any).alteradoPor)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alerta de Impacto */}
          {isEdicao && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500">Atenção</p>
                <p className="text-muted-foreground mt-1">
                  A alteração do valor afetará apenas vendas futuras. Vendas já validadas
                  manterão o valor original.
                </p>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* BOTÕES */}
          {/* =================================================================== */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>{isEdicao ? 'Atualizar' : 'Criar'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
