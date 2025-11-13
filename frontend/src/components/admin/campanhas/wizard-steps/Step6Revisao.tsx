'use client';

import { motion } from 'framer-motion';
import { Check, Target, Layers, Zap, FileText, Tag, Calendar, Gift } from 'lucide-react';
import type { WizardState } from '../CriarCampanhaWizard';
import { formatarDataBR } from '@/lib/timezone';

interface Props {
  state: WizardState;
}

export default function Step6Revisao({ state }: Props) {
  // Datas em UTC serão formatadas em SP pelo utilitário
  const dataInicio = state.dataInicio ? new Date(state.dataInicio) : null;
  const dataFim = state.dataFim ? new Date(state.dataFim) : null;
  const diasCampanha = dataInicio && dataFim ? Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const tipoPedidoLabelMap: Record<string, string> = {
    OS_OP_EPS: 'OS/OP/EPS',
    OPTICLICK: 'OPTICLICK',
    EPSWEB: 'EPSWEB',
    ENVELOPE_OTICA: 'ENVELOPE ÓTICA',
  };
  const tipoPedidoLabel = state.tipoPedido ? (tipoPedidoLabelMap[state.tipoPedido] || state.tipoPedido) : '';
  const totalFiliaisSelecionadas = Math.max(state.oticasAlvoIds.length - state.matrizesSelecionadasIds.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-500 rounded-lg">
          <Check className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Revisão Final</h3>
          <p className="text-sm text-muted-foreground">Confirme todos os dados antes de criar a campanha</p>
        </div>
      </div>

      {/* Resumo da Campanha */}
      <div className="space-y-4">
        {/* Dados Básicos */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Dados Básicos
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Título:</p>
              <p className="font-medium text-foreground">{state.titulo || '---'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Período:</p>
              <p className="font-medium text-foreground">
                {formatarDataBR(state.dataInicio)} até {formatarDataBR(state.dataFim)}
              </p>
              <p className="text-xs text-muted-foreground">{diasCampanha} dias</p>
            </div>
            {state.tipoPedido && (
              <div>
                <p className="text-muted-foreground">Tipo de Pedido:</p>
                <p className="font-medium text-foreground">{tipoPedidoLabel}</p>
              </div>
            )}
            
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <span aria-hidden><Gift className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></span> Pontos Máximos por Cartela:
              </p>
              <p className="font-bold text-foreground text-lg">{Math.floor(state.pontosReaisMaximo)} pts</p>
            </div>
            <div>
              <p className="text-muted-foreground">Comissão Gerente:</p>
              <p className="font-medium text-foreground">{state.percentualGerente.toFixed(0)}%</p>
            </div>
            {state.tags.length > 0 && (
              <div>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Tag className="h-4 w-4" /> Tags:
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {state.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {state.descricao && (
            <div>
              <p className="text-muted-foreground mb-1">Descrição:</p>
              <p className="text-sm text-foreground bg-accent/50 p-3 rounded-lg">{state.descricao}</p>
            </div>
          )}
        </div>

        {/* Imagens */}
        {(state.imagemCampanha16x9Url || state.imagemCampanha16x9Preview || state.imagemCampanha1x1Url || state.imagemCampanha1x1Preview) && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Imagens da Campanha
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(state.imagemCampanha16x9Preview || state.imagemCampanha16x9Url) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Imagem 16:9 (Horizontal)</p>
                  <img 
                    src={state.imagemCampanha16x9Preview || state.imagemCampanha16x9Url} 
                    alt="Preview 16:9" 
                    className="w-full aspect-video object-cover rounded-lg border border-border shadow-sm" 
                  />
                </div>
              )}
              {(state.imagemCampanha1x1Preview || state.imagemCampanha1x1Url) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Imagem 1:1 (Quadrada)</p>
                  <img 
                    src={state.imagemCampanha1x1Preview || state.imagemCampanha1x1Url} 
                    alt="Preview 1:1" 
                    className="w-32 aspect-square object-cover rounded-lg border border-border shadow-sm" 
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Produtos da Campanha */}
        {state.produtosCampanha.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <span aria-hidden className="text-primary">🎯</span>
              Produtos da Campanha
            </h4>
            <p className="text-sm text-muted-foreground">
              <strong>{state.produtosCampanha.length}</strong> produto(s) cadastrado(s) com valores
            </p>
            {state.produtosCampanha.length <= 10 ? (
              <div className="space-y-2">
                {state.produtosCampanha.map((produto, index) => (
                  <div key={index} className="flex justify-between items-center bg-accent/50 rounded-lg p-2 text-xs">
                    <span className="font-mono text-foreground">{produto.codigoRef}</span>
                    <span className="font-semibold text-primary">{Math.floor(produto.pontosReais)} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-accent/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  Primeiros 5 produtos:
                </p>
                <div className="space-y-1 mt-2">
                  {state.produtosCampanha.slice(0, 5).map((produto, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="font-mono text-foreground">{produto.codigoRef}</span>
                      <span className="font-semibold text-primary">{Math.floor(produto.pontosReais)} pts</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ... e mais {state.produtosCampanha.length - 5} produto(s)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Targeting */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Óticas Vinculadas
          </h4>
          {state.paraTodasOticas ? (
            <p className="text-sm text-muted-foreground">Campanha disponível para <strong>todas as óticas</strong></p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Campanha direcionada para <strong>{state.matrizesSelecionadasIds.length} matriz(es)</strong>
              {state.matrizesSelecionadasIds.length > 0 && (
                <>
                  {' '}({state.oticasAlvoIds.length} óticas no total
                  {totalFiliaisSelecionadas > 0 && `, incluindo ${totalFiliaisSelecionadas} filiais`})
                </>
              )}
            </p>
          )}
        </div>

        {/* Cartelas */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Cartelas e Requisitos
          </h4>
          <div className="space-y-2">
            {state.cartelas.map((cartela, index) => (
              <div key={index} className="bg-accent/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
                    {cartela.numeroCartela}
                  </span>
                  <span className="font-medium text-foreground">{cartela.descricao}</span>
                </div>
                <p className="text-xs text-muted-foreground ml-8">
                  {cartela.requisitos.length} requisito(s) configurado(s)
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-primary font-medium">
            Total: {state.cartelas.length} cartela(s)
          </p>
        </div>

        {/* Eventos Especiais */}
        {state.eventosEspeciais.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Eventos Especiais
            </h4>
            <div className="space-y-2">
              {state.eventosEspeciais.map((evento, index) => (
                <div
                  key={index}
                  className="rounded-lg p-3 text-white flex items-center justify-between"
                  style={{ backgroundColor: evento.corDestaque }}
                >
                  <div>
                    <p className="font-bold">{evento.nome}</p>
                    <p className="text-xs opacity-90">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {formatarDataBR(evento.dataInicio)} até {formatarDataBR(evento.dataFim)}
                    </p>
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-full font-bold">
                    {evento.multiplicador}X
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-yellow-500 font-medium">
              {state.eventosEspeciais.length} evento(s) configurado(s)
            </p>
          </div>
        )}

        {/* Regras da Campanha */}
        {state.regras && state.regras !== '<p><br></p>' && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              Regras da Campanha
            </h4>
            <div className="bg-accent/30 rounded-lg p-4">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: state.regras }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Alerta Final */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-green-500 mb-1">Tudo pronto!</p>
          <p className="text-muted-foreground">
            Clique em <strong>"Criar Campanha"</strong> para finalizar. A campanha ficará disponível imediatamente
            para os vendedores das óticas selecionadas.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
