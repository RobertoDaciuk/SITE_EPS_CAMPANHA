// Tipos e utilitários compartilhados para o Wizard de Criação de Campanhas (Admin)

// Enums do domínio de campanhas
export enum TipoUnidade {
  PAR = 'PAR',
  UNIDADE = 'UNIDADE',
}

export enum CampoVerificacao {
  NOME_PRODUTO = 'NOME_PRODUTO',
  CODIGO_PRODUTO = 'CODIGO_PRODUTO',
  VALOR_VENDA = 'VALOR_VENDA',
  CATEGORIA_PRODUTO = 'CATEGORIA_PRODUTO',
}

export enum OperadorCondicao {
  CONTEM = 'CONTEM',
  NAO_CONTEM = 'NAO_CONTEM',
  IGUAL_A = 'IGUAL_A',
  NAO_IGUAL_A = 'NAO_IGUAL_A',
  MAIOR_QUE = 'MAIOR_QUE',
  MENOR_QUE = 'MENOR_QUE',
}

// Labels auxiliares (usados no Preview)
export const TIPO_UNIDADE_LABELS: Record<TipoUnidade, string> = {
  [TipoUnidade.PAR]: 'Par',
  [TipoUnidade.UNIDADE]: 'Unidade',
};

export const CAMPO_VERIFICACAO_LABELS: Record<CampoVerificacao, string> = {
  [CampoVerificacao.NOME_PRODUTO]: 'Nome do Produto',
  [CampoVerificacao.CODIGO_PRODUTO]: 'Código do Produto',
  [CampoVerificacao.VALOR_VENDA]: 'Valor de Venda (R$)',
  [CampoVerificacao.CATEGORIA_PRODUTO]: 'Categoria do Produto',
};

export const OPERADOR_CONDICAO_LABELS: Record<OperadorCondicao, string> = {
  [OperadorCondicao.CONTEM]: 'Contém',
  [OperadorCondicao.NAO_CONTEM]: 'Não Contém',
  [OperadorCondicao.IGUAL_A]: 'Igual a',
  [OperadorCondicao.NAO_IGUAL_A]: 'Diferente de',
  [OperadorCondicao.MAIOR_QUE]: 'Maior que',
  [OperadorCondicao.MENOR_QUE]: 'Menor que',
};

// Form types do Wizard
export interface CondicaoFormData {
  campo: CampoVerificacao;
  operador: OperadorCondicao;
  valor: string;
}

export interface RequisitoFormData {
  descricao: string;
  quantidade: number;
  tipoUnidade: TipoUnidade;
  ordem: number;
  condicoes: CondicaoFormData[];
}

export interface CartelaFormData {
  numeroCartela: number;
  descricao: string;
  requisitos: RequisitoFormData[];
}

export interface EventoEspecialFormData {
  nome: string;
  descricao: string;
  multiplicador: number;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
  corDestaque: string;
}

export interface CampanhaFormData {
  // Step 1 - Dados base
  titulo: string;
  descricao: string;
  dataInicio: string; // ISO ou yyyy-MM-dd (normalizado no backend)
  dataFim: string; // ISO ou yyyy-MM-dd (normalizado no backend)
  pontosReaisPorCartela: number;
  percentualGerente: number; // 0..1

  // Step 2 - Targeting
  paraTodasOticas: boolean;
  oticasAlvoIds: string[];

  // Step 3/4 - Cartelas e requisitos
  cartelas: CartelaFormData[];
  
  // Step 5 - Eventos Especiais (multiplicadores)
  eventosEspeciais: EventoEspecialFormData[];

  // Tags da campanha (opcional)
  tags?: string[];
}

// Factories de objetos vazios
export function createEmptyCondicao(): CondicaoFormData {
  return {
    campo: CampoVerificacao.NOME_PRODUTO,
    operador: OperadorCondicao.CONTEM,
    valor: '',
  };
}

export function createEmptyRequisito(): RequisitoFormData {
  return {
    descricao: '',
    quantidade: 1,
    tipoUnidade: TipoUnidade.UNIDADE,
    ordem: 1,
    condicoes: [createEmptyCondicao()],
  };
}

export function createEmptyCartela(): CartelaFormData {
  return {
    numeroCartela: 1,
    descricao: '',
    requisitos: [createEmptyRequisito()],
  };
}

export function createEmptyCampanha(): CampanhaFormData {
  return {
    titulo: '',
    descricao: '',
    dataInicio: '',
    dataFim: '',
    pontosReaisPorCartela: 0,
    percentualGerente: 0.1,
    paraTodasOticas: true,
    oticasAlvoIds: [],
    cartelas: [createEmptyCartela()],
    eventosEspeciais: [],
  };
}

// Transformação do form em payload para API
export function transformCampanhaToPayload(form: CampanhaFormData) {
  return {
    titulo: form.titulo,
    descricao: form.descricao,
    dataInicio: form.dataInicio,
    dataFim: form.dataFim,
    pontosReaisPorCartela: form.pontosReaisPorCartela,
    percentualGerente: form.percentualGerente,
    paraTodasOticas: form.paraTodasOticas,
    oticasAlvoIds: form.oticasAlvoIds,
    tags: form.tags,
    cartelas: form.cartelas.map((c) => ({
      numeroCartela: c.numeroCartela,
      descricao: c.descricao,
      requisitos: c.requisitos.map((r) => ({
        descricao: r.descricao,
        quantidade: r.quantidade,
        tipoUnidade: r.tipoUnidade,
        ordem: r.ordem,
        condicoes: r.condicoes.map((cond) => ({
          campo: cond.campo,
          operador: cond.operador,
          valor: cond.valor,
        })),
      })),
    })),
    eventosEspeciais: form.eventosEspeciais.map((e) => ({
      nome: e.nome,
      descricao: e.descricao,
      multiplicador: e.multiplicador,
      dataInicio: e.dataInicio,
      dataFim: e.dataFim,
      ativo: e.ativo,
      corDestaque: e.corDestaque,
    })),
  };
}
