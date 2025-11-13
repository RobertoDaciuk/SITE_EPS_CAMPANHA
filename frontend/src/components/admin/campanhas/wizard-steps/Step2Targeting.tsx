'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Globe, Building2 } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import type { WizardState } from '../CriarCampanhaWizard';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

interface Optica {
  id: string;
  nome: string;
  ativa: boolean;
  ehMatriz: boolean;
  matrizId?: string | null;
}

export default function Step2Targeting({ state, setState }: Props) {
  const [oticas, setOticas] = useState<Optica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filiaisPorMatriz, setFiliaisPorMatriz] = useState<Record<string, Optica[]>>({});

  useEffect(() => {
    const fetchOticas = async () => {
      try {
        const response = await api.get('/oticas');
        const todasAtivas: Optica[] = response.data.filter((o: Optica) => o.ativa);

        const matrizes = todasAtivas.filter((o) => o.ehMatriz);
        const mapaFiliais = todasAtivas.reduce((acc, otica) => {
          if (otica.matrizId) {
            if (!acc[otica.matrizId]) {
              acc[otica.matrizId] = [];
            }
            acc[otica.matrizId].push(otica);
          }
          return acc;
        }, {} as Record<string, Optica[]>);

        setOticas(matrizes);
        setFiliaisPorMatriz(mapaFiliais);

        setState((prev) => {
          if (
            prev.paraTodasOticas ||
            prev.oticasAlvoIds.length === 0 ||
            prev.matrizesSelecionadasIds.length > 0
          ) {
            return prev;
          }

          const matrizesSelecionadas = matrizes
            .filter((matriz) => prev.oticasAlvoIds.includes(matriz.id))
            .map((matriz) => matriz.id);

          return matrizesSelecionadas.length > 0
            ? { ...prev, matrizesSelecionadasIds: matrizesSelecionadas }
            : prev;
        });
      } catch (error) {
        toast.error('Erro ao carregar óticas');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOticas();
  }, [setState]);

  const handleToggleOtica = (oticaId: string) => {
    setState((prev) => {
      const filiais = filiaisPorMatriz[oticaId] ?? [];
      const idsAssociados = [oticaId, ...filiais.map((filial) => filial.id)];
      const jaSelecionada = prev.matrizesSelecionadasIds.includes(oticaId);

      if (jaSelecionada) {
        return {
          ...prev,
          matrizesSelecionadasIds: prev.matrizesSelecionadasIds.filter((id) => id !== oticaId),
          oticasAlvoIds: prev.oticasAlvoIds.filter((id) => !idsAssociados.includes(id)),
        };
      }

      const idsAtualizados = Array.from(new Set([...prev.oticasAlvoIds, ...idsAssociados]));

      return {
        ...prev,
        matrizesSelecionadasIds: [...prev.matrizesSelecionadasIds, oticaId],
        oticasAlvoIds: idsAtualizados,
      };
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Óticas Vinculadas</h3>
          <p className="text-sm text-muted-foreground">Defina quais óticas poderão participar desta campanha</p>
        </div>
      </div>

      {/* Opção: Para todas as óticas */}
      <div className="space-y-4">
        <label className="flex items-center gap-4 p-4 border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
          <input
            type="radio"
            checked={state.paraTodasOticas}
            onChange={() => setState({ ...state, paraTodasOticas: true, oticasAlvoIds: [], matrizesSelecionadasIds: [] })}
            className="w-5 h-5 text-primary"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Globe className="h-5 w-5 text-primary" />
              Para Todas as Óticas
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              A campanha estará disponível para todas as óticas cadastradas no sistema
            </p>
          </div>
        </label>

        <label className="flex items-center gap-4 p-4 border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
          <input
            type="radio"
            checked={!state.paraTodasOticas}
            onChange={() => setState({ ...state, paraTodasOticas: false })}
            className="w-5 h-5 text-primary"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Building2 className="h-5 w-5 text-primary" />
              Óticas Específicas
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione manualmente as óticas que poderão participar desta campanha
            </p>
          </div>
        </label>
      </div>

      {/* Lista de Óticas (se targeting específico) */}
      {!state.paraTodasOticas && (
        <div className="mt-6">
          <h4 className="font-medium text-foreground">Selecione as Matrizes:</h4>
          <p className="text-xs text-muted-foreground mb-3">
            As filiais vinculadas à matriz escolhida participarão automaticamente da campanha.
          </p>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando óticas...</div>
          ) : oticas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma ótica ativa encontrada</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {oticas.map((optica) => {
                const isSelected = state.matrizesSelecionadasIds.includes(optica.id);
                const filiais = filiaisPorMatriz[optica.id] ?? [];

                return (
                  <label
                    key={optica.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleOtica(optica.id)}
                      className="w-5 h-5 text-primary rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-foreground flex flex-col">
                        <span>{optica.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {filiais.length > 0
                            ? `${filiais.length} filial(is) incluída(s) automaticamente`
                            : 'Sem filiais vinculadas'}
                        </span>
                      </div>
                      {optica.ehMatriz && (
                        <span className="text-xs text-primary font-medium">MATRIZ</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {!state.paraTodasOticas && state.matrizesSelecionadasIds.length > 0 && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary font-medium">
                {state.matrizesSelecionadasIds.length} matriz(es) selecionada(s) • {state.oticasAlvoIds.length} ótica(s) no total
                {state.oticasAlvoIds.length - state.matrizesSelecionadasIds.length > 0 && (
                  <> ({state.oticasAlvoIds.length - state.matrizesSelecionadasIds.length} filiais)</>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
