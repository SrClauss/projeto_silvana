export type TypoEntrada = "compra" | "devolucao" | "condicional_fornecedor";

export type TypoSaida = "venda" | "perca" | "doacao" | "devolucao" | "condicional_fornecedor";

export interface Tag {
  _id: string;
  descricao: string;
  descricao_case_insensitive: string;
  created_at: string;
  updated_at?: string;
}

export interface Item {
  quantity: number;
  acquisition_date: string;
  condicional_fornecedor_id?: string;
  condicional_cliente_id?: string;
}

export interface Entrada {
  _id: string;
  produtos_id: string;
  quantidade: number;
  cliente_id?: string;
  fornecedor_id?: string;
  tipo: TypoEntrada;
  data_entrada: string;
  observacoes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Saida {
  _id: string;
  produtos_id: string;
  cliente_id?: string;
  fornecedor_id?: string;
  quantidade: number;
  tipo: TypoSaida;
  data_saida: string;
  valor_total?: number;
  observacoes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Produto {
  _id: string;
  codigo_interno: string;
  codigo_externo: string;
  descricao: string;
  marca_fornecedor: string;
  sessao: string;
  em_condicional: number;
  itens: Item[];
  preco_custo: number;
  preco_venda: number;
  saidas: Saida[];
  entradas: Entrada[];
  tags: Tag[];
  created_at: string;
  updated_at?: string;
}

export interface MarcaFornecedor {
  _id: string;
  nome: string;
  fornecedor: string;
  cnpj?: string;
  created_at: string;
  updated_at?: string;
}

export interface Sessao {
  _id: string;
  nome: string;
  localizacao?: string;
  created_at: string;
  updated_at?: string;
}

export interface Endereco {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  numero: string;
  complemento?: string;
}

export interface Cliente {
  _id: string;
  nome: string;
  telefone: string;
  endereco: Endereco;
  cpf: string;
  created_at: string;
  updated_at?: string;
}

export interface CondicionalProduto {
  produto_id: string;
  quantidade: number;
  produto?: Produto;
}

export interface CondicionalCliente {
  _id: string;
  cliente_id: string;
  produtos: CondicionalProduto[];
  data_condicional: string;
  data_devolucao?: string;
  ativa: boolean;
  observacoes?: string;
  created_at: string;
  updated_at?: string;
  cliente?: Cliente;
}

export interface CalcProduct {
  produto_id: string;
  codigo_interno: string;
  quantidade_enviada: number;
  quantidade_devolvida: number;
  quantidade_vendida: number;
}

export interface CalcResult {
  condicional_id: string;
  produtos: CalcProduct[];
}

export interface SaleItem {
  produto_id: string;
  quantidade: number;
  valor_total?: number;
  observacoes?: string;
}

export interface SaleDraft {
  id: string;
  name: string;
  cliente_id?: string;
  items?: SaleItem[];
}